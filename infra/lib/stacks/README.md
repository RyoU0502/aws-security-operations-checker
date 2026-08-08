# CDK Stacks

This directory contains CDK stack definitions.

## Current Stack

- `app-stack.ts`
  - Defines the main AWS resources for the project.
  - Current resources include:
    - DynamoDB results table
    - Python 3.12 Checker Lambda function
    - Dedicated CloudWatch Logs log group
    - Checker Lambda execution role and inline IAM permissions

The application stack does not provision a results S3 bucket. The S3 Account Public Access Block Checker remains part of the Lambda and uses the account-level S3 API.

The stack supports only `dev` and `prod`. It uses the logical environment to select the results table and log group removal policies and the log retention period.
