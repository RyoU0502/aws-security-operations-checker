# Final Release Candidate AWS Validation Record

Date: 2026-08-08

## Purpose

This record documents the final AWS deployment and runtime validation of the release candidate after its final local validation. It is separate from the historical public-snapshot reproduction records.

## Scope

- Environment: `dev` only
- Region: `ap-northeast-1`
- Production: not deployed and not runtime-tested
- Runtime executions: exactly one Lambda invocation

## Release Candidate

The deployed application and infrastructure revision was commit `d999670` (`Document final local validation`). The validation applied to that exact revision. Subsequent documentation-only changes record this evidence and do not alter the validated application code.

## Safety / Authorization

The validation was limited to the authorized development environment. The production environment was not deployed or invoked. Resource identity details and operator-specific credentials are intentionally omitted from this public record.

## Preconditions

- The development Application Stack did not exist.
- Application resources did not exist.
- The CDK bootstrap stack was healthy.
- The retained bootstrap asset bucket was initially empty.
- Real-profile account and region resolution succeeded.
- `TARGET_AWS_ACCOUNT` and `TARGET_AWS_REGION` were unset.
- The normal AWS profile → CDK CLI → `CDK_DEFAULT_*` resolution path succeeded.

## Pre-deploy Verification

The pre-deploy diff contained only the expected application resources. No unexpected or high-cost resources were present.

## Deployment

- Development deployment: successful
- CloudFormation stack status: `CREATE_COMPLETE`
- Logical resources: the expected five resources
- Results S3 Bucket: absent
- DynamoDB item count before invocation: `0`
- Lambda runtime: Python 3.12
- Lambda memory: 128 MB
- Lambda timeout: 30 seconds
- Lambda environment: `ENV_NAME=dev`
- Dedicated LogGroup retention: 7 days
- Deployed IAM permissions: matched the expected least-privilege policy
- Post-deployment CDK diff: `0` changes

## Runtime Validation

The Lambda was invoked exactly once. Before the invocation, direct AWS inspection showed that all four account-level S3 Block Public Access settings were enabled:

- `BlockPublicAcls = true`
- `IgnorePublicAcls = true`
- `BlockPublicPolicy = true`
- `RestrictPublicBuckets = true`

The expected Checker result was `PASS`. The invocation returned `StatusCode = 200` with no `FunctionError`. The response schema was valid with `schemaVersion = 2`; the Checker status was `PASS` with `MEDIUM` severity. The result was consistent with the directly observed AWS state.

## DynamoDB Persistence Validation

The table contained `0` items before invocation and `1` item after invocation. The stored item and Lambda response were semantically equivalent.

## CloudWatch Logs Validation

The dedicated LogGroup retained logs for 7 days, and runtime log events were present. Review found no `AccessDenied`, timeout, traceback, unhandled runtime failure, or sensitive-value leakage.

## IAM Runtime Validation

The deployed least-privilege policy was sufficient at runtime:

- DynamoDB `PutItem` succeeded.
- CloudWatch Logs stream creation and event writes succeeded.
- S3 `GetAccountPublicAccessBlock` succeeded.
- `logs:CreateLogGroup` was not required.

## Post-runtime Drift Check

The post-runtime CDK diff reported `0` changes. The CDK bootstrap stack remained healthy.

## Destroy / Cleanup

- Pre-destroy CDK diff: `0` changes
- Development Application Stack destroy: successful
- Final CloudFormation stack status: `DELETE_COMPLETE`
- Lambda function: removed
- DynamoDB table: removed
- Dedicated LogGroup: removed
- Application IAM role: removed
- Results S3 Bucket: absent
- Auto-delete provider: absent
- Orphan application resources: none detected

## Bootstrap Preservation

The CDK bootstrap stack and bootstrap asset bucket were intentionally retained. Deployment added two current objects: one Lambda ZIP asset and one CloudFormation/CDK JSON asset. After the Application Stack was deleted, the operator manually emptied the bootstrap bucket. Its final current object count was `0`; neither the bootstrap stack nor the bucket itself was deleted.

## Final AWS State

- No Application Stack
- No application Lambda function
- No application DynamoDB table
- No dedicated application LogGroup
- No application IAM role
- No Results S3 Bucket
- No provider or orphan application resources detected
- CDK bootstrap stack retained and healthy
- CDK bootstrap asset bucket retained and empty

## Result

The final release candidate passed development AWS deployment and runtime validation. One invocation verified the Checker result, DynamoDB persistence, CloudWatch Logs behavior, and least-privilege IAM effectiveness end to end. Application cleanup completed successfully, while the reusable bootstrap foundation was preserved and its asset bucket was returned to empty.

## Known Limitation

Production was not deployed or runtime-tested. This validation covered the development environment only.
