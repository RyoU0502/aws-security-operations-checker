# TypeScript No-Emit and Jest Module Resolution Validation

## Summary

TypeScript compilation previously emitted JavaScript and declaration files next to the source files. Jest's default module extension order prefers JavaScript over TypeScript, so an extensionless import could load a stale JavaScript file instead of the current TypeScript source. This could cause CDK assertion tests to produce false-positive or false-negative results.

The test previously avoided this behavior by explicitly requiring a `.ts` file. This validation records the replacement of that local workaround with project-level compiler and Jest configuration.

A follow-up validation found that `ts-jest` reported TS151002 during a cache-free test run because the project uses `NodeNext` while `isolatedModules` is not enabled. A normal cached Jest run did not always show the warning because Jest reused its transform cache. The project-level `NodeNext` settings remain unchanged, while the Jest transform now uses an explicit Jest-only `CommonJS` and `Node10` configuration.

## Scope

The implementation changed only:

- `infra/tsconfig.json`
- `infra/jest.config.js`
- `infra/test/infra.test.ts`

This validation record is the only additional documentation file. No application infrastructure logic, Lambda source, dependency declaration, lockfile, CDK application command, README content, or existing test record was changed.

The TS151002 follow-up changed only:

- `infra/jest.config.js`
- `docs/test-records/2026-08-02-typescript-noemit-jest-resolution.md`

## Changes

- Added `noEmit: true` to `infra/tsconfig.json` so `npm run build` performs TypeScript type checking without writing compiler output.
- Removed the now-unnecessary `declaration`, `inlineSourceMap`, and `inlineSources` output settings.
- Added `moduleFileExtensions` to the Jest configuration, with TypeScript extensions before JavaScript extensions.
- Replaced the explicit `.ts` `require` workaround in the CDK assertion test with a normal static import.
- Deleted 12 ignored JavaScript and declaration files that had been generated next to files under `infra/bin`, `infra/lib`, and `infra/test`.
- Preserved `ts-node --prefer-ts-exts` in `infra/cdk.json`.
- Did not add an `outDir`.
- Preserved `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `noEmit: true`, and all strict compiler settings in `infra/tsconfig.json`.
- Changed only the Jest transform to pass `module: "CommonJS"` and `moduleResolution: "Node10"` to `ts-jest`.
- Did not enable `isolatedModules`. In `ts-jest`, that setting changes tests from project-based TypeScript checking to isolated-file transpilation.
- Did not suppress TS151002 with `diagnostics.ignoreCodes`; the configuration mismatch was resolved instead.

The previously recorded `infra/package.json` `bin/infra.js` mismatch is no longer present in the package configuration, so it is not a remaining item.

## Local Validation

The following checks succeeded:

- `git diff --check`
- `npm run build`
- `npm run test:cdk -- --no-cache`: four Jest/CDK assertion tests passed with zero TS151002 warnings
- `npm test`: four Jest/CDK assertion tests and 29 Python unit tests passed
- `npm audit`: zero vulnerabilities
- `npm audit --omit=dev`: zero vulnerabilities
- Credential-isolated development synthesis
- Credential-isolated production synthesis

Before the Jest-only module configuration was added, the cache-free CDK test reproduced TS151002 with the combination of project-level `NodeNext` and an unset `isolatedModules` option. A normal test run did not always display it because Jest could reuse previously transformed files. After the change, the cache-free test completed without TS151002 or any other `ts-jest` warning.

After build, test, and synthesis, no TypeScript-generated `.js`, `.d.ts`, or `.js.map` file existed in the source and test directories. `infra/jest.config.js` remained because it is a configuration source file rather than compiler output.

The synthesis output was written outside the repository for comparison. The CDK application contains no AWS context lookup constructs. AWS profile, environment credential, container credential, shared configuration, and instance metadata credential sources were disabled for both syntheses. No authentication, AWS API call, deployment, or resource operation was required or performed.

## Template and Asset Validation

Development and production templates were synthesized before and after the change and compared directly.

- The development template remained byte-for-byte unchanged at 11 resources.
- The production template remained byte-for-byte unchanged at 7 resources.
- No resource was added, removed, or replaced.
- IAM resources, policies, and actions were unchanged.
- Checker Lambda runtime, handler, memory, timeout, environment configuration, and execution role were unchanged.
- The Checker Lambda asset reference was unchanged in both environments.
- Development and production asset manifests were byte-for-byte unchanged.

No environment-specific identifier, local absolute path, or actual asset hash is recorded here.

## Security and Cost

The no-emit and module-extension changes prevent stale generated JavaScript from taking precedence over current TypeScript during Jest module resolution. The follow-up configuration also lets Jest use an appropriate CommonJS transform without weakening `ts-jest` diagnostics or changing the project's `NodeNext` compilation. This improves confidence that CDK assertion tests evaluate the intended infrastructure source.

No IAM permission, public-access control, encryption setting, retention behavior, resource policy, or other AWS security configuration changed. No AWS resource was created, updated, or deleted. The change introduces no deployment or ongoing cost.

## Remaining Items

No remaining item is known within the TypeScript no-emit, Jest resolution, or TS151002 scope covered by this record.

## Result

Validation succeeded. TypeScript build output is disabled, Jest resolves TypeScript before JavaScript, the CDK assertion test uses a normal static import, and the previous source-adjacent compiler output was removed. The project retains `NodeNext`, while the Jest transform uses `CommonJS` and `Node10` without enabling isolated transpilation or hiding diagnostics. Build, tests, audits, and credential-isolated syntheses succeeded without changing the synthesized infrastructure, IAM, asset manifests, or Checker Lambda asset. No AWS operation or deployment is needed for this test-only configuration change.
