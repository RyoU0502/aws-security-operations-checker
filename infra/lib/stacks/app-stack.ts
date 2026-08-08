import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import type { EnvironmentName } from '../config/environment';

export interface AppConfig {
  projectName: string;
  envName: EnvironmentName;
  region: string;
  accountId: string;
}

export interface AppStackProps extends cdk.StackProps {
  appConfig: AppConfig;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const envName = props.appConfig.envName;
    const isDev = envName === 'dev';

    const resultsTableName = `aso-checker-results-${envName}-${props.appConfig.accountId}-${props.appConfig.region}`;

    const resultsTable = new dynamodb.Table(this, 'ResultsTable', {
      tableName: resultsTableName,

      partitionKey: {
        name: 'resultId',
        type: dynamodb.AttributeType.STRING,
      },

      // PAY_PER_REQUEST avoids capacity planning while MVP traffic is uncertain.
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,

      // Dev data is disposable; production data is retained against accidental loss.
      removalPolicy: isDev
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
    });

    const checkerFunctionName = `aso-checker-runner-${envName}`;

    const checkerLogGroup = new logs.LogGroup(this, 'CheckerFunctionLogGroup', {
      logGroupName: `/aws/lambda/${checkerFunctionName}`,

      // Shorter dev retention limits cost; production keeps more investigation history.
      retention: isDev
        ? logs.RetentionDays.ONE_WEEK
        : logs.RetentionDays.ONE_MONTH,

      // Dev logs are disposable; production logs are retained for investigations.
      removalPolicy: isDev
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
    });

    const checkerRole = new iam.Role(this, 'CheckerFunctionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        CheckerPermissions: new iam.PolicyDocument({
          statements: [
            // Limit log writes to the checker's dedicated log group.
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: [checkerLogGroup.logGroupArn],
            }),
            // Restrict result writes to PutItem on this table's ARN.
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['dynamodb:PutItem'],
              resources: [resultsTable.tableArn],
            }),
            // This account-level S3 API requires Resource "*".
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetAccountPublicAccessBlock'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    const checkerFunction = new lambda.Function(this, 'CheckerFunction', {
      functionName: checkerFunctionName,
      runtime: lambda.Runtime.PYTHON_3_12,

      handler: 'index.handler',

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

      environment: {
        RESULTS_TABLE_NAME: resultsTable.tableName,
        ENV_NAME: envName,
        CHECK_TARGET_ACCOUNT_ID: cdk.Stack.of(this).account,
      },

      // Lightweight AWS API checks use a bounded 30-second, 128 MB budget.
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,

      logGroup: checkerLogGroup,

      role: checkerRole,
    });

    checkerFunction.node.addDependency(checkerLogGroup);

    new cdk.CfnOutput(this, 'ProjectName', {
      value: props.appConfig.projectName,
    });

    new cdk.CfnOutput(this, 'EnvironmentName', {
      value: props.appConfig.envName,
    });

    new cdk.CfnOutput(this, 'ResultsTableName', {
      value: resultsTable.tableName,
    });

    new cdk.CfnOutput(this, 'CheckerFunctionName', {
      value: checkerFunction.functionName,
    });
  }
}
