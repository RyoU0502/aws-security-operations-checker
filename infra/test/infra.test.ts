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

function getCheckerRoleStatements(
  template: Template,
  envName: EnvironmentName = 'dev',
): Record<string, unknown>[] {
  const checkerRoleLogicalId = getCheckerRoleLogicalId(template, envName);
  const roles = template.findResources('AWS::IAM::Role');
  const checkerRole = roles[checkerRoleLogicalId];

  expect(checkerRole).toBeDefined();

  const inlineStatements = (checkerRole.Properties.Policies ?? []).flatMap(
    (policy: { PolicyDocument: { Statement: Record<string, unknown>[] } }) =>
      policy.PolicyDocument.Statement,
  );
  const attachedStatements = Object.values(
    template.findResources('AWS::IAM::Policy'),
  )
    .filter((policy) => {
      const policyRoles = policy.Properties.Roles ?? [];

      return policyRoles.some(
        (role: { Ref?: string }) => role.Ref === checkerRoleLogicalId,
      );
    })
    .flatMap((policy) => policy.Properties.PolicyDocument.Statement);

  return [...inlineStatements, ...attachedStatements];
}

function getActions(statement: Record<string, unknown>): unknown[] {
  return Array.isArray(statement.Action)
    ? statement.Action
    : [statement.Action];
}

function getResources(statement: Record<string, unknown>): unknown[] {
  return Array.isArray(statement.Resource)
    ? statement.Resource
    : [statement.Resource];
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

    const checkerFunctions = template.findResources('AWS::Lambda::Function', {
      Properties: {
        FunctionName: `aso-checker-runner-${envName}`,
      },
    });
    const checkerFunction = Object.values(checkerFunctions)[0];
    const checkerLogGroups = template.findResources('AWS::Logs::LogGroup', {
      Properties: {
        LogGroupName: `/aws/lambda/aso-checker-runner-${envName}`,
      },
    });
    const checkerLogGroupLogicalId = Object.keys(checkerLogGroups)[0];
    const dependencies = Array.isArray(checkerFunction.DependsOn)
      ? checkerFunction.DependsOn
      : [checkerFunction.DependsOn];

    expect(dependencies).toContain(checkerLogGroupLogicalId);
  },
);

test.each(environments)(
  '%s Checker Lambda can only put items in ResultsTable',
  (envName) => {
    const template = createTemplate(envName);
    const statements = getCheckerRoleStatements(template, envName);
    const dynamodbStatements = statements.filter((statement) => {
      const actions = getActions(statement);

      return actions.some(
        (action: unknown) =>
          typeof action === 'string' && action.startsWith('dynamodb:'),
      );
    });

    expect(dynamodbStatements).toHaveLength(1);

    const dynamodbStatement = dynamodbStatements[0];
    const dynamodbActions = getActions(dynamodbStatement);
    const resources = getResources(dynamodbStatement);

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

test.each(environments)(
  '%s Checker Lambda can write only to its dedicated log streams',
  (envName) => {
    const template = createTemplate(envName);
    const checkerRoleLogicalId = getCheckerRoleLogicalId(
      template,
      envName,
    );
    const checkerRole = template.findResources('AWS::IAM::Role')[
      checkerRoleLogicalId
    ];
    const managedPolicyArns = checkerRole.Properties.ManagedPolicyArns ?? [];
    const statements = getCheckerRoleStatements(template, envName);
    const logStatements = statements.filter((statement) =>
      getActions(statement).some(
        (action) =>
          typeof action === 'string' && action.startsWith('logs:'),
      ),
    );
    const allActions = statements.flatMap(getActions);

    expect(JSON.stringify(managedPolicyArns)).not.toContain(
      'AWSLambdaBasicExecutionRole',
    );
    expect(managedPolicyArns).toEqual([]);
    expect(allActions).not.toContain('logs:CreateLogGroup');
    expect(logStatements).toHaveLength(1);
    expect(getActions(logStatements[0])).toEqual([
      'logs:CreateLogStream',
      'logs:PutLogEvents',
    ]);

    const checkerLogGroups = template.findResources(
      'AWS::Logs::LogGroup',
      {
        Properties: {
          LogGroupName: `/aws/lambda/aso-checker-runner-${envName}`,
        },
      },
    );
    const checkerLogGroupLogicalIds = Object.keys(checkerLogGroups);

    expect(checkerLogGroupLogicalIds).toHaveLength(1);
    expect(getResources(logStatements[0])).toEqual([
      {
        'Fn::GetAtt': [checkerLogGroupLogicalIds[0], 'Arn'],
      },
    ]);
    expect(getResources(logStatements[0])).not.toContain('*');
  },
);

test.each(environments)(
  '%s Checker Lambda can only read the account S3 Public Access Block',
  (envName) => {
    const template = createTemplate(envName);
    const statements = getCheckerRoleStatements(template, envName);
    const s3Statements = statements.filter((statement) => {
      const actions = getActions(statement);

      return actions.some(
        (action: unknown) =>
          typeof action === 'string' && action.startsWith('s3:'),
      );
    });

    expect(s3Statements).toHaveLength(1);

    const s3Statement = s3Statements[0];
    const s3Actions = getActions(s3Statement);
    const s3Resources = getResources(s3Statement);

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
