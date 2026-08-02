# Public Snapshot Local Reproduction Validation

Date: 2026-08-02

## Scope

This validation was performed from a sanitized snapshot containing only the files tracked at the source repository's current HEAD. The snapshot was initialized as a new repository with no imported commit history, commits, or remote.

The validation covers local dependency installation, compilation, tests, dependency audits, and credential-isolated CDK synthesis. It does not cover CDK bootstrap, deployment, live AWS API behavior, runtime invocation, or cleanup in an AWS account.

## Toolchain

| Tool | Version |
| --- | --- |
| Git | 2.25.1 |
| Node.js | 24.14.1 |
| npm | 11.11.0 |
| Python | 3.12.13 |
| AWS CLI | 2.34.19 |
| AWS CDK CLI | 2.1134.0 |

Python 3.12.13 was supplied by an existing pyenv installation through a temporary PATH change scoped to the validation subshell. No repository file or persistent shell configuration was changed to select Python.

The project-local direct dependency versions resolved after `npm ci` were:

| Dependency | Version |
| --- | --- |
| `aws-cdk-lib` | 2.263.0 |
| `constructs` | 10.6.0 |
| `typescript` | 5.9.3 |
| `jest` | 30.3.0 |
| `ts-jest` | 29.4.6 |
| `ts-node` | 10.9.2 |
| `@types/jest` | 30.0.0 |
| `@types/node` | 24.12.0 |

## Local reproduction results

The dependency installation started with `npm ci` and an absent `node_modules` directory.

| Validation | Result |
| --- | --- |
| `npm ci` | Successful; locked dependencies installed and audit reported 0 vulnerabilities |
| `npm run build` | Successful; TypeScript type-check completed without emitted source-adjacent files |
| `npm run test:cdk -- --no-cache` | Successful; 2 suites and 10 tests passed |
| `npm test` | Successful; 10 CDK/Jest tests and 29 Python tests passed |
| ts-jest warning check | No TS151002 or other ts-jest warnings |
| `npm audit` | Successful; 0 vulnerabilities |
| `npm audit --omit=dev` | Successful; 0 vulnerabilities |

The `npm test` process used the pyenv-managed Python 3.12.13 selected in the validation subshell. The package manifest and lockfile remained unchanged. The installation emitted deprecation notices for transitive packages, but both requested audits reported 0 vulnerabilities.

## Credential-isolated synthesis

The final synthesis run used:

- A non-sensitive dummy account value
- Region `ap-northeast-1`
- No AWS profile
- Empty AWS shared credentials and configuration sources
- Disabled EC2 metadata, container credential, and web identity credential paths
- Blocked outbound proxy settings
- Repository-external temporary output directories

The CDK application contains no AWS environment lookup constructs, and the successful isolated synthesis did not require an AWS API call.

| Case | Result |
| --- | --- |
| `env=dev` | Successful; template used the requested region and dummy account value |
| `env=prod` | Successful; template used the requested region and dummy account value |
| Missing `env` | Failed with exit code 1 and the documented environment-context error |
| `env=staging` | Failed with exit code 1 and the documented environment-context error |

The generated cloud assemblies reported no missing context. No `cdk.out` directory was created inside the repository.

## Generated and ignored files

`node_modules` and Python bytecode caches were generated locally and remained excluded by `.gitignore`. CDK synthesis output was written outside the repository. TypeScript `.js`, `.d.ts`, and `.js.map` files were not emitted next to project sources.

No commit, remote, push, AWS login, bootstrap, deployment, live AWS inspection, or Lambda invocation was performed.

## Remaining validation

This record establishes local reproduction only. Reproduction of AWS bootstrap, deployment, live verification, cleanup, and account-specific permission requirements has not yet been performed from the sanitized snapshot.
