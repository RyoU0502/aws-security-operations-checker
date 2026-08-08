# Public Snapshot AWS Reproduction Validation

> **Historical validation record:** This document reflects the implementation at the time of testing and is not AWS runtime validation of the current HEAD. The application stack used for this reproduction was subsequently destroyed; see the [final AWS cleanup record](2026-08-08-aws-cleanup.md). See [README.md](../../README.md) for the current implementation and validation status.

## Summary

This record documents the final AWS reproduction test performed from the sanitized public snapshot. Local validation, development deployment, one runtime invocation, persistence verification, logging verification, and least-privilege IAM verification completed successfully. The development application stack remained deployed in `CREATE_COMPLETE` state after validation.

Environment-specific identifiers and sensitive command output are intentionally omitted.

## Scope

- The validation started from the sanitized public snapshot, without the original private repository's Git history.
- The logical environment was `dev`.
- The AWS Region was `ap-northeast-1`.
- No production operation was performed.
- The existing CDK bootstrap stack was used, but the bootstrap stack itself was not changed.

## Local Validation

The following local validation completed successfully:

- Python `3.12.13`
- TypeScript build
- CDK/Jest tests: 10 passed
- Python tests: 29 passed
- `ts-jest` warnings: zero
- `npm audit`: zero vulnerabilities
- `npm audit --omit=dev`: zero vulnerabilities
- `package.json` and `package-lock.json` remained unchanged
- No TypeScript-generated `.js`, `.d.ts`, or `.js.map` files were created in the source or test directories

The audit results are point-in-time observations and do not guarantee that the repository or its dependency graph will remain free of reported vulnerabilities.

## Profiles and Permissions

- Local build preparation, CDK diff, deployment, and the single Lambda invocation used `<DEPLOY_PROFILE>`.
- Read-only AWS verification used `<READ_ONLY_PROFILE>`.
- `<ADMIN_PROFILE>` was not used.
- The caller identities were checked against the locally configured development account before AWS operations proceeded.
- No account ID, ARN, or profile configuration value is included in this record.

## CDK Diff and Deploy

`cdk ls` identified exactly one development application stack. The initial diff represented creation of only the expected 11 application resources. It contained no unexpected privilege expansion and no production, bootstrap, AWS Organizations, service control policy, or billing change.

Deployment completed successfully:

- CloudFormation status: `CREATE_COMPLETE`
- Resources completed successfully: 11 of 11
- Failed resources: zero
- Stack outputs were produced successfully
- The immediate post-deployment CDK diff reported no difference

The deployed stack name, output values, resource physical names, account identifiers, and ARNs are not reproduced here.

## Lambda Runtime Validation

The Checker Lambda was invoked exactly once. The invocation and response validation found:

- AWS invocation status code: `200`
- Function error: none
- Top-level response `statusCode`: `200`
- The response `body` was a JSON string and parsed successfully
- `schemaVersion`: `2`
- `resultId`: present
- `checkedAt`: present
- The current public schema uses the `results` array field
- S3 Account Public Access Block Checker results: one
- Checker status: `PASS`
- Checker severity: `MEDIUM`
- `FAIL` results: zero
- `ERROR` results: zero

The response's environment-specific values and `resourceId` are not included in this record.

## DynamoDB Validation

The results table validation found:

- Table status: `ACTIVE`
- Billing mode: `PAY_PER_REQUEST`
- Exact item count: one
- Keyed `GetItem`: successful
- Point-in-time recovery: `DISABLED`
- Encryption at rest: standard DynamoDB encryption using an AWS owned key

The Lambda response and stored item matched semantically. The comparison covered:

- `resultId`
- `schemaVersion`
- `checkedAt`
- `results`
- `checkId`
- `status`
- `severity`
- `message`
- `resourceId`

The item body, key value, result identifier, and other environment-specific values are not reproduced here.

## S3 Validation

The results bucket existed and had the expected development configuration:

- Current objects: zero
- Object versions: zero
- Delete markers: zero
- Versioning: not configured
- Server-side encryption: SSE-S3 with `AES256`
- Block Public Access: all four settings were `true`

No object key or bucket physical name is included in this record.

## CloudWatch Logs Validation

The Checker log group existed with a retention period of seven days. Events corresponding to the single validation invocation were present:

- `START`-equivalent platform events: one
- `END`-equivalent platform events: one
- `REPORT`-equivalent platform events: one
- Application checker completion result: present
- Access denial: none
- Timeout: none
- Traceback: none
- Subscription filters: zero

Log messages, request IDs, log stream names, and the log group physical name are intentionally omitted.

## Lambda Configuration

The deployed Checker Lambda configuration was:

- Runtime: Python `3.12`
- Architecture: `x86_64`
- Memory: 128 MB
- Timeout: 30 seconds
- State: `Active`
- Last update status: `Successful`

Environment variable values and the function physical name are not included.

## IAM Validation

The deployed Checker execution role retained the expected least-privilege configuration:

- `dynamodb:PutItem` was its only DynamoDB action
- The DynamoDB resource was limited to the results table
- No wildcard DynamoDB write resource was present
- `s3:GetAccountPublicAccessBlock` was its only S3 action
- The S3 action used `Resource: "*"` because it is an account-level API without resource-level authorization
- Lambda basic logging permissions were supplied by the AWS-managed basic execution policy
- No `dynamodb:DeleteItem`, `dynamodb:UpdateItem`, `dynamodb:Scan`, `dynamodb:Query`, or S3 write permission was present

Role names, policy names, table names, account identifiers, and ARNs are not included.

## Provider and Bootstrap

The CDK S3 auto-delete provider Lambda was managed by the application stack and reported:

- Runtime: `nodejs24.x`
- State: `Active`
- Last update status: `Successful`

One orphan provider log group from a past application stack remained, and the current provider log group also existed. Neither log group had a retention period configured. Both are outside the application stack's managed resources and are planned for explicit cleanup after the final application stack destroy.

The existing CDK bootstrap stack, bootstrap bucket, roles, and parameter remained in place. The bootstrap stack itself was not updated by this deployment and is not a target for the planned application cleanup.

## Current State and Remaining Work

- The development application stack is currently deployed and in `CREATE_COMPLETE` state.
- The final destroy has not yet been performed.
- The next step is to destroy the development application stack and verify removal of its stack-managed application resources.
- After that verification, the orphan provider log groups will be cleaned up explicitly.
- The CDK bootstrap stack will remain.

## Security and Privacy

This public record intentionally excludes:

- AWS account IDs
- ARNs
- Stack names
- Resource physical names
- Profile configuration values
- SSO URLs and device codes
- DynamoDB item content
- Lambda response `resourceId` values
- Log messages
- Request IDs
- Local absolute paths
- Email addresses

No production operation, final destroy, provider log group deletion, bootstrap modification, AWS Organizations operation, service control policy operation, or billing operation was performed as part of this validation.

## Result

The sanitized public snapshot reproduced the development application successfully. Local validation passed, the initial deployment created only the expected resources, the deployed stack reached `CREATE_COMPLETE`, the immediate post-deployment diff was clean, the single Checker invocation completed successfully, and the Lambda response matched the DynamoDB item semantically. S3, CloudWatch Logs, Lambda configuration, IAM permissions, the auto-delete provider, and bootstrap resources matched the expected development design.
