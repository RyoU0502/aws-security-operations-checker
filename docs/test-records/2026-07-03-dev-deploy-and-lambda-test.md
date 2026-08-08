# dev環境 初回デプロイ・Lambda実行テスト記録

> **Historical validation record:** This document reflects the implementation and schema at the time of testing and may differ from the current repository state. See [README.md](../../README.md) for the current specification.

## 実施日

2026-07-03

## 対象環境

- AWS Account: `<ACCOUNT_ID>`
- Region: ap-northeast-1
- Environment: dev
- Stack: `<STACK_NAME>`

## 目的

CDKで作成したdev環境において、LambdaからDynamoDBへサンプルチェック結果を書き込めることを確認する。

## デプロイ対象

- S3 Bucket
  - `<RESULTS_BUCKET_NAME>`
- DynamoDB Table
  - `<RESULTS_TABLE_NAME>`
- Lambda Function
  - `<CHECKER_FUNCTION_NAME>`
- CloudWatch Logs LogGroup
  - `<CHECKER_LOG_GROUP_NAME>`
- IAM Role / Policy

## 実施コマンド

```bash
npx cdk deploy -c env=dev --profile <DEPLOY_PROFILE>
```

## デプロイ結果

成功。

```text
✅  <STACK_NAME>

CheckerFunctionName = <CHECKER_FUNCTION_NAME>
EnvironmentName = dev
ProjectName = aws-security-operations-checker
ResultsBucketName = <RESULTS_BUCKET_NAME>
ResultsTableName = <RESULTS_TABLE_NAME>
```

## Lambda手動実行

```bash
aws lambda invoke \
  --function-name <CHECKER_FUNCTION_NAME> \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  --profile <DEPLOY_PROFILE> \
  --region ap-northeast-1 \
  <RESPONSE_FILE>
```

## Lambda実行結果

```json
{
  "StatusCode": 200,
  "ExecutedVersion": "$LATEST"
}
```

レスポンス:

```json
{
  "statusCode": 200,
  "body": "{\"message\": \"Sample check result written successfully.\", \"resultId\": \"<sample-result-id>\"}"
}
```

## DynamoDB確認

```bash
aws dynamodb scan \
  --table-name <RESULTS_TABLE_NAME> \
  --limit 5 \
  --profile <DEPLOY_PROFILE> \
  --region ap-northeast-1
```

## 確認結果

```json
{
  "Items": [
    {
      "resourceId": {
        "S": "sample-resource"
      },
      "status": {
        "S": "PASS"
      },
      "envName": {
        "S": "dev"
      },
      "resultId": {
        "S": "<sample-result-id>"
      },
      "checkName": {
        "S": "sample-connectivity-check"
      },
      "message": {
        "S": "Lambda executed successfully and wrote a sample result."
      },
      "checkedAt": {
        "S": "<checked-at-utc>"
      },
      "severity": {
        "S": "LOW"
      }
    }
  ],
  "Count": 1,
  "ScannedCount": 1
}
```

## CloudWatch Logs保持期間確認

```bash
aws logs describe-log-groups \
  --log-group-name-prefix <CHECKER_LOG_GROUP_NAME> \
  --query 'logGroups[*].{logGroupName:logGroupName,retentionInDays:retentionInDays}' \
  --output table \
  --profile <DEPLOY_PROFILE> \
  --region ap-northeast-1
```

## 確認結果

```text
<CHECKER_LOG_GROUP_NAME>    7
```

## 結果

成功。

- CDK dev deploy 成功
- Lambda手動実行 成功
- DynamoDB item 書き込み 成功
- CloudWatch Logs保持期間7日 確認済み
