// AppConfig 型を使うために読み込む
import { AppConfig } from '../stacks/app-stack';

// CDK実行時のAWSアカウントIDを環境変数から取得する
//
// CDK_DEFAULT_ACCOUNT:
// cdk deploy / cdk synth 実行時に、CDKが認識しているAWSアカウントID
//
// ここでコードに実アカウントIDを直接書かないことで、
// GitHub上にAWSアカウントIDを公開しないようにする
const accountId = process.env.CDK_DEFAULT_ACCOUNT;

// CDK実行時のリージョンを環境変数から取得する
//
// 取得できない場合は、普段使う東京リージョンをデフォルトにする
const region = process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1';

// accountId が取得できない状態でデプロイすると、
// リソース名が不正になったり意図しない環境へ進む可能性があるため止める
if (!accountId) {
  throw new Error(
    'CDK_DEFAULT_ACCOUNT is not set. Run CDK with an AWS profile, for example: cdk deploy --profile <profile-name>',
  );
}

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
