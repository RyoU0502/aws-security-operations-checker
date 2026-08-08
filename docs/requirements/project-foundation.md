# AWS Security & Operations Checker

> **Historical planning document:** This document preserves early project plans and includes proposals that are not implemented. See [README.md](../../README.md) for the source of truth on the current architecture, functionality, validation status, deployment, and cleanup behavior.

## project-foundation.md

## 1. プロジェクト概要

### 1.1 プロジェクト名
AWS Security & Operations Checker

### 1.2 目的
AWS環境に存在するセキュリティ設定ミスと運用上のリスクをチェックし、結果を保存・可視化できる仕組みを構築する。

### 1.3 このプロジェクトで実現したいこと
- 転職用ポートフォリオとして、AWSの設計構築を0から行った実績を作る
- 実務で経験してきた運用改善・変更管理・監視の観点を、設計と実装に落とし込む
- GitHubで公開し、再現可能な構成として示せるようにする
- Qiitaで設計・構築・学習内容を記事化できるようにする
- IaC&CI/CD前提で継続運用する構成を作る

---

## 2. 最優先事項

### 2.1 最優先
最優先で重視するのはコストである。

### 2.2 コスト方針
- 当面は月額5,000円以内を目安とする
- 常時起動の高コスト構成は避ける
- サーバーレス中心で構成する
- ただし学習目的として価値が高いIaC&CI/CD構成については、必要な範囲でコスト増を許容する
- 「安さだけ」を優先して学習目的がずれることは避ける

### 2.3 開発方針
- コンソールでの手動作成・手動変更は原則行わない
- 作成できるもの、定義できるものは可能な限りIaC化する
- デプロイや変更反映は可能な限りCI/CDに寄せる
- Gitを主要な変更履歴の正とする

---

## 3. 提供形態

### 3.1 提供方式
本プロジェクトはセルフホスト型で提供する。

### 3.2 セルフホスト型の定義
- 開発者がGitHubでソースコードを公開する
- 利用者は自分のAWSアカウントにデプロイして利用する
- AWS環境のチェックは、利用者自身のAWSアカウント内で実行される
- 開発者のAWSアカウントから他ユーザーのAWSアカウントへアクセスすることは行わない

### 3.3 この方式を採用する理由
- 低コストで始めやすい
- 設計がシンプル
- 個人開発でも完成まで持っていきやすい
- SaaS運用基盤やクロスアカウントAssumeRole設計が不要
- GitHub公開のポートフォリオとして相性が良い

---

## 4. MVPスコープ

### 4.1 MVPで実現すること
- 利用者が画面から手動でチェックを実行できる
- AWS環境のチェック結果を取得できる
- 結果を保存できる
- 最新結果を画面で確認できる
- ログを確認できる
- CDKでデプロイできる

### 4.2 MVPの初期チェック対象
- S3のパブリック公開設定
- Security Groupの過剰開放

### 4.3 MVPで優先度高めの追加候補
- CloudTrailの有効/無効
- GuardDutyの有効/無効
- IAMの強すぎる権限の検知

### 4.4 MVPではまだやらないこと
- SaaS型の集中管理
- クロスアカウント診断
- サブスク課金
- 複雑な認証機構
- 不特定多数向けの公開サービス運用
- 高機能なダッシュボード
- 定期実行
- 通知
- 差分比較

### 4.5 MVPの実行方式
MVPでは、S3静的ホスティング上の簡易画面から手動実行できることを重視する。
初期段階では公開API前提の構成は採らず、低コストかつ学習目的に合うシンプルな実行方式で開始する。
API Gatewayを用いた外部公開や定期実行連携はPhase 3以降の拡張対象とする。

---

## 5. フェーズ計画

### Phase 1
アプリ本体をCDKで構築する。

対象:
- S3
- Lambda
- DynamoDB
- CloudWatch Logs
- IAM Role/Policy
- 簡易フロント
- app-stack

目的:
- まずMVPを成立させる
- アプリ本体をIaCで管理する

### Phase 2
開発基盤を追加する。

対象:
- CodePipeline
- CodeBuild
- GitHub連携
- cicd-stack

目的:
- アプリ本体だけでなく開発基盤もIaC化する
- GitHub pushを起点に継続反映できる形へ近づける

### Phase 3
拡張機能を追加する。

対象:
- API Gateway
- EventBridge
- SNS
- チェック項目の追加
- monitoring-stack

目的:
- 将来拡張を進める
- 実運用寄りの構成に近づける

---

## 6. 技術スタック方針

### 6.1 採用方針
- IaC: AWS CDK
- リポジトリ: GitHub
- 実行基盤: AWS Lambda
- データ保存: DynamoDB
- フロント: S3静的ホスティング
- ログ: CloudWatch Logs
- CI/CD: CodePipeline + CodeBuild

### 6.2 言語方針
- CDK: TypeScript
- Lambda: Python
- フロント: 素のHTML/JavaScript/CSS

### 6.3 採用理由
- TypeScriptのCDKは情報量が多く、将来性も高い
- PythonはLambda実装に向いており、AWS SDK利用もしやすい
- フロントは初期段階では簡易的でよく、学習目的の中心はAWS設計構築に置く

---

## 7. 環境方針

### 7.1 AWSアカウント方針
初期段階では1AWSアカウントで運用する。

### 7.2 環境分離方針
- dev
- stg
- prod

を物理アカウント分離ではなく、CDK stack名やprefixによる論理分離で表現する。
初期段階ではdevとprodを優先し、stgは将来用の予約名として扱う。

### 7.3 将来方針
将来的にはアカウントを分けた環境構成も想定するため、以下は最初からパラメータ化する。
- env
- region
- accountId
- stackPrefix

---

## 8. config方針

### 8.1 パラメータ化するもの
- envName
- region
- accountId
- stackPrefix
- commonTags
- logRetentionDays
- lambdaMemorySize
- lambdaTimeoutSeconds

### 8.2 パラメータ化の目的
- 将来の環境分離に備える
- GitHub公開しやすくする
- 環境差分を分離する
- 直書き値を減らす

### 8.3 secretsの扱い
- 秘密情報はコードに含めない
- 公開リポジトリに載せる設定値と、載せてはいけない値を明確に分ける

---

## 9. Git運用方針

### 9.1 ブランチ構成
- dev
- main

### 9.2 運用ルール
- 日常の作業はdevで行う
- 安定した内容のみmainに反映する
- mainは壊れていない状態を保つ
- Git差分確認を必須化する
- IaC変更時はcdk diffも必須化する

### 9.3 日常作業で確認するもの
- git diff
- git status
- git log
- cdk diff

### 9.4 トラブル時の方針
- コンソールで直接修正せず、まずGit履歴を確認する
- 必要ならrevertを優先する
- 応急処置で手動変更した場合でも、必ず後でCDKへ戻す

---

## 10. IaC / CI-CD 方針

### 10.1 基本原則
- AWSリソース作成は原則CDK
- 設定変更も原則CDK修正 → デプロイで反映する
- IAM Role/PolicyもCDKで管理する
- CodePipeline/CodeBuild もCDKで管理する
- S3ライフサイクルルール等の周辺設定も可能な限りCDKで管理する

### 10.2 Gitを正とする考え方
- 変更履歴はGitで追える状態を優先する
- CloudTrailは補助的に扱い、主要な変更履歴の拠り所にしない
- なぜ変更したかまで追える状態を作る

### 10.3 初期手動作業として許容するもの
- AWSアカウント作成
- AWS CLI SSO初期設定
- GitHub連携の初期承認
- CDK bootstrapなどの初回準備

---

## 11. ディレクトリ構成方針

### 11.1 基本方針
- infraとsrcを明確に分ける
- docsに設計資料を置く
- scriptsにローカル補助スクリプトを置く
- 最終形を意識しつつ、実ファイルは必要時に増やす
- 空ファイルを大量に先作成しない

### 11.2 構成の考え方
- infra: AWSリソース定義
- src: アプリ本体コード
- docs: 要件・設計・方針
- scripts: diff/deploy/synthなどの補助
- notes: トラブルメモなどの作業補助

### 11.3 ディレクトリ作成ルール
- ディレクトリは必要になった段階で順次追加する
- 完成形だけ意識し、実装していないファイルはむやみに置かない

---

## 12. Lambda実装方針

### 12.1 基本方針
- Lambda関数は最初は1つで始める
- ただし中の実装はチェック項目ごとに分割する

### 12.2 役割分担
- handler.py: 司令塔
- checks/: 診断ロジック
- services/: 共通処理
- models/: 結果構造

### 12.3 初期方針
最初は以下の構成から始める。
- handler.py
- checks/s3_public_access.py
- checks/security_group_exposure.py

### 12.4 将来方針
今後、以下のようなチェックを1ファイル追加で拡張できる構成を目指す。
- cloudtrail_enabled.py
- guardduty_enabled.py
- iam_overprivileged.py
- api_gateway_public_access.py

### 12.5 設計思想
チェックロジックをプラグイン的に増やせる構成にし、結果形式は共通化する。

### 12.6 結果データの基本項目
チェック結果は、画面表示・保存・将来拡張を見据えて、最低限以下の項目を持つものとする。
- checkId: チェック結果の識別子
- checkName: チェック名
- status: 判定結果（OK / WARN / FAIL など）
- severity: リスクレベル
- message: 判定内容の要約
- checkedAt: チェック実行日時
- resourceId: 対象リソースを識別する値

初期段階ではこの最小構成で開始し、必要に応じてaccountIdやregion、detailなどの項目を追加できる形を目指す。

---

## 13. UI方針

### 13.1 基本方針
- UIは簡易的でわかりやすいことを重視する
- デザイン性よりも視認性・理解しやすさを優先する

### 13.2 初期画面で表示したい内容
- チェック実行ボタン
- 最終実行日時
- 最新結果一覧
- リスクレベル
- 必要に応じて履歴一覧

### 13.3 フロント方針
- 初期はS3静的ホスティング上のシンプルな画面でよい
- 複雑なSPAやフレームワークは初期段階では不要

---

## 14. GitHub公開方針

### 14.1 公開前提
- セルフホスト型であることをREADMEに明記する
- セットアップ手順をREADMEに記載する
- 何が実装済みで何が未実装かを明記する
- 環境依存値はconfigへ分離する

### 14.2 公開時に守ること
- secretsを含めない
- 個人情報や固有情報を含めない
- 利用者が自分のAWSアカウントにデプロイできる形を意識する

---

## 15. 将来拡張方針

### 15.1 機能面
- EventBridgeによる定期実行
- SNS通知
- 差分比較
- APIGateway追加
- チェック項目の拡張

### 15.2 提供面
- 将来的に需要が見えた場合、SaaS型への拡張余地を残す
- ただし初期段階ではSaaS化を前提にしない

### 15.3 マネタイズ面
- マネタイズを前提にしない
- 利用者増加により運用コストが増えた場合に限り検討する
- 将来的には定期実行・差分比較・履歴保持などが有料機能候補になりうる

---

## 16. 2026-03-28現時点の確定事項

現時点での確定事項は以下とする。

- プロジェクト名は AWS Security & Operations Checker
- 提供方式はセルフホスト型
- 最優先はコスト
- 当面の月額目標は5,000円以内
- 初期は1AWSアカウント運用
- env/region/accountIdなどは最初からパラメータ化する
- 作成できるものは可能な限りIaC化する
- CI/CD化できるものは可能な限りCI/CD化する
- 手動変更は原則しない
- Gitを主要な変更履歴の正とする
- Phase 1はapp本体
- Phase 2はCI/CD基盤
- Phase 3は拡張機能
- CDKはTypeScript
- LambdaはPython
- フロントは素のHTML/JS/CSS
- Lambdaは1関数で始め、中はchecks/分割前提
- ディレクトリは必要時に増やす
- 最終構成は事前に意識する
