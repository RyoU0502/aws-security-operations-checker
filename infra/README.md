# Infrastructure and Checker Lambda

This directory contains the AWS CDK infrastructure application and the Python Checker Lambda implementation for AWS Security & Operations Checker.

Run the local setup and validation commands from this directory:

```bash
npm ci
npm run build
npm test
```

- `npm ci` installs the dependency versions locked in `package-lock.json`.
- `npm run build` uses TypeScript `noEmit` mode to type-check the CDK source without generating JavaScript files.
- `npm test` runs the Jest/CDK tests followed by the Python Lambda tests.

For AWS-facing CDK commands, always select one of the supported logical environments with `-c env=dev` or `-c env=prod`, use an explicit `--profile <AWS_PROFILE>`, and run `cdk ls` first to confirm the target stack. For example:

```bash
npx cdk ls -c env=dev --profile <AWS_PROFILE>
```

See the [repository README](../README.md) for prerequisites, AWS SSO authentication, synthesis, deployment, manual invocation, log verification, environment retention behavior, cost considerations, and cleanup.
