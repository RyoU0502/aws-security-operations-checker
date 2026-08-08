# CDK Config

This directory contains configuration files used by the CDK application.

## Files

- `defaults.ts`
  - Shared configuration used across environments.
  - The AWS account ID is resolved from the CDK execution environment instead of being hardcoded.

- `aws-environment.ts`
  - Requires the AWS account ID to be exactly 12 digits.
  - Defaults an unset region to `ap-northeast-1`.
  - Rejects empty, whitespace-only, or surrounding-whitespace region values.

- `environment.ts`
  - Defines `dev` and `prod` as the only supported CDK environment names.
  - Rejects missing or invalid context values instead of selecting a fallback.

Account and region values are resolved from the CDK execution environment. Do not hard-code an AWS account ID in source.

The environment is selected by CDK context, for example:

```bash
npx cdk synth -c env=dev --profile <AWS_PROFILE>
npx cdk synth -c env=prod --profile <AWS_PROFILE>
```
