#!/usr/bin/env node

// aws-cdk-lib を cdk という名前でまとめて使う
// 例: cdk.App, cdk.Stack, cdk.CfnOutput など
import * as cdk from 'aws-cdk-lib';

// 自分で作るスタック定義を読み込む
import { AppStack } from '../lib/stacks/app-stack';

// 共通設定を読み込む
import { defaultConfig } from '../lib/config/defaults';
import { parseEnvironmentName } from '../lib/config/environment';
import type { EnvironmentName } from '../lib/config/environment';

// CDKアプリ全体の起点を作る
// ここから stack をぶら下げていく
const app = new cdk.App();

// context から env を取得する
// 例:
//   npx cdk synth -c env=dev
//   npx cdk synth -c env=prod
//
// env は必須で、dev / prod 以外ならスタックを作る前に停止する
const envName: EnvironmentName = parseEnvironmentName(
  app.node.tryGetContext('env'),
);

// 実際に CDK のスタックを1つ作る
new AppStack(app, `AwsSecurityOpsChecker-${envName}`, {
  // この Stack をどの AWS アカウント / リージョンに紐づけるか
  env: {
    account: defaultConfig.accountId,
    region: defaultConfig.region,
  },

  // 自分で定義したアプリ用設定
  // ... はオブジェクトの展開
  // 共通設定 + envName をまとめている
  appConfig: {
    ...defaultConfig,
    envName,
  },
});
