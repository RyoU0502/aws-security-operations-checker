# CDK Config

This directory contains configuration files used by the CDK application.

## Files

- `defaults.ts`
  - Shared configuration used across environments.
  - The AWS account ID is resolved from the CDK execution environment instead of being hardcoded.

- `env/dev.ts`
  - Development environment settings.

- `env/prod.ts`
  - Production environment settings.

The environment is selected by CDK context, for example:

```bash
npx cdk synth -c env=dev --profile <profile-name>
npx cdk synth -c env=prod --profile <profile-name>
