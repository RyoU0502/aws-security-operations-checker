# AWS Security & Operations Checker — Portfolio Summary

## Overview

AWS Security & Operations Checker is a small, self-hosted security and configuration checker for focused reviews of small AWS environments and for learning. A manually invoked Lambda runs explicitly registered checks, summarizes their `PASS`, `FAIL`, and `ERROR` results, and stores one completed run in DynamoDB. The current MVP deliberately favors a compact, understandable serverless design over the breadth of a managed security service.

## What I focused on

- Infrastructure as Code with AWS CDK and TypeScript
- A Python Lambda framework with an explicit checker registry and sequential runner
- Least-privilege IAM policies with tested action and resource scopes
- Fail-closed CDK and Lambda environment validation
- Sanitized result and application-log handling
- Reproducible automated tests and cost-conscious serverless settings

## Architecture

Manual invocation → Python Lambda handler → explicit checker registry and sequential runner → AWS API evaluation → one aggregate check-run item in DynamoDB

The current checker reads the account-level S3 Block Public Access configuration through the S3 Control API. A dedicated CloudWatch Logs log group receives Lambda platform and application logs, and a dedicated IAM role grants the runtime permissions. AWS CDK defines the Lambda function, DynamoDB table, log group, and role for the `dev` and `prod` logical environments. The current Application Stack does not contain a results S3 bucket.

## Security design

- The deployment account ID is resolved from the CDK execution environment instead of being hard-coded in source.
- The Lambda role uses explicit inline least-privilege permissions.
- DynamoDB access is limited to `dynamodb:PutItem` on the results table ARN.
- CloudWatch Logs access is limited to `logs:CreateLogStream` and `logs:PutLogEvents` on the dedicated log group; the role has no `logs:CreateLogGroup` permission.
- The role does not use the AWS-managed `AWSLambdaBasicExecutionRole` policy.
- `s3:GetAccountPublicAccessBlock` is the only S3 action. Its resource is `"*"` because this account-level API does not support resource-level authorization.
- Stored results omit AWS account IDs, resource ARNs, raw API responses, request IDs, and exception text. Custom error logs record the checker ID, status, and exception type rather than exception text. Lambda platform logs can still contain request IDs and require review before publication.
- CDK accepts only `dev` or `prod` and requires a 12-digit account value. An unset region defaults to `ap-northeast-1`; empty, whitespace-only, or surrounding-whitespace values are rejected. The Lambda runtime also rejects missing or invalid environment configuration before AWS clients or checkers run.

## Testing and validation

### Current HEAD

- TypeScript build: passed
- Jest/CDK: 38 tests passed
- Python: 39 tests passed with Python 3.12.13

The tests cover CDK environment parsing, IAM scopes, the absence of a results bucket, checker decisions, result-contract validation, sanitized failures, summaries, DynamoDB persistence, and Lambda configuration behavior.

### CDK synthesis

Both `dev` and `prod` synthesis succeeded during the immediately preceding configuration-hardening revision. The changes after that validation were source comments only; execution logic, types, and CDK configuration did not change. Final synthesis of the current HEAD has not yet been rerun and is planned before publication.

### AWS reproduction

An earlier sanitized public snapshot was successfully reproduced in AWS. That validation covered a development deployment, Lambda invocation, DynamoDB persistence, CloudWatch Logs, and IAM permissions. The application stack used for the reproduction was later destroyed and its application resources were cleaned up.

This historical AWS validation is not runtime validation of the current HEAD. Deployment and runtime re-validation of the current revision are still planned before publication. Production has never been deployed or runtime-tested.

## Current scope

Implemented:

- S3 Account Public Access Block Checker
- Manual Lambda invocation
- Explicit checker registration and sequential execution
- Versioned aggregate results with `PASS`, `FAIL`, and `ERROR` summaries
- DynamoDB persistence after each completed run
- CloudWatch Logs for application and platform logging
- `dev` and `prod` logical environments
- AWS CDK infrastructure definitions

Not implemented:

- User interface
- HTTP API
- Scheduler
- CI/CD pipeline
- Multi-account execution
- Automatic remediation

The project also does not yet provide a dedicated latest-run access pattern, DynamoDB TTL, or a strategy for the 400 KB DynamoDB item limit as the number of results grows.

## What this project demonstrates

- AWS serverless architecture using Lambda, DynamoDB, CloudWatch Logs, IAM, and the S3 Control API
- TypeScript-based AWS CDK infrastructure with explicit development and production behavior
- Python application design using protocols, dependency injection, a registry, and a shared result contract
- Least-privilege IAM design backed by CDK assertion tests
- Defensive validation and controlled handling of sensitive operational data
- Automated TypeScript, Jest/CDK, and Python validation
- AWS-side deployment, runtime verification, evidence recording, and cleanup for an earlier public snapshot, with the limits of that evidence stated explicitly
