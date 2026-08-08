const ACCOUNT_ID_PATTERN = /^\d{12}$/;

const ACCOUNT_ID_ERROR = 'AWS account ID must be exactly 12 digits.';
const REGION_ERROR =
  'AWS region must be provided and contain no surrounding whitespace.';

export function parseAccountId(value: string | undefined): string {
  if (value === undefined || !ACCOUNT_ID_PATTERN.test(value)) {
    // Fail closed rather than target an unresolved or malformed account.
    throw new Error(ACCOUNT_ID_ERROR);
  }

  return value;
}

export function parseRegion(value: string | undefined): string {
  if (
    value === undefined ||
    value.length === 0 ||
    value.trim() !== value
  ) {
    // Reject ambiguous configuration instead of silently normalizing it.
    throw new Error(REGION_ERROR);
  }

  return value;
}

export function resolveAccountId(
  explicitAccount: string | undefined,
  cdkDefaultAccount: string | undefined,
): string {
  return parseAccountId(explicitAccount ?? cdkDefaultAccount);
}

export function resolveRegion(
  explicitRegion: string | undefined,
  cdkDefaultRegion: string | undefined,
): string {
  return parseRegion(explicitRegion ?? cdkDefaultRegion);
}
