// AppConfig 型を使うために読み込む
import type { AppConfig } from '../stacks/app-stack';
import { parseAccountId, parseRegion } from './aws-environment';

// CDK実行時のAWSアカウントIDを環境変数から取得する
//
// CDK_DEFAULT_ACCOUNT:
// cdk deploy / cdk synth 実行時に、CDKが認識しているAWSアカウントID
//
// ここでコードに実アカウントIDを直接書かないことで、
// GitHub上にAWSアカウントIDを公開しないようにする
const accountId = parseAccountId(process.env.CDK_DEFAULT_ACCOUNT);

// CDK実行時のリージョンを環境変数から取得する
//
// 取得できない場合は、普段使う東京リージョンをデフォルトにする
const region = parseRegion(process.env.CDK_DEFAULT_REGION);

// defaultConfig:
// 共通設定をまとめた定数
//
// Omit<AppConfig, 'envName'> は
// 「AppConfig の形を使うけど envName だけ除外する」
// という意味
//
// envName は app.ts 側で dev / prod を決めるので、ここではまだ持たせない
export const defaultConfig: Omit<AppConfig, 'envName'> = {
  projectName: 'aws-security-operations-checker',
  region,
  accountId,
};
