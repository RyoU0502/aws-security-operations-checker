// CDK本体を読み込む
import * as cdk from 'aws-cdk-lib';

// Lambda を使うためのモジュールを読み込む
// これで lambda.Function のように書ける
import * as lambda from 'aws-cdk-lib/aws-lambda';

// CloudWatch Logs を使うためのモジュールを読み込む
// Lambda のログ保持期間を設定するために使う
import * as logs from 'aws-cdk-lib/aws-logs';

// Node.js の path モジュールを読み込む
// Lambdaコードのディレクトリパスを安全に組み立てるために使う
import * as path from 'path';

// DynamoDB を使うためのモジュールを読み込む
// これで dynamodb.Table のように書ける
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

import * as iam from 'aws-cdk-lib/aws-iam';

// Construct は CDK の部品の親クラスのようなもの
import { Construct } from 'constructs';
import type { EnvironmentName } from '../config/environment';

// AppConfig:
// アプリ設定の「型」を定義している
// TypeScript では interface で「このデータはこういう形です」と決められる
export interface AppConfig {
  projectName: string;
  envName: EnvironmentName;
  region: string;
  accountId: string;
}

// AppStackProps:
// CDK の通常の StackProps に加えて、appConfig を受け取れるようにした型
export interface AppStackProps extends cdk.StackProps {
  appConfig: AppConfig;
}

// AppStack クラスを定義する
// extends cdk.Stack は「CDK の Stack を継承する」という意味
export class AppStack extends cdk.Stack {
  // constructor はクラスが作られるときに最初に呼ばれる処理
  constructor(scope: Construct, id: string, props: AppStackProps) {
    // 親クラス(cdk.Stack)の初期化
    // これを書かないと Stack として正しく動かない
    super(scope, id, props);

    // 今回よく使うので envName を変数に入れておく
    const envName = props.appConfig.envName;

    // dev かどうかを true / false で持っておく
    // === は「値と型が等しいか」を比較する演算子
    // envName が 'dev' のときだけ true になる
    const isDev = envName === 'dev';

    // DynamoDB テーブル名を組み立てる
    // envName / accountId / region を含めて、環境ごとに区別できる名前にする
    const resultsTableName = `aso-checker-results-${envName}-${props.appConfig.accountId}-${props.appConfig.region}`;

    // チェック結果を保存する DynamoDB テーブルを作成する
    const resultsTable = new dynamodb.Table(this, 'ResultsTable', {
      // 実際に AWS 上で使われる DynamoDB テーブル名
      tableName: resultsTableName,

      // パーティションキーを定義する
      // resultId は各チェック結果を一意に識別するIDとして使う想定
      partitionKey: {
        name: 'resultId',
        type: dynamodb.AttributeType.STRING,
      },

      // オンデマンド課金
      // MVP段階ではアクセス量が読みにくいので、使った分だけ課金の PAY_PER_REQUEST が扱いやすい
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,

      // dev は削除しやすく、prod は誤削除を防ぐ
      //
      // ? : は三項演算子
      // isDev が true なら DESTROY
      // isDev が false なら RETAIN
      removalPolicy: isDev
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
    });

    // Lambda 関数名を組み立てる
    // envName を含めて dev / prod を区別できるようにする
    const checkerFunctionName = `aso-checker-runner-${envName}`;

    // Lambda 用の CloudWatch Logs ロググループを作成する
    // Lambda の標準ロググループ名は /aws/lambda/<関数名>
    const checkerLogGroup = new logs.LogGroup(this, 'CheckerFunctionLogGroup', {
      logGroupName: `/aws/lambda/${checkerFunctionName}`,

      // CloudWatch Logs の保持期間
      // ? : は三項演算子
      // isDev が true なら 7日、false なら 30日
      retention: isDev
        ? logs.RetentionDays.ONE_WEEK
        : logs.RetentionDays.ONE_MONTH,

      // dev は削除しやすく、prod は誤削除を防ぐ
      removalPolicy: isDev
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
    });

    const checkerRole = new iam.Role(this, 'CheckerFunctionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        CheckerPermissions: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: [checkerLogGroup.logGroupArn],
            }),
            // Restrict the checker Lambda to PutItem on the results table.
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['dynamodb:PutItem'],
              resources: [resultsTable.tableArn],
            }),
            // Account-level S3 operations do not support resource-level ARNs.
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetAccountPublicAccessBlock'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // チェック処理を実行する Lambda 関数を作成する
    const checkerFunction = new lambda.Function(this, 'CheckerFunction', {

      // 実際に AWS 上で使われる Lambda 関数名
      functionName: checkerFunctionName,
      // Lambda の実行ランタイム
      // 今回は Python 3.12 を使う
      runtime: lambda.Runtime.PYTHON_3_12,

      // Lambda の入口
      // index.py ファイル内の handler 関数を呼び出す
      handler: 'index.handler',

      // Lambda のコード配置場所
      // __dirname は現在の app-stack.ts があるディレクトリを指す
      // ../../lambda/checker で infra/lambda/checker に到達する
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../lambda/checker'),
        {
          exclude: [
            '__pycache__',
            '__pycache__/**',
            '**/__pycache__',
            '**/__pycache__/**',
            '*.pyc',
            '**/*.pyc',
            '*.pyo',
            '**/*.pyo',
          ],
        },
      ),

      // Lambda に渡す環境変数
      // Python 側では os.environ から取得する
      environment: {
        RESULTS_TABLE_NAME: resultsTable.tableName,
        ENV_NAME: envName,
        CHECK_TARGET_ACCOUNT_ID: cdk.Stack.of(this).account,
      },

      // Lambda の最大実行時間
      timeout: cdk.Duration.seconds(30),

      // メモリサイズ
      // MVPの軽い処理なのでまずは128MBで十分
      memorySize: 128,

      // 事前に作成した CloudWatch Logs ロググループを Lambda に紐づける
      logGroup: checkerLogGroup,

      // 必要な権限だけを持つ専用の実行ロールを使う
      role: checkerRole,
    });

    checkerFunction.node.addDependency(checkerLogGroup);

    // CloudFormation の Outputs を作る
    // まずは設定が正しく渡っているかを確認するための出力
    new cdk.CfnOutput(this, 'ProjectName', {
      value: props.appConfig.projectName,
    });

    new cdk.CfnOutput(this, 'EnvironmentName', {
      value: props.appConfig.envName,
    });

    // 作成した DynamoDB テーブル名を出力する
    // synth 時や deploy 後に確認しやすくなる
    new cdk.CfnOutput(this, 'ResultsTableName', {
      value: resultsTable.tableName,
    });

    // 作成した Lambda 関数名を出力する
    // synth 時や deploy 後に確認しやすくなる
    new cdk.CfnOutput(this, 'CheckerFunctionName', {
      value: checkerFunction.functionName,
    });
  }
}
