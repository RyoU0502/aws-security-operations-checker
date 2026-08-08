#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';

import { AppStack } from '../lib/stacks/app-stack';

import { defaultConfig } from '../lib/config/defaults';
import { parseEnvironmentName } from '../lib/config/environment';
import type { EnvironmentName } from '../lib/config/environment';

const app = new cdk.App();

const envName: EnvironmentName = parseEnvironmentName(
  app.node.tryGetContext('env'),
);

new AppStack(app, `AwsSecurityOpsChecker-${envName}`, {
  env: {
    account: defaultConfig.accountId,
    region: defaultConfig.region,
  },

  appConfig: {
    ...defaultConfig,
    envName,
  },
});
