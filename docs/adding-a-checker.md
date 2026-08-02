# Adding a Checker

## Overview

A Checker is a small Python object that evaluates one focused condition and returns one or more results through the shared contract. Adding one safely requires work in four connected areas:

1. Implement the Checker under `infra/lambda/checker/checkers/`.
2. Construct and register it explicitly in `registry.py`.
3. Create its AWS SDK client in `index.py` and inject that client through the registry.
4. Add only its required runtime IAM permissions and cover the behavior with Python and CDK assertion tests.

Complete local tests, TypeScript compilation, credential-isolated synthesis for both environments, diff review, authorized development runtime validation, and a sanitized public validation record before treating a Checker as complete.

## Shared contract

The shared types live in `infra/lambda/checker/models.py`. `Checker` is a Python `Protocol`, so an implementation does not need to inherit from a base class. It must provide this shape:

```python
class Checker(Protocol):
    checker_id: str
    name: str
    severity: CheckSeverity

    def run(self, checked_at: str) -> list[CheckResult]:
        ...
```

`CheckResult` is a `TypedDict`. The required fields are:

| Field | Type | Meaning |
|---|---|---|
| `checkId` | `str` | Stable machine-readable identifier |
| `checkName` | `str` | Human-readable name |
| `status` | `PASS`, `FAIL`, or `ERROR` | Evaluation outcome |
| `severity` | `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL` | Finding severity |
| `message` | `str` | Sanitized explanation |
| `resourceId` | `str` | Sanitized logical target identifier |
| `checkedAt` | `str` | Run timestamp supplied to `run` |

The optional `details` field must be a `dict[str, object]`. Keep it small, bounded, predictable, and sanitized. It is not a place for a complete SDK response.

Use the statuses consistently:

- `PASS`: the condition was evaluated and meets the Checker's documented expectation.
- `FAIL`: the condition was evaluated and represents a missing or unsafe configuration.
- `ERROR`: the Checker could not reliably evaluate the condition.

A Checker returns `list[CheckResult]` so one registered Checker can report more than one bounded finding, for example one result per evaluated resource. The runner flattens these lists into one run. The list must not be empty. The current S3 Checker returns a list containing one account-level result.

The runner replaces each result's `checkedAt` with the shared run timestamp. A Checker should still populate the required field with the `checked_at` argument so its direct behavior satisfies the contract and remains testable.

## File placement

Place the implementation at:

```text
infra/lambda/checker/checkers/<checker_name>.py
```

Use a lowercase snake-case filename and a stable kebab-case `checker_id`. Keep service-specific response parsing and decision rules inside the Checker rather than adding them to the shared models or runner.

## Checker implementation

This small example demonstrates client injection, all three statuses, required fields, and bounded details without depending on a particular AWS service. Replace the illustrative client method with the SDK call needed by your Checker.

```python
from __future__ import annotations

from collections.abc import Mapping
from typing import Protocol

from models import CheckResult, CheckSeverity, CheckStatus


class ExampleConfigurationClient(Protocol):
    def get_configuration(self) -> Mapping[str, object]:
        ...


class ExampleConfigurationChecker:
    checker_id = "example-configuration"
    name = "Example Configuration"
    severity: CheckSeverity = "MEDIUM"

    def __init__(self, *, client: ExampleConfigurationClient) -> None:
        self._client = client

    def _result(
        self,
        *,
        status: CheckStatus,
        message: str,
        checked_at: str,
        details: dict[str, object] | None = None,
    ) -> CheckResult:
        result: CheckResult = {
            "checkId": self.checker_id,
            "checkName": self.name,
            "status": status,
            "severity": self.severity,
            "message": message,
            "resourceId": "account",
            "checkedAt": checked_at,
        }

        if details is not None:
            result["details"] = details

        return result

    def run(self, checked_at: str) -> list[CheckResult]:
        response = self._client.get_configuration()

        if not isinstance(response, Mapping):
            return [
                self._result(
                    status="ERROR",
                    message="The example configuration response was invalid.",
                    checked_at=checked_at,
                )
            ]

        enabled = response.get("Enabled")

        if type(enabled) is not bool:
            return [
                self._result(
                    status="ERROR",
                    message="The example configuration response was invalid.",
                    checked_at=checked_at,
                )
            ]

        status: CheckStatus = "PASS" if enabled else "FAIL"
        message = (
            "The example configuration is enabled."
            if enabled
            else "The example configuration is disabled."
        )

        return [
            self._result(
                status=status,
                message=message,
                checked_at=checked_at,
                details={"enabled": enabled},
            )
        ]
```

Do not put account IDs or resource ARNs in `resourceId`. Do not put exception text, credentials, request identifiers, or raw SDK responses in results or custom application logs. Extract only the fields required for the decision and use a generic error message when evaluation fails.

Unexpected exceptions should propagate to the runner, which isolates the failing Checker as a sanitized `ERROR` result and continues with later Checkers. Catch an exception inside a Checker only when it is a specific SDK outcome whose meaning can be determined safely. A documented not-configured outcome can become `FAIL` when it proves the expected protection is absent. A known SDK failure that prevents evaluation should become a generic `ERROR`. Do not use a catch-all handler that also hides programming defects.

## Registry registration

`infra/lambda/checker/registry.py` is an explicit factory. It imports each enabled Checker, accepts its dependencies as keyword-only parameters, constructs the Checkers, and returns them in execution order.

To register a new Checker:

1. Import its class and client `Protocol`.
2. Add the client to `create_registry` as a typed keyword-only parameter.
3. Construct the Checker in the returned list at the intended execution position.

A simplified shape is:

```python
from checkers.example_configuration import (
    ExampleConfigurationChecker,
    ExampleConfigurationClient,
)


def create_registry(
    *,
    # Existing injected clients remain here.
    example_client: ExampleConfigurationClient,
) -> list[Checker]:
    return [
        # Existing registered Checkers remain here.
        ExampleConfigurationChecker(client=example_client),
    ]
```

The project does not use dynamic imports, decorators, entry points, or filesystem auto-discovery. Registration is deliberately visible in source review.

## AWS client injection

`infra/lambda/checker/index.py` creates the current DynamoDB resource, ResultsTable object, and S3 Control client at module scope. It passes the S3 Control client through `create_registry` into the S3 Checker. Follow the same direction for a new AWS client:

```python
example_client = boto3.client("<service-name>")
checkers = create_registry(
    # Existing dependencies remain here.
    example_client=example_client,
)
```

Objects created at module scope are initialized when a Lambda execution environment loads the module. Lambda can reuse that initialized module for later invocations in the same warm execution environment, so the client and registry can be reused instead of being rebuilt by every handler call. Do not rely on warm reuse for correctness: a cold start must still create everything from the documented environment and code.

Keep account, region, environment, or resource values portable. Obtain them from CDK tokens, stack configuration, or documented Lambda environment variables; do not hard-code deployment-specific identifiers.

## IAM permissions

If the Checker calls a new AWS API, add a separate `iam.PolicyStatement` for that service in `infra/lib/stacks/app-stack.ts`:

```typescript
checkerFunction.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['service:ReadOperation'],
    resources: [specificResource],
  }),
);
```

Apply these rules:

- Include only the exact actions called by runtime code.
- Scope resources to specific targets when the API supports resource-level permissions.
- Do not use wildcard actions.
- Put permissions for different AWS services in separate statements.
- Do not broaden `dynamodb:PutItem` or its ResultsTable-only resource scope.
- Use `Resource: "*"` only when the exact API does not support resource-level permissions, and document that reason.
- Add a Jest/CDK assertion that selects the Checker Lambda role and verifies exact actions and resources, including relevant forbidden actions.

Keep deployment-time permissions separate from the Lambda runtime policy. Adding a permission only to suppress an access error is not sufficient; map each action back to the SDK operation in the Checker.

## Error handling

The runner executes Checkers sequentially. If a Checker raises an exception, the runner emits one sanitized `ERROR` result for that Checker, logs only the Checker ID and exception type, and continues with later registered Checkers. A Checker contract violation is isolated in the same way.

Prefer handling expected SDK outcomes inside the Checker so you can preserve domain meaning:

- Return `FAIL` when a successful response, or a documented not-configured outcome, proves the expected protection is absent.
- Return `ERROR` when permission denial, throttling, transport failure, malformed data, or another condition prevents a reliable evaluation.

Do not treat every AWS exception as `FAIL`. A finding means the configuration was evaluated; an error means it was not. Never copy the exception message or its raw response into a result or custom application log entry.

## Result validation

Before accepting results, the runner verifies:

- The Checker returned a non-empty `list`.
- Every element is a dictionary.
- All required keys are present.
- `checkId` and `checkName` are non-empty strings.
- `status` is one of `PASS`, `FAIL`, or `ERROR`.
- `severity` is one of `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
- `message`, `resourceId`, and `checkedAt` are strings.
- `details`, when present, is a dictionary.

The runner does not recursively validate or size-limit values inside `details`, so the Checker author must keep them bounded and safe. Invalid output becomes one sanitized `ERROR` result, and the next Checker still runs.

## Tests

Lambda tests use Python's standard-library `unittest` and live under `infra/test/lambda/`. Use fake clients rather than live AWS calls. At minimum, cover:

- `PASS`
- `FAIL`
- Missing configuration
- Malformed or incomplete response data
- AWS API failure
- Sensitive-data sanitization for results and custom application logs
- Registry construction, dependency injection, and execution order
- IAM action and resource assertions

For a single account-level result, also assert that `run` returns a one-element list, uses the supplied `checked_at`, and does not include the injected account value. If the Checker can emit multiple results, test flattening behavior and a bounded maximum or pagination strategy.

Put Checker and registry unit tests in discoverable `test_*.py` files. Put IAM and synthesized-resource assertions in `infra/test/infra.test.ts`, following the existing Jest structure. Tests must prove that unrelated permissions were not added, not merely that the required action appears somewhere.

## Local validation workflow

From `infra`, run:

```bash
npm run test:lambda
npm run test:cdk
npm test
npm run build
```

- `test:lambda` performs Python syntax compilation and unittest discovery.
- `test:cdk` runs the Jest/CDK assertions.
- `npm test` confirms that both suites pass in their configured order.
- `build` uses TypeScript `noEmit` mode to type-check the CDK source without generating JavaScript files.

Then synthesize both logical environments:

```bash
CDK_DEFAULT_ACCOUNT=<ACCOUNT_ID> CDK_DEFAULT_REGION=<REGION> npx cdk synth -c env=dev
CDK_DEFAULT_ACCOUNT=<ACCOUNT_ID> CDK_DEFAULT_REGION=<REGION> npx cdk synth -c env=prod
```

The current CDK application has no environment lookups, and its synthesis has been validated without AWS authentication or API access. For a credential-isolation check, remove active profile and credential variables from the command environment, disable instance metadata credential discovery, supply only non-sensitive CDK account and region context values, and confirm that both synth commands succeed. If a new construct introduces a lookup, stop and document the new requirement rather than silently using a developer profile.

Inspect the synthesized templates for IAM scope, new resources, replacement or deletion behavior, environment differences, and cost. Also inspect the Lambda asset to confirm it contains only intended runtime source and no tests, bytecode, caches, credentials, or local paths.

The result and custom-logging rules above do not imply that every CloudWatch Logs event is free of AWS-generated identifiers. Lambda platform logs can include invocation request IDs, runtime ARNs, and other environment-specific identifiers. Review and redact those values before publishing a platform-log excerpt.

## Security checklist

Before requesting review, confirm:

- [ ] Runtime IAM uses least privilege and exact actions.
- [ ] Resource scope is specific wherever the API supports it.
- [ ] No credentials or tokens are present in source, tests, fixtures, output, or assets.
- [ ] Results and custom application logs contain no account IDs.
- [ ] Results and custom application logs contain no resource ARNs unless an explicitly reviewed use case requires a sanitized identifier.
- [ ] Results and custom application logs contain no raw exception messages.
- [ ] Results and custom application logs contain no raw AWS responses or request identifiers.
- [ ] Any platform-log excerpt selected for publication redacts invocation request IDs, runtime ARNs, and environment-specific identifiers.
- [ ] `details` is bounded, predictable, and limited to decision-relevant fields.
- [ ] CDK synthesis introduces no unintended resources or environment behavior.
- [ ] PASS, FAIL, ERROR, sanitization, registry, and IAM tests pass.
- [ ] The Lambda asset contains no tests, Python bytecode, cache directories, credentials, or private files.

## Definition of done

A Checker is complete when:

- Python unit tests and Jest/CDK assertion tests pass.
- The TypeScript build passes.
- Credential-isolated `dev` and `prod` synthesis passes.
- The source diff and synthesized changes have been reviewed for IAM, security, replacement, deletion, and cost impact.
- An explicitly authorized development deployment and manual runtime validation succeed.
- The corresponding schema-version-2 item is verified by a key-based DynamoDB read.
- Custom application logs show the expected sanitized entry, and runtime validation shows no unexpected failure.
- Public platform-log excerpts are sanitized to redact invocation request IDs, runtime ARNs, and environment-specific identifiers.
- A public validation record documents the implementation, local checks, synthesis, reviewed diff, development verification, security result, cost impact, and remaining limitations.
- Source, generated artifacts, custom application logs, sanitized public log excerpts, examples, and the validation record contain no sensitive or private identifiers.

A production deployment is not required for Checker completion. Production synthesis is required, while any production deployment must be planned and approved separately.
