# AWS Quantity-Based Cost Estimate

Date: 2026-08-03

## 1. Scope and assumptions

This record estimates the AWS cost of the current sanitized public snapshot. It is a quantity-based estimate, not a bill or a guaranteed fixed price.

The estimate uses these assumptions:

- Region: `ap-northeast-1`
- Currency: USD
- Billing month: 30 days
- Free Tier, credits, discounts, and tax: excluded
- Manual Checker invocations: 100 per month
- Checker Lambda memory: 128 MB, or 0.125 GB
- Average Checker Lambda duration: 1 second per invocation
- DynamoDB writes: one non-transactional `PutItem` per invocation
- DynamoDB item size: 4 KiB
- CloudWatch Logs volume: 10 KiB per invocation
- Results bucket objects: none
- Data transfer: assumed negligible

KiB values are binary: 1 KiB is 1,024 bytes. Storage calculations use 1 GB as 2^30 bytes. The 100 new DynamoDB items are conservatively treated as retained for the full month.

CloudWatch Logs ingestion is 1,024,000 bytes per month. The retained-volume estimate uses the configured retention period divided by 30 days: 7/30 for `dev` and 30/30 for `prod`. CloudWatch archival is billed using compressed volume, but no observed compression ratio is available. The calculation therefore conservatively uses a compression ratio of 1.0.

## 2. Implemented billable resources

The current CDK and Lambda implementation can incur charges for:

- The Python 3.12 Checker Lambda, configured with 128 MB of memory and the default x86_64 architecture
- A DynamoDB Standard table in on-demand capacity mode
- One DynamoDB `PutItem` for each completed Checker run
- The Checker Lambda CloudWatch Logs log group
- An S3 Standard results bucket, although the current application does not store result objects in it
- The account-level S3 Control `GetAccountPublicAccessBlock` call made once per Checker run
- Lambda and CloudWatch Logs activity from the `dev` S3 auto-delete custom resource during stack lifecycle operations
- S3 storage and requests for deployment files in the CDK bootstrap bucket

The current implementation does not add an API Gateway, EventBridge schedule, VPC, NAT gateway, custom KMS key, DynamoDB backup, DynamoDB stream, S3 versioning, alarm, dashboard, or X-Ray tracing.

CloudFormation resources in the `AWS::*` namespace, IAM roles and policies, CloudFormation outputs, and an empty S3 bucket do not by themselves add a recurring usage charge. SSE-S3 for the results bucket and the DynamoDB default AWS owned key do not add a customer-managed KMS key charge.

## 3. Pricing sources

Only public AWS Price List Bulk files from the official AWS pricing domain were used for prices:

- [AWS Lambda Price List for Tokyo](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSLambda/20260717075216/ap-northeast-1/index.json)
- [Amazon DynamoDB Price List for Tokyo](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonDynamoDB/20260722003827/ap-northeast-1/index.json)
- [Amazon CloudWatch Price List for Tokyo](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonCloudWatch/20260729191940/ap-northeast-1/index.json)
- [Amazon S3 Price List for Tokyo](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/20260728131000/ap-northeast-1/index.json)

The files were retrieved during the read-only pricing investigation on 2026-08-03. No third-party pricing source was used.

## 4. Price List publication dates

| Service | Offer version | `publicationDate` |
|---|---|---|
| AWS Lambda | `20260717075216` | `2026-07-17T07:52:16Z` |
| Amazon DynamoDB | `20260722003827` | `2026-07-22T00:38:27Z` |
| Amazon CloudWatch | `20260729191940` | `2026-07-29T19:19:40Z` |
| Amazon S3 | `20260728131000` | `2026-07-28T13:10:00Z` |

## 5. Price inputs, units, and SKUs

Free-tier price dimensions were not applied. In particular, the normal DynamoDB Standard storage rate was applied from the first byte rather than applying the separate first-25-GB free price dimension.

| Charge | Price | Price List unit | SKU |
|---|---:|---|---|
| Lambda request | USD 0.0000002000/request | Request | `3BE8DYKG4FYSZGDW` |
| Lambda x86 duration, tier 1 | USD 0.0000166667/GB-second | Lambda-GB-Second | `FSYUV9NMNDEXRJ5H` |
| DynamoDB Standard on-demand write | USD 0.0000007150/write request unit | WriteRequestUnits | `HBK75W4NW4DYPFAC` |
| DynamoDB Standard storage | USD 0.285/GB-month | GB-Mo | `2HPSAWPXJ2JJJ6XY` |
| CloudWatch Logs ingestion | USD 0.76/GB | GB | `CWB2GTZJXNX3TA6H` |
| CloudWatch Logs archival | USD 0.033/GB-month | GB-Mo | `42CVQU4BPES8AWHC` |
| S3 Standard storage, first 50 TB | USD 0.025/GB-month | GB-Mo | `CCBFTMENTDWZHXHX` |
| S3 PUT, COPY, POST, or LIST | USD 0.0000047/request | Requests | `XAKHUSC46NWC9PPM` |
| S3 GET and other requests | USD 0.00000037/request | Requests | `9C7873KU3ZQBD6BJ` |

## 6. Service calculations

### Lambda

Requests:

`100 requests * USD 0.0000002000/request = USD 0.000020000000000`

Duration:

`100 invocations * 1 second * 0.125 GB * USD 0.0000166667/GB-second = USD 0.000208333750000`

Lambda subtotal:

`USD 0.000020000000000 + USD 0.000208333750000 = USD 0.000228333750000`

### DynamoDB

A normal DynamoDB write consumes one write request unit for each 1 KiB or portion of 1 KiB. A 4 KiB item therefore consumes 4 write request units.

Writes:

`100 items * 4 write request units/item * USD 0.0000007150/write request unit = USD 0.000286000000000`

Storage:

`100 items * 4,096 bytes/item / 2^30 bytes/GB * USD 0.285/GB-month = USD 0.000108718872070`

DynamoDB subtotal:

`USD 0.000286000000000 + USD 0.000108718872070 = USD 0.000394718872070`

### CloudWatch Logs

Ingestion for both environments:

`100 invocations * 10,240 bytes/invocation / 2^30 bytes/GB * USD 0.76/GB = USD 0.000724792480469`

`dev` archival, using 7-day retention and compression ratio 1.0:

`1,024,000 bytes / 2^30 bytes/GB * 7/30 * USD 0.033/GB-month = USD 0.000007343292236`

`dev` CloudWatch Logs subtotal:

`USD 0.000724792480469 + USD 0.000007343292236 = USD 0.000732135772705`

`prod` archival, using 30-day retention and compression ratio 1.0:

`1,024,000 bytes / 2^30 bytes/GB * 30/30 * USD 0.033/GB-month = USD 0.000031471252441`

`prod` CloudWatch Logs subtotal:

`USD 0.000724792480469 + USD 0.000031471252441 = USD 0.000756263732910`

### Results S3 bucket

The current application writes no result objects to the results bucket. Under the stated assumptions, recurring object storage and application request cost for this bucket is USD 0.

Bucket creation, policy operations, auto-deletion, and CDK asset operations are lifecycle or bootstrap costs and are addressed separately below.

## 7. Exact development and production calculations

The formally adopted totals exclude `GetAccountPublicAccessBlock`, CDK bootstrap assets, and lifecycle-only operations.

`dev`:

`USD 0.000228333750000 + USD 0.000394718872070 + USD 0.000732135772705 = USD 0.001355188394775/month`

`prod`:

`USD 0.000228333750000 + USD 0.000394718872070 + USD 0.000756263732910 = USD 0.001379316354980/month`

The environment difference comes from the configured CloudWatch Logs retention: 7 days for `dev` and 30 days for `prod`. Removal policies do not change the live monthly calculation but affect what remains after stack destruction.

## 8. Rounded values

| Environment | Rounded estimate | Readable result |
|---|---:|---|
| `dev` | Approximately USD 0.00136/month | Less than USD 0.01/month |
| `prod` | Approximately USD 0.00138/month | Less than USD 0.01/month |

Values that calculate to very small nonzero amounts are retained in the detailed calculations rather than being rounded to zero.

## 9. DynamoDB accumulation impact

The results table has no TTL, and each completed run uses a new result identifier. Stored items therefore accumulate until the table or individual items are explicitly deleted.

Each additional retained set of 100 items at 4 KiB per item adds:

`100 * 4,096 / 2^30 * USD 0.285 = USD 0.000108718872070/month`

Rounded for operational documentation, this is approximately USD 0.000109 per month for each additional retained 100-item set. The ongoing storage component after `n` such retained sets is approximately `n * USD 0.000108718872070/month`.

## 10. Transient deploy, update, and destroy costs

Deploy, update, and destroy operations can add small charges that are not part of the monthly invocation estimate:

- S3 PUT, GET, HEAD, and LIST requests associated with publishing or retrieving CDK deployment assets and synthesized templates
- Lambda requests and duration for the `dev` S3 auto-delete custom resource provider
- CloudWatch Logs ingestion and archival for that provider
- S3 policy, tagging, and object/version listing requests performed by the provider during `dev` destruction
- Additional LIST requests if a bucket contains enough objects or versions to require pagination
- Repeated asset requests, Lambda invocations, or logs caused by retries, failed operations, or repeated deployments

The current results bucket is assumed empty, but exact deployment-tool request counts, provider duration, and provider log volume depend on the actual operation. They were not guessed or included in the formal totals. S3 DELETE and CANCEL requests are free under the official S3 pricing description, but related LIST and other control requests may still be billed.

In `prod`, the results bucket, results table, and Checker log group use `RETAIN`. Stack destruction can therefore leave resources that continue to incur storage charges. Those post-destroy charges are not included in the monthly estimates.

## 11. Why CDK bootstrap costs are managed separately

The CDK bootstrap stack is shared deployment infrastructure for an account and region rather than an application resource owned only by one logical environment. Its S3 bucket can retain content-addressed Lambda packages, custom-resource handler packages, and synthesized templates independently of an application stack lifecycle.

Actual billed storage uses the packaged asset size, not only the uncompressed source size. The exact ZIP and template sizes were not generated because synthesis was outside the scope of this cost investigation. Existing assets can also be reused by hash, so request and storage attribution between `dev`, `prod`, and other stacks depends on the bootstrap bucket's existing contents and lifecycle configuration.

Bootstrap storage should therefore be calculated separately as:

`actual retained asset bytes / 2^30 * USD 0.025/GB-month`

New uploads and related checks should use the applicable S3 request rates in the pricing table. An empty bootstrap ECR repository, IAM roles, and the standard bootstrap parameter do not add application usage charges. A customized bootstrap stack using a customer-managed KMS key could add KMS charges, but no account configuration was inspected and no such charge is assumed here.

## 12. Excluded items

The estimate excludes:

- Free Tier, credits, discounts, tax, and data transfer
- CDK bootstrap asset storage and requests
- Deploy, update, destroy, retry, and rollback activity
- Continuing costs for resources retained after a `prod` destroy
- The unresolved account-level `GetAccountPublicAccessBlock` request classification
- The actual CloudWatch Logs compression ratio; the adopted calculation instead uses the conservative ratio 1.0
- Historical DynamoDB data beyond the one 100-item set represented in the base calculation
- CloudWatch Logs from the `dev` auto-delete provider
- CloudWatch Logs Insights, Live Tail, alarms, dashboards, CloudTrail data events, and X-Ray
- DynamoDB backups, point-in-time recovery, Streams, global tables, imports, and exports
- S3 results objects, versioning, replication, inventory, and analytics
- API Gateway, EventBridge, VPC, NAT gateway, and customer-managed KMS keys, which the current stack does not create

## 13. Unresolved `GetAccountPublicAccessBlock` classification

The Checker calls the account-level S3 Control `GetAccountPublicAccessBlock` operation once per run. The Amazon S3 Price List contains a generic `S3-API-Tier2` product described as GET and all other requests, but the official Price List does not map this account-level operation to that SKU conclusively.

Because the charge could not be established from an official API-to-SKU mapping, it is marked unresolved and excluded from both formal totals. No hypothetical S3 Tier 2 amount is presented as an adopted or official charge.

## 14. Read-only investigation method

The pricing investigation used repository source inspection, local arithmetic, and public AWS Price List Bulk JSON files. It did not use AWS credentials, an AWS profile, AWS account access, the AWS CLI pricing API, or any authenticated/account-facing AWS service API.

No bootstrap, deploy, update, destroy, Lambda invocation, resource lookup, or other AWS operation was performed. No network access was used while applying this documentation change.

The prohibited npm, build, test, and synth commands were not run for this documentation-only update.

## 15. Security and resource-change result

This work changes documentation only. It does not change application source, CDK configuration, Lambda code, tests, package manifests, dependency locks, IAM policies, security controls, or AWS resources.

No credential, account identifier, ARN, profile name, email address, or other private or environment-specific value is included in this record. No Git staging, commit, or push operation was performed.
