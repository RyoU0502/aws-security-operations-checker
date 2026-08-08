# CDK Config

This directory contains configuration files used by the CDK application.

## Files

- `defaults.ts`
  - Shared configuration used across environments.
  - The AWS account ID is resolved from the CDK execution environment instead of being hardcoded.

- `aws-environment.ts`
  - Validates the AWS account ID and region supplied to the CDK application.

- `environment.ts`
  - Defines and validates the supported CDK environment names.

The environment is selected by CDK context, for example:

```bash
npx cdk synth -c env=dev --profile <profile-name>
npx cdk synth -c env=prod --profile <profile-name>
