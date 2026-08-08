# AWS Security & Operations Checker — ポートフォリオ概要

## 概要

AWS Security & Operations Checkerは、小規模なAWS環境の設定確認や学習用途を想定した、セルフホスト型のセキュリティ・設定Checkerです。Lambdaを手動で呼び出すと、明示的に登録したCheckerを実行し、`PASS`、`FAIL`、`ERROR`の結果を集約してDynamoDBへ1件保存します。現在はMVPで、マネージドサービスのような機能の広さではなく、小さく追いやすいサーバーレス構成を重視しています。

## このプロジェクトで意識したこと

- AWS CDKとTypeScriptによるInfrastructure as Code
- 明示的なRegistryと逐次Runnerで構成したPython LambdaのChecker基盤
- アクションとリソースの範囲をテストするIAM最小権限
- CDKとLambda runtimeの設定を安全側で止める検証
- 結果データとアプリケーションログに不要な識別情報を残さない設計
- 再現しやすい自動テストと、コストを抑えたサーバーレス設定

## アーキテクチャ

手動呼び出し → Python Lambda handler → 明示的なChecker Registry / 逐次Runner → AWS APIの評価 → 実行結果を1件にまとめてDynamoDBへ保存

現在のCheckerは、S3 Control APIからアカウントレベルのS3 Block Public Access設定を読み取ります。Lambdaのプラットフォームログとアプリケーションログは専用のCloudWatch Logs LogGroupへ出力し、実行に必要な権限は専用IAM Roleへ付与しています。Lambda、DynamoDB Table、LogGroup、IAM Roleは、`dev`と`prod`の論理環境ごとにAWS CDKで定義しています。現在のApplication Stackに結果保存用のS3 Bucketはありません。

## セキュリティ設計

- デプロイ先のAWS Account IDはCDK実行環境から取得し、ソースにはハードコードしていません。
- Lambdaの実行権限は、必要なアクションをインラインポリシーへ明示しています。
- DynamoDBは、結果TableのARNに対する`dynamodb:PutItem`だけを許可しています。
- CloudWatch Logsは、専用LogGroupに対する`logs:CreateLogStream`と`logs:PutLogEvents`だけを許可し、`logs:CreateLogGroup`は付与していません。
- AWS管理policyの`AWSLambdaBasicExecutionRole`は使っていません。
- S3の権限は`s3:GetAccountPublicAccessBlock`だけです。このアカウントレベルAPIはリソース単位で絞れないため、Resourceは`"*"`にしています。
- 保存結果にはAccount ID、リソースARN、AWS APIの生レスポンス、リクエストID、例外メッセージを含めません。アプリケーションのエラーログにも例外メッセージは出さず、Checker ID、ステータス、例外の型だけを記録します。LambdaのプラットフォームログにはリクエストIDが含まれることがあるため、公開前の確認が必要です。
- CDKで選べる環境は`dev`と`prod`だけで、Account IDは12桁を必須としています。リージョン未設定時は`ap-northeast-1`を使い、空文字・空白のみ・前後に空白を含む値は拒否します。Lambda runtimeでも環境設定がない、または不正な場合は、AWS clientやCheckerを動かす前に停止します。

## テストと検証状況

### 現在のHEAD

- TypeScript build: 成功
- Jest/CDK: 38件成功
- Python: Python 3.12.13で39件成功

CDKの環境設定、IAMの範囲、Results Bucketが存在しないこと、Checkerの判定、結果形式の検証、エラー時の情報抑制、サマリー、DynamoDB保存、Lambdaの環境設定などをテストしています。

### CDK synth

`dev`と`prod`のsynthは、直前の設定強化時の検証で成功しています。その後に変わったのはソースコメントだけで、実行ロジック、型、CDK設定は変えていません。ただし、現在のHEADそのものでは最終synthをまだ再実行しておらず、公開前に実施する予定です。

### AWS上での再現検証

機密情報を除いた以前の公開用スナップショットは、AWS上で再現検証に成功しています。devへのデプロイ、Lambda呼び出し、DynamoDBへの保存、CloudWatch Logs、IAM権限を確認しました。検証に使ったApplication Stackは、その後destroyし、アプリケーションリソースもクリーンアップ済みです。

この過去の記録は、現在のHEADに対するruntime検証ではありません。現在のリビジョンのデプロイとruntime再検証は、公開前に実施する予定です。prodはこれまでデプロイしておらず、runtime検証も行っていません。

## 現在の範囲

実装済み:

- S3 Account Public Access Block Checker
- Lambdaの手動呼び出し
- Checkerの明示的な登録と逐次実行
- `PASS`、`FAIL`、`ERROR`のサマリーを持つバージョン付きの集約結果
- 完了した実行ごとのDynamoDB保存
- CloudWatch Logsへのアプリケーションログとプラットフォームログの出力
- `dev`と`prod`の論理環境
- AWS CDKによるインフラ定義

未実装:

- UI
- HTTP API
- スケジューラー
- CI/CDパイプライン
- マルチアカウント実行
- 自動修復

最新実行を取得する専用アクセスパターン、DynamoDB TTL、結果数が増えた場合のDynamoDB 400 KBアイテム上限への対応もまだありません。

## このプロジェクトで示している技術領域

- Lambda、DynamoDB、CloudWatch Logs、IAM、S3 Control APIを使ったAWSサーバーレス構成
- `dev`と`prod`の動作を明示したTypeScript / AWS CDKのIaC
- Protocol、依存性注入、Registry、共通の結果形式を使ったPythonアプリケーション設計
- CDK assertion testで範囲を確認するIAM最小権限
- 入力を安全側で検証し、運用データに含める情報を絞る実装
- TypeScript、Jest/CDK、Pythonによる自動検証
- 以前の公開用スナップショットに対するAWSデプロイ、runtime確認、記録、クリーンアップと、その検証範囲の明示
