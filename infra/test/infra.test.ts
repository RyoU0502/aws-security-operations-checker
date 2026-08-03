import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AppStack } from '../lib/stacks/app-stack';

type EnvironmentName = 'dev' | 'prod';

const accountId = '111111111111';
const region = 'ap-northeast-1';
const environments: EnvironmentName[] = ['dev', 'prod'];

function createTemplate(envName: EnvironmentName = 'dev'): Template {
  const app = new cdk.App();

  const stack = new AppStack(app, 'TestStack', {
    env: {
      account: accountId,
      region,
    },
    appConfig: {
      projectName: 'aws-security-operations-checker',
      envName,
      region,
      accountId,
    },
  });

  return Template.fromStack(stack);
}

function getCheckerRoleLogicalId(
  template: Template,
  envName: EnvironmentName = 'dev',
): string {
  const checkerFunctions = Object.values(
    template.findResources('AWS::Lambda::Function', {
      Properties: {
        FunctionName: `aso-checker-runner-${envName}`,
      },
    }),
  );

  expect(checkerFunctions).toHaveLength(1);

  const roleReference = checkerFunctions[0].Properties.Role;
  expect(roleReference).toHaveProperty('Fn::GetAtt');

  const checkerRoleLogicalId = roleReference['Fn::GetAtt'][0];
  expect(typeof checkerRoleLogicalId).toBe('string');

  return checkerRoleLogicalId;
}

test.each(environments)(
  '%s template omits all Results bucket resources and output',
  (envName) => {
    const template = createTemplate(envName);

    template.resourceCountIs('AWS::S3::Bucket', 0);
    template.resourceCountIs('AWS::S3::BucketPolicy', 0);
    template.resourceCountIs('Custom::S3AutoDeleteObjects', 0);

    const resources = template.toJSON().Resources ?? {};
    const outputs = template.toJSON().Outputs ?? {};

    expect(JSON.stringify(resources)).not.toContain('ResultsBucket');
    expect(JSON.stringify(resources)).not.toContain(
      'S3AutoDeleteObjectsCustomResourceProvider',
    );
    expect(outputs).not.toHaveProperty('ResultsBucketName');
  },
);

test.each(environments)(
  '%s template keeps the Checker Lambda, ResultsTable, and Checker log group',
  (envName) => {
    const template = createTemplate(envName);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: `aso-checker-runner-${envName}`,
    });
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName:
        `aso-checker-results-${envName}-${accountId}-${region}`,
    });
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: `/aws/lambda/aso-checker-runner-${envName}`,
    });
  },
);

test.each(environments)(
  '%s Checker Lambda can only put items in ResultsTable',
  (envName) => {
    const template = createTemplate(envName);
    const checkerRoleLogicalId = getCheckerRoleLogicalId(
      template,
      envName,
    );

    const checkerRolePolicies = Object.values(
      template.findResources('AWS::IAM::Policy'),
    ).filter((policy) => {
      const roles = policy.Properties.Roles ?? [];

      return roles.some(
        (role: { Ref?: string }) => role.Ref === checkerRoleLogicalId,
      );
    });

    expect(checkerRolePolicies.length).toBeGreaterThan(0);

    const statements = checkerRolePolicies.flatMap(
      (policy) => policy.Properties.PolicyDocument.Statement,
    );
    const dynamodbStatements = statements.filter((statement) => {
      const actions = Array.isArray(statement.Action)
        ? statement.Action
        : [statement.Action];

      return actions.some(
        (action: unknown) =>
          typeof action === 'string' && action.startsWith('dynamodb:'),
      );
    });

    expect(dynamodbStatements).toHaveLength(1);

    const dynamodbStatement = dynamodbStatements[0];
    const dynamodbActions = Array.isArray(dynamodbStatement.Action)
      ? dynamodbStatement.Action
      : [dynamodbStatement.Action];
    const resources = Array.isArray(dynamodbStatement.Resource)
      ? dynamodbStatement.Resource
      : [dynamodbStatement.Resource];

    expect(dynamodbActions).toEqual(['dynamodb:PutItem']);

    for (const forbiddenAction of [
      'dynamodb:UpdateItem',
      'dynamodb:DeleteItem',
      'dynamodb:BatchWriteItem',
      'dynamodb:*',
    ]) {
      expect(dynamodbActions).not.toContain(forbiddenAction);
    }

    const resultsTables = template.findResources('AWS::DynamoDB::Table', {
      Properties: {
        TableName:
          `aso-checker-results-${envName}-${accountId}-${region}`,
      },
    });
    const resultsTableLogicalIds = Object.keys(resultsTables);

    expect(resultsTableLogicalIds).toHaveLength(1);
    expect(resources).toEqual([
      {
        'Fn::GetAtt': [resultsTableLogicalIds[0], 'Arn'],
      },
    ]);
    expect(JSON.stringify(resources)).not.toContain('/index/*');
  },
);

test('Checker Lambda keeps the CloudWatch Logs basic permissions', () => {
  const template = createTemplate();
  const checkerRoleLogicalId = getCheckerRoleLogicalId(template);
  const roles = template.findResources('AWS::IAM::Role');
  const checkerRole = roles[checkerRoleLogicalId];

  expect(checkerRole).toBeDefined();

  const managedPolicyArns =
    checkerRole.Properties.ManagedPolicyArns ?? [];
  const hasLambdaBasicExecutionPolicy = managedPolicyArns.some(
    (managedPolicyArn: unknown) =>
      JSON.stringify(managedPolicyArn).includes(
        'AWSLambdaBasicExecutionRole',
      ),
  );

  expect(hasLambdaBasicExecutionPolicy).toBe(true);
});

test.each(environments)(
  '%s Checker Lambda can only read the account S3 Public Access Block',
  (envName) => {
    const template = createTemplate(envName);
    const checkerRoleLogicalId = getCheckerRoleLogicalId(
      template,
      envName,
    );

    const checkerRolePolicies = Object.values(
      template.findResources('AWS::IAM::Policy'),
    ).filter((policy) => {
      const roles = policy.Properties.Roles ?? [];

      return roles.some(
        (role: { Ref?: string }) => role.Ref === checkerRoleLogicalId,
      );
    });
    const statements = checkerRolePolicies.flatMap(
      (policy) => policy.Properties.PolicyDocument.Statement,
    );
    const s3Statements = statements.filter((statement) => {
      const actions = Array.isArray(statement.Action)
        ? statement.Action
        : [statement.Action];

      return actions.some(
        (action: unknown) =>
          typeof action === 'string' && action.startsWith('s3:'),
      );
    });

    expect(s3Statements).toHaveLength(1);

    const s3Statement = s3Statements[0];
    const s3Actions = Array.isArray(s3Statement.Action)
      ? s3Statement.Action
      : [s3Statement.Action];
    const s3Resources = Array.isArray(s3Statement.Resource)
      ? s3Statement.Resource
      : [s3Statement.Resource];

    expect(s3Actions).toEqual(['s3:GetAccountPublicAccessBlock']);
    expect(s3Resources).toEqual(['*']);
  },
);

test('Checker Lambda receives the stack account as its check target', () => {
  const template = createTemplate();

  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'aso-checker-runner-dev',
    Environment: {
      Variables: {
        CHECK_TARGET_ACCOUNT_ID: '111111111111',
      },
    },
  });
});
