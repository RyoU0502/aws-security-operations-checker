import { parseEnvironmentName } from '../lib/config/environment';

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
