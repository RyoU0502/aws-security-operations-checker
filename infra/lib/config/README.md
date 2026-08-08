# CDK Config

This directory contains configuration files used by the CDK application.

## Files

- `defaults.ts`
  - Shared configuration used across environments.
  - Resolves project-defined explicit overrides before CDK CLI defaults.

- `aws-environment.ts`
  - Requires the AWS account ID to be exactly 12 digits.
  - Requires a non-empty region with no surrounding whitespace.
  - Fails closed when account or region values cannot be resolved.

- `environment.ts`
  - Defines `dev` and `prod` as the only supported CDK environment names.
  - Rejects missing or invalid context values instead of selecting a fallback.

`TARGET_AWS_ACCOUNT` and `TARGET_AWS_REGION` are project-defined explicit overrides. When an override is undefined, the application falls back to `CDK_DEFAULT_ACCOUNT` or `CDK_DEFAULT_REGION` supplied by the CDK CLI. Empty or invalid overrides fail closed instead of falling back. There is no implicit region default. Do not hard-code an AWS account ID in source.

Normally, an AWS profile allows the CDK CLI to resolve the account and region and pass them to the application:

```bash
npx --no-install cdk synth -c env=dev --profile <AWS_PROFILE>
npx --no-install cdk synth -c env=prod --profile <AWS_PROFILE>
```

For credential-isolated local synthesis, use the project-defined overrides:

```bash
TARGET_AWS_ACCOUNT=<ACCOUNT_ID> \
TARGET_AWS_REGION=<REGION> \
npx --no-install cdk synth -c env=dev

TARGET_AWS_ACCOUNT=<ACCOUNT_ID> \
TARGET_AWS_REGION=<REGION> \
npx --no-install cdk synth -c env=prod
```
