# DynamoDB PutItem Least-Privilege Validation

> **Historical validation record:** The body below describes the repository at the time of this validation and has not been rewritten. Later work replaced the fixed sample result with the S3 Account Public Access Block Checker and resolved the previously recorded TypeScript/Jest warning and CDK feature-flag notice. See the [S3 Checker validation](2026-08-02-s3-account-public-access-block-checker.md), [TypeScript no-emit and Jest validation](2026-08-02-typescript-noemit-jest-resolution.md), and [CDK feature flag validation](2026-08-02-cdk-feature-flags.md) for the later state.

## Purpose

Verify that the checker Lambda can save a result after its DynamoDB runtime permissions are reduced to the minimum action required by the current implementation.

## Scope

This validation covers the checker Lambda execution role, its DynamoDB policy, local CDK validation, deployment to the development environment, one Lambda invocation, the resulting DynamoDB item, and CloudWatch Logs.

Production was synthesized locally only. No production deployment was performed.

## Environment

- Environment: `dev`
- Region: `ap-northeast-1`
- AWS account: `<DEV_ACCOUNT_ID>`
- Read-only profile: `<READ_ONLY_PROFILE>`
- Deployment profile: `<DEPLOY_PROFILE>`
- Checker function: `<CHECKER_FUNCTION_NAME>`
- Results table: `<RESULTS_TABLE_NAME>`

## Changes

The checker Lambda policy was changed from the broader DynamoDB write grant to one explicit statement:

- Effect: `Allow`
- Action: `dynamodb:PutItem`
- Resource: the results table ARN only

The policy no longer includes `BatchWriteItem`, `DeleteItem`, `DescribeTable`, `UpdateItem`, wildcard actions, or an `/index/*` resource.

CDK assertion tests were added to verify the DynamoDB policy and confirm that the Lambda basic CloudWatch Logs policy remains attached.

## Local Validation

The following local checks succeeded:

- TypeScript build
- Two Jest/CDK assertion tests
- `git diff --check`

The Jest run emitted an existing `ts-jest` configuration warning about hybrid Node module support and `isolatedModules`. Both tests still passed, and the unrelated TypeScript configuration was not changed.

## CDK Synth Validation

Development and production templates were synthesized locally without AWS credentials, using a dummy account value and `ap-northeast-1`.

Both templates contained:

- `dynamodb:PutItem` as the only DynamoDB action for the checker Lambda
- The results table ARN as the only DynamoDB resource
- No `/index/*` resource
- The Lambda basic CloudWatch Logs managed policy

The existing environment differences were preserved: development uses `DeletionPolicy: Delete` for the S3 bucket, DynamoDB table, and log group, with seven-day log retention; production uses `DeletionPolicy: Retain` for those resources, with 30-day log retention.

The CDK CLI emitted a feature-flags notice, but both synth commands completed successfully.

## CDK Diff Result

The final development diff completed successfully and showed one application resource update: the checker Lambda execution role's IAM policy.

The synthesized template was published to the CDK bootstrap S3 bucket as part of the diff workflow. This was deployment-tooling activity, not an application resource change. Its S3 request and storage cost impact is expected to be negligible.

The diff showed no application resource additions, deletions, replacements, or non-IAM configuration changes.

## Deployment Result

Deployment to the development environment completed successfully through CloudFormation.

The only updated resource was the IAM policy attached to the checker Lambda execution role. No application resources were added, deleted, or replaced.

No rollback or `AccessDenied` error occurred during deployment.

Production was not deployed.

## Lambda Invocation Result

The checker Lambda was invoked exactly once with an empty payload.

- AWS CLI invocation status: `200`
- Function error: none
- Lambda response status: `200`
- A result identifier was returned; its value is intentionally omitted

## DynamoDB Verification

A strongly consistent read confirmed that the item returned by the Lambda invocation exists in the results table.

The stored item contained all expected attributes:

- `resultId`
- `checkName`
- `status`
- `severity`
- `message`
- `resourceId`
- `checkedAt`
- `envName`

The stored identifier matched the invocation result, and `envName` was `dev`.

A strongly consistent count check confirmed that the table contained exactly one more item after the invocation.

## CloudWatch Logs Verification

Logs recorded after the invocation start time contained the expected `START`, `END`, and `REPORT` entries.

No `AccessDenied`, `ERROR`, timeout, or unhandled-exception message was found for the invocation.

## Security Result

The deployed checker Lambda retains the permission required by its current `put_item` call while removing unused DynamoDB write and describe actions. Its DynamoDB resource scope is limited to the results table ARN.

The Lambda basic CloudWatch Logs permissions remain available.

No credentials or private AWS identifiers are included in this record.

## Cost Impact

The IAM policy change adds no billable application resource and does not increase ongoing application cost.

The validation added one DynamoDB item and generated one Lambda invocation and its log events. The results table does not currently configure DynamoDB TTL, so the stored item will not expire automatically.

The CDK bootstrap template upload can incur a negligible S3 request and storage cost.

## Result

Validation succeeded. The development environment can execute the checker Lambda and store a result with only `dynamodb:PutItem` access to the results table.

## Remaining Limitations

- The Lambda currently stores a fixed sample result; real security checks are not implemented yet.
- Production was synthesized locally but was not deployed or invoked.
- DynamoDB TTL is not configured, so stored results require an explicit future retention policy or cleanup process.
- CI/CD is not implemented. A Git push does not automatically update AWS resources.
- The existing `ts-jest` warning and CDK feature-flags notice remain to be evaluated separately.
