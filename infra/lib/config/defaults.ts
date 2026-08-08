import type { AppConfig } from '../stacks/app-stack';
import { resolveAccountId, resolveRegion } from './aws-environment';

// Resolve the account at runtime to avoid publishing it in source control.
const accountId = resolveAccountId(
  process.env.TARGET_AWS_ACCOUNT,
  process.env.CDK_DEFAULT_ACCOUNT,
);

const region = resolveRegion(
  process.env.TARGET_AWS_REGION,
  process.env.CDK_DEFAULT_REGION,
);

export const defaultConfig: Omit<AppConfig, 'envName'> = {
  projectName: 'aws-security-operations-checker',
  region,
  accountId,
};
