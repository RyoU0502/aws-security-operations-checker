# CDK Stacks

This directory contains CDK stack definitions.

## Current Stack

- `app-stack.ts`
  - Defines the main AWS resources for the project.
  - Current resources include:
    - S3 results bucket
    - DynamoDB results table
    - Lambda checker function
    - CloudWatch Logs log group
    - IAM permissions

The stack uses environment settings to switch behavior between dev and prod, such as removal policy and log retention.
