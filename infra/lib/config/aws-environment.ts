const ACCOUNT_ID_PATTERN = /^\d{12}$/;
const DEFAULT_REGION = 'ap-northeast-1';

export function parseAccountId(value: string | undefined): string {
  if (value === undefined || !ACCOUNT_ID_PATTERN.test(value)) {
    throw new Error('CDK_DEFAULT_ACCOUNT must be exactly 12 digits.');
  }

  return value;
}

export function parseRegion(value: string | undefined): string {
  if (value === undefined) {
    return DEFAULT_REGION;
  }

  if (value.length === 0 || value.trim() !== value) {
    throw new Error(
      'CDK_DEFAULT_REGION must be non-empty and contain no surrounding whitespace.',
    );
  }

  return value;
}
