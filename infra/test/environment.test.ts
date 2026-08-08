import {
  parseAccountId,
  parseRegion,
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

const accountError = 'CDK_DEFAULT_ACCOUNT must be exactly 12 digits.';

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
  'CDK_DEFAULT_REGION must be non-empty and contain no surrounding whitespace.';

test('defaults an undefined region to ap-northeast-1', () => {
  expect(parseRegion(undefined)).toBe('ap-northeast-1');
});

test.each(['ap-northeast-1', 'us-west-2'])(
  'preserves the valid region %s',
  (region) => {
    expect(parseRegion(region)).toBe(region);
  },
);

test.each([
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
