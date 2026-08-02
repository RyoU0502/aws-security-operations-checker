# dev環境 初回デプロイ・Lambda実行テスト記録

## 実施日

2026-07-03

## 対象環境

- AWS Account: `<aws-account-id>`
- Region: ap-northeast-1
- Environment: dev
- Stack: AwsSecurityOpsChecker-dev

## 目的

CDKで作成したdev環境において、LambdaからDynamoDBへサンプルチェック結果を書き込めることを確認する。

## デプロイ対象

- S3 Bucket
  - aso-checker-dev-`<account-id>`-ap-northeast-1
- DynamoDB Table
  - aso-checker-results-dev-`<account-id>`-ap-northeast-1
- Lambda Function
  - aso-checker-runner-dev
- CloudWatch Logs LogGroup
  - /aws/lambda/aso-checker-runner-dev
- IAM Role / Policy

## 実施コマンド

```bash
npx cdk deploy -c env=dev --profile <profile-name>
```

## デプロイ結果

成功。

```text
✅  AwsSecurityOpsChecker-dev

CheckerFunctionName = aso-checker-runner-dev
EnvironmentName = dev
ProjectName = aws-security-operations-checker
ResultsBucketName = aso-checker-dev-<account-id>-ap-northeast-1
ResultsTableName = aso-checker-results-dev-<account-id>-ap-northeast-1
```

## Lambda手動実行

```bash
aws lambda invoke \
  --function-name aso-checker-runner-dev \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  --profile <profile-name> \
  --region ap-northeast-1 \
  /tmp/aso-checker-response.json
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
  --table-name aso-checker-results-dev-<account-id>-ap-northeast-1 \
  --limit 5 \
  --profile <profile-name> \
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
  --log-group-name-prefix /aws/lambda/aso-checker-runner-dev \
  --query 'logGroups[*].{logGroupName:logGroupName,retentionInDays:retentionInDays}' \
  --output table \
  --profile <profile-name> \
  --region ap-northeast-1
```

## 確認結果

```text
/aws/lambda/aso-checker-runner-dev    7
```

## 結果

成功。

- CDK dev deploy 成功
- Lambda手動実行 成功
- DynamoDB item 書き込み 成功
- CloudWatch Logs保持期間7日 確認済み
