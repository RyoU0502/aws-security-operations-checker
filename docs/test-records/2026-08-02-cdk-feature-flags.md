# CDK Feature Flag Configuration Validation

> **Historical validation record:** This document reflects the implementation at the time of testing and may differ from the current repository state. Its test counts and infrastructure observations are preserved as historical evidence; see [README.md](../../README.md) for the current specification.

## Summary

With `aws-cdk-lib` `2.263.0`, seven feature flags were not explicitly configured, and their unconfigured behavior differed from the recommended values. The CDK Toolkit therefore displayed a feature flag notice during synthesis.

Before publication, all seven flags were set to their recommended values. This makes the intended behavior explicit and reduces the risk of an unexpected default behavior change during a future CDK update.

## Scope

The feature flag configuration changed only `infra/cdk.json`. No application source, Lambda source, test, dependency declaration, lockfile, or existing documentation was changed as part of the configuration update.

The configured flags are:

- `@aws-cdk/core:annotationsInValidationReport`: `true`
- `@aws-cdk/core:validateAgainstDefaultRules`: `true`
- `@aws-cdk/aws-cloudfront:defaultFunctionRuntimeV2_0`: `true`
- `@aws-cdk/aws-elasticloadbalancingv2:usePostQuantumTlsPolicy`: `true`
- `@aws-cdk/aws-batch:defaultToAL2023`: `true`
- `@aws-cdk/aws-eks:defaultToAL2023`: `true`
- `@aws-cdk/core:defaultCrossStackReferences`: `"weak"`

## Phased Validation

### Core flags

`@aws-cdk/core:annotationsInValidationReport` was enabled first. The number of unconfigured feature flag notices decreased from seven to six.

`@aws-cdk/core:validateAgainstDefaultRules` was then enabled. The notice count decreased from six to five. The build, tests, and credential-isolated development and production syntheses succeeded. No default validation rule violation was reported.

### Flags for currently unused services

The CloudFront, Elastic Load Balancing v2, Batch, and EKS flags were enabled together. The notice count decreased from five to one. The build, tests, and credential-isolated development and production syntheses succeeded.

The current stacks do not define CloudFront, Elastic Load Balancing, Batch, or EKS resources. Configuring these flags establishes the behavior to use if those constructs are introduced later; it does not add resources for those services to the current stacks.

### Cross-stack references

`@aws-cdk/core:defaultCrossStackReferences` was set to `"weak"`. The notice count decreased from one to zero. The build, tests, and credential-isolated development and production syntheses succeeded.

No cross-stack reference custom resource, Lambda function, IAM resource, or SSM parameter was added.

## Validation Results

The following checks succeeded:

- `npm run build`
- Four CDK assertion tests
- 29 Python unit tests
- Credential-isolated development synthesis
- Credential-isolated production synthesis
- Default validation rules, with no violation reported
- Validation report inspection, with an empty `pluginReports` array
- Development and production CloudFormation template comparison
- IAM and asset manifest comparison
- Checker Lambda asset content and hash comparison
- Source-tree generated-file inspection

The development and production CloudFormation templates were byte-identical to their baselines. IAM definitions, asset manifests, and the Checker Lambda asset contents and hash were unchanged. No TypeScript-generated `.js`, `.d.ts`, or `.js.map` files were created in the source or test directories.

The final synthesis displayed zero unconfigured feature flag notices. AWS credentials and metadata credential retrieval were disabled, lookups were disabled, and fixed non-production placeholder environment values were used. No AWS lookup, AWS API call, deployment, or AWS resource operation was performed.

The Cloud Assembly `manifest.json` gained `userValue` metadata for the explicitly configured feature flags. This metadata records the selected values and is not a CloudFormation deployment target change.

## Security and Cost

Enabling `@aws-cdk/core:validateAgainstDefaultRules` makes future invalid templates easier to detect during synthesis.

The synthesized IAM permissions, encryption settings, S3 Block Public Access configuration, removal policies, deletion policies, and update-replace policies were unchanged. No AWS resource was added, removed, replaced, or reconfigured.

The feature flag configuration introduces no new ongoing cost. No AWS deployment was required or performed.

## Result

All seven feature flags are explicitly configured with their recommended values. Local build, test, synthesis, validation report, template, IAM, and asset checks succeeded. For the current stacks, the configuration changes CDK validation and default-behavior selection and records the selected values in Cloud Assembly metadata, but produces no CloudFormation, IAM, deletion-policy, asset, or cost difference.
