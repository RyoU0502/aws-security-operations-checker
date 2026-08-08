# CDK Library Structure

This directory contains the main CDK application code for AWS Security & Operations Checker.

## Directories

- `config/`
  - Environment and shared configuration for the CDK app.
  - The application can switch settings by using CDK context such as `-c env=dev` or `-c env=prod`.

- `stacks/`
  - CDK stack definitions.
  - DynamoDB, Lambda, CloudWatch Logs, and IAM resources are defined here.

This structure separates environment configuration from resource definitions, making the CDK app easier to maintain and extend.
