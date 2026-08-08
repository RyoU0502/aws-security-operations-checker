import {
  parseAccountId,
  parseRegion,
  resolveAccountId,
  resolveRegion,
} from '../lib/config/aws-environment';
import { parseEnvironmentName } from '../lib/config/environment';

function getErrorMessage(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }

    throw error;
  }

  throw new Error('Expected the action to throw an error.');
}

const expectedError =
  'CDK context "env" is required and must be either "dev" or "prod". Example: -c env=dev';

test('accepts dev', () => {
  expect(parseEnvironmentName('dev')).toBe('dev');
});

test('accepts prod', () => {
  expect(parseEnvironmentName('prod')).toBe('prod');
});

test.each([
  ['undefined', undefined],
  ['an empty string', ''],
  ['staging', 'staging'],
  ['uppercase DEV', 'DEV'],
])('rejects %s', (_description, value) => {
  expect(() => parseEnvironmentName(value)).toThrow(expectedError);
});

const accountError = 'AWS account ID must be exactly 12 digits.';

test('accepts a 12-digit account ID', () => {
  expect(parseAccountId('111111111111')).toBe('111111111111');
});

test.each([
  ['undefined', undefined],
  ['an empty string', ''],
  ['whitespace only', '   '],
  ['11 digits', '11111111111'],
  ['13 digits', '1111111111111'],
  ['letters', '11111111111A'],
  ['symbols', '11111111111-'],
  ['leading whitespace', ' 111111111111'],
  ['trailing whitespace', '111111111111 '],
])('rejects an account ID with %s', (_description, value) => {
  expect(() => parseAccountId(value)).toThrow(accountError);
});

test('does not include the rejected account ID in its error', () => {
  const rejectedValue = '11111111111A';
  const errorMessage = getErrorMessage(() => parseAccountId(rejectedValue));

  expect(errorMessage).toBe(accountError);
  expect(errorMessage).not.toContain(rejectedValue);
});

const regionError =
  'AWS region must be provided and contain no surrounding whitespace.';

test.each(['ap-northeast-1', 'us-west-2'])(
  'preserves the valid region %s',
  (region) => {
    expect(parseRegion(region)).toBe(region);
  },
);

test.each([
  ['undefined', undefined],
  ['an empty string', ''],
  ['whitespace only', '   '],
  ['leading whitespace', ' ap-northeast-1'],
  ['trailing whitespace', 'ap-northeast-1 '],
])('rejects a region with %s', (_description, value) => {
  expect(() => parseRegion(value)).toThrow(regionError);
});

test('does not include the rejected region in its error', () => {
  const rejectedValue = ' ap-northeast-1';
  const errorMessage = getErrorMessage(() => parseRegion(rejectedValue));

  expect(errorMessage).toBe(regionError);
  expect(errorMessage).not.toContain(rejectedValue);
});

test('explicit account override wins over the CDK default', () => {
  expect(resolveAccountId('111111111111', '222222222222')).toBe(
    '111111111111',
  );
});

test('explicit region override wins over the CDK default', () => {
  expect(resolveRegion('ap-northeast-1', 'us-east-1')).toBe(
    'ap-northeast-1',
  );
});

test('uses the CDK default account when the explicit override is missing', () => {
  expect(resolveAccountId(undefined, '222222222222')).toBe('222222222222');
});

test('uses the CDK default region when the explicit override is missing', () => {
  expect(resolveRegion(undefined, 'us-east-1')).toBe('us-east-1');
});

test.each([
  ['an empty string', ''],
  ['an invalid value', 'invalid'],
])(
  'does not fall back from explicit account override with %s',
  (_description, explicitAccount) => {
    expect(() =>
      resolveAccountId(explicitAccount, '222222222222'),
    ).toThrow(accountError);
  },
);

test.each([
  ['an empty string', ''],
  ['surrounding whitespace', ' ap-northeast-1 '],
])(
  'does not fall back from explicit region override with %s',
  (_description, explicitRegion) => {
    expect(() => resolveRegion(explicitRegion, 'us-east-1')).toThrow(
      regionError,
    );
  },
);

test('rejects a missing explicit and CDK default account', () => {
  expect(() => resolveAccountId(undefined, undefined)).toThrow(accountError);
});

test('rejects a missing explicit and CDK default region', () => {
  expect(() => resolveRegion(undefined, undefined)).toThrow(regionError);
});
