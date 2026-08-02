export type EnvironmentName = 'dev' | 'prod';

const ENVIRONMENT_CONTEXT_ERROR =
  'CDK context "env" is required and must be either "dev" or "prod". Example: -c env=dev';

export function parseEnvironmentName(value: unknown): EnvironmentName {
  if (value === 'dev' || value === 'prod') {
    return value;
  }

  throw new Error(ENVIRONMENT_CONTEXT_ERROR);
}
