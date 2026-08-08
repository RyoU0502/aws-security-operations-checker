# CDK Environment Context Validation

> **Historical validation record:** This document reflects the implementation at the time of testing and may differ from the current repository state. Later work also hardened CDK account and region validation; see [README.md](../../README.md) for the current specification.

## Summary

The CDK application previously used the development configuration when the
`env` context was omitted. Any value other than `prod` also selected the
development configuration, so missing or invalid input could proceed without
an explicit configuration error.

Environment selection is now fail-closed. The application accepts only `dev`
or `prod` and stops before constructing the stack when the context is missing
or invalid.

## Implementation

An `EnvironmentName` union type was added with exactly two allowed values:
`"dev" | "prod"`.

The side-effect-free `parseEnvironmentName` function accepts an `unknown`
input and returns an `EnvironmentName` only when the value exactly matches
`dev` or `prod`. All other values produce this error:

```text
CDK context "env" is required and must be either "dev" or "prod". Example: -c env=dev
```

The CDK entry point uses the validated value to select an explicitly keyed
environment configuration. It no longer defaults missing or unrecognized
values to the development configuration.

## Validation Cases

The environment validation tests confirmed that:

- `dev` is accepted
- `prod` is accepted
- An omitted value is rejected
- An empty string is rejected
- `staging` is rejected
- Uppercase `DEV` is rejected

The omitted-context and `staging` synthesis checks also failed with the
expected error before stack construction.

## Test Results

All local validation succeeded:

- Four existing CDK assertion tests passed
- Six new environment validation tests passed
- All ten CDK/Jest tests passed together
- All 29 Python tests passed
- The TypeScript build succeeded
- The full npm audit reported zero vulnerabilities
- The production-dependency audit reported zero vulnerabilities

## Credential-Isolated Synthesis

Development and production synthesis both succeeded with AWS credential and
profile variables removed, credential-file access disabled, instance metadata
credential retrieval disabled, and non-production placeholder environment
values supplied locally.

The post-change development and production CloudFormation templates were
byte-identical to their pre-change baselines. IAM definitions, asset manifests,
and the Checker Lambda asset contents were also unchanged.

The generated CDK metadata files differed only because the CDK entry point's
source line numbers moved. This metadata is diagnostic information and is not
part of the CloudFormation deployment target.

## AWS Activity

The validation performed no AWS context lookup, AWS API call, role assumption,
asset publication, CDK diff, or deployment. No AWS resource was created,
updated, replaced, or deleted.

## Security, Permissions, and Cost

Rejecting missing and invalid environment values prevents an unintended
development configuration from being selected silently. This is a local input
validation improvement and does not broaden IAM permissions or weaken an
existing security control.

Because the synthesized CloudFormation and IAM output did not change, this
work has no effect on AWS resources, permissions, deployment behavior, or AWS
cost. No production operation was performed.

## Result

Validation succeeded. CDK environment selection now permits only `dev` and
`prod`, rejects all other values with a clear actionable error, and preserves
the existing development and production deployment output.
