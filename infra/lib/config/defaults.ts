import type { AppConfig } from '../stacks/app-stack';
import { parseAccountId, parseRegion } from './aws-environment';

// Resolve the account at runtime to avoid publishing it in source control.
const accountId = parseAccountId(process.env.CDK_DEFAULT_ACCOUNT);

const region = parseRegion(process.env.CDK_DEFAULT_REGION);

export const defaultConfig: Omit<AppConfig, 'envName'> = {
  projectName: 'aws-security-operations-checker',
  region,
  accountId,
};
