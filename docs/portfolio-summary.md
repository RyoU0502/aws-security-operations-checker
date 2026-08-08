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

- The deployment account and region can be set with the project-defined `TARGET_AWS_ACCOUNT` and `TARGET_AWS_REGION` overrides. When an override is undefined, the application uses the corresponding `CDK_DEFAULT_*` value supplied by the CDK CLI. Neither value is hard-coded in source.
- The Lambda role uses explicit inline least-privilege permissions.
- DynamoDB access is limited to `dynamodb:PutItem` on the results table ARN.
- CloudWatch Logs access is limited to `logs:CreateLogStream` and `logs:PutLogEvents` on the dedicated log group; the role has no `logs:CreateLogGroup` permission.
- The role does not use the AWS-managed `AWSLambdaBasicExecutionRole` policy.
- `s3:GetAccountPublicAccessBlock` is the only S3 action. Its resource is `"*"` because this account-level API does not support resource-level authorization.
- Stored results omit AWS account IDs, resource ARNs, raw API responses, request IDs, and exception text. Custom error logs record the checker ID, status, and exception type rather than exception text. Lambda platform logs can still contain request IDs and require review before publication.
- CDK accepts only `dev` or `prod`, requires a 12-digit account value, and requires a non-empty region with no surrounding whitespace. Explicit project overrides take precedence over CDK CLI defaults; invalid explicit values do not fall back, and there is no implicit region default. Missing or invalid configuration fails closed. The Lambda runtime also rejects missing or invalid environment configuration before AWS clients or checkers run.

## Testing and validation

### Current HEAD

- TypeScript build: passed
- Jest/CDK: 48 tests passed
- Python: 39 tests passed with Python 3.12.13

The tests cover CDK environment parsing, IAM scopes, the absence of a results bucket, checker decisions, result-contract validation, sanitized failures, summaries, DynamoDB persistence, and Lambda configuration behavior.

### CDK synthesis

The current HEAD passed credential-isolated `dev` and `prod` synthesis with no AWS lookups. The synthesized templates passed the final local sanity checks, and the validation confirmed that `TARGET_AWS_REGION=ap-northeast-1` takes precedence over `AWS_REGION` and `AWS_DEFAULT_REGION` set to `us-east-1`.

### Historical AWS reproduction

An earlier sanitized public snapshot was successfully reproduced in AWS. That validation covered a development deployment, Lambda invocation, DynamoDB persistence, CloudWatch Logs, and IAM permissions. The application stack used for the reproduction was later destroyed and its application resources were cleaned up.

This historical validation is separate from the AWS validation of application and infrastructure revision `d999670`.

### Final release candidate AWS validation

The application and infrastructure revision validated in AWS was `d999670`. It passed final local validation and final AWS deployment/runtime validation in `dev`. One Lambda invocation confirmed the expected end-to-end `PASS` behavior, the persisted DynamoDB result was semantically equivalent to the response, and the least-privilege IAM permissions worked at runtime. The subsequent documentation-only update records this validation evidence and does not alter the validated application code. The development Application Stack and its application resources were removed after validation. The CDK bootstrap foundation was intentionally retained and its asset bucket was returned to empty. Production has never been deployed or runtime-tested.

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
- AWS-side deployment, runtime verification, evidence recording, and cleanup for both a historical public snapshot and the final release candidate, with their distinct scopes stated explicitly
