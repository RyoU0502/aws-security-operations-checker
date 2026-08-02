# Relationship to AWS Security and Governance Services

## Purpose

This document explains how AWS Security & Operations Checker relates to selected AWS security, configuration, vulnerability-management, advisory, and governance services. It compares intended use and responsibility boundaries, not which option is universally better.

This project is not a replacement for AWS Config, AWS Security Hub CSPM,
Amazon Inspector, AWS Trusted Advisor, or AWS Control Tower.

## Project position

AWS Security & Operations Checker is a lightweight, self-hosted, and extensible learning project for small environments and focused custom configuration checks. Its implementation is intentionally visible: users can review the Checker contract, explicit registry, sequential runner, result validation, persistence path, tests, and least-privilege IAM permissions.

The current deployment runs in one AWS account. A user manually invokes one Lambda function, which runs explicitly registered Checkers in registry order. Results use `PASS`, `FAIL`, or `ERROR`, and one schema-version-2 DynamoDB item is written for each completed run. The only current standard Checker evaluates the account-level Amazon S3 Block Public Access configuration. CloudWatch Logs receives Lambda platform and application logs.

Users own deployment, invocation, Checker development, IAM review, testing, result retention, and operations. The project currently has no UI, API Gateway endpoint, EventBridge schedule, CI/CD pipeline, multi-account execution, automatic remediation, AWS Config-style configuration history, managed security standards, or managed control catalog.

## At-a-glance comparison

The comparison is split into two tables for readability. "Not provided" describes this project's current implementation or indicates that a capability is outside a service's primary purpose; it does not imply that the compared service lacks all related integrations.

| Comparison area | This project | AWS Config | AWS Security Hub CSPM |
|---|---|---|---|
| Primary purpose | Understandable, self-hosted execution of focused custom configuration Checkers | Record resource configurations and relationships, retain configuration history, and evaluate compliance | Assess security posture against standards and controls and consolidate security findings |
| Evaluation target | Currently the account-level S3 Block Public Access configuration | Supported AWS resource configurations and relationships | Security controls plus findings from integrated AWS services and supported products |
| Execution model | Manual Lambda invocation; explicit registry; sequential Checker execution | Records configuration changes; Config Rules evaluate on changes or periodically, depending on the rule | Runs continuous security checks and ingests findings from supported integrations |
| Configuration history | Not provided; stores completed check runs, not resource configuration history | Records configuration items and changes over time | Not an AWS Config-style configuration-history service; most controls use AWS Config service-linked rules |
| Continuous monitoring | Not provided; no schedule is configured | Supports ongoing recording and rule evaluation | Provides continuous security checks and posture monitoring after enablement |
| Managed checks or standards | One repository-provided Checker; no managed catalog or standards | Managed Rules are available | Managed security standards and controls, including AWS Foundational Security Best Practices |
| Custom checks | Users add Python Checkers, explicit registration, IAM, and tests | Custom Rules are available | Integrates findings and provides standards and controls; it is not this project's user-owned Checker registry |
| Finding or result model | `PASS`, `FAIL`, or `ERROR`; one schema-version-2 DynamoDB item per completed run | Configuration items and rule compliance evaluations | Findings normalized in AWS Security Finding Format (ASFF), including control and integration findings |
| Multi-account support | Not provided; current execution is single-account | Aggregates configuration and compliance data across accounts and Regions | Supports cross-account finding consolidation and AWS Organizations central configuration |
| Remediation or automation | Not provided | Manual or automatic remediation with Systems Manager Automation documents | Automation Rules update or suppress findings; EventBridge can initiate responses |
| Operational responsibility | User deploys and operates the stack and owns code, IAM, invocation, data, and logs | AWS operates the service; the customer configures recording, rules, delivery, aggregation, and remediation | AWS operates the service; the customer configures standards, accounts, Regions, integrations, and response workflows |
| Best-fit use case | Learning and narrowly scoped, explicit custom validation in a small self-hosted workflow | Continuous configuration inventory, history, and compliance evaluation | Organization-wide security posture management and centralized findings |

| Comparison area | This project | Amazon Inspector | AWS Trusted Advisor | AWS Control Tower |
|---|---|---|---|---|
| Primary purpose | Understandable, self-hosted execution of focused custom configuration Checkers | Vulnerability management | Recommendations based on AWS best practices | Set up and govern a multi-account AWS environment |
| Evaluation target | Currently the account-level S3 Block Public Access configuration | EC2 instances, ECR container images, and Lambda functions | AWS environments across areas such as cost, performance, availability, and security | Landing zones, accounts, organizational units, and governance controls |
| Execution model | Manual Lambda invocation; explicit registry; sequential Checker execution | Automatically discovers eligible workloads and continually scans them | AWS-provided checks and recommendations; access and refresh behavior can depend on current support conditions | Orchestrates account setup, enrollment, controls, and ongoing governance |
| Configuration history | Not provided; stores completed check runs | Not a general AWS resource configuration-history service | Not a general AWS resource configuration-history service | Not an AWS Config-style configuration-history service |
| Continuous monitoring | Not provided; no schedule is configured | Continually scans eligible workloads and rescans when relevant changes occur | Available checks and update capabilities can depend on current support conditions | Provides ongoing governance and oversight of the landing zone |
| Managed checks or standards | One repository-provided Checker; no managed catalog or standards | AWS-managed vulnerability and network-exposure detection | AWS-maintained best-practice checks | AWS Control Tower controls for multi-account governance |
| Custom checks | Users add Python Checkers, explicit registration, IAM, and tests | Not a general custom configuration-check framework | Different from a user-owned code extension model | Supports governance customization, but not this project's per-run Checker model |
| Finding or result model | `PASS`, `FAIL`, or `ERROR`; one schema-version-2 DynamoDB item per completed run | Vulnerability and unintended network-exposure findings | Best-practice recommendations and check results | Control status and governance views across accounts and organizational units |
| Multi-account support | Not provided; current execution is single-account | Supports central management through AWS Organizations | Capabilities and availability should be verified against current support conditions | Designed for multi-account environments using AWS Organizations and related services |
| Remediation or automation | Not provided | Findings include remediation guidance; it is not a general configuration-remediation engine | Provides recommendations rather than this project's Checker execution model | Applies governance controls and supports standardized account provisioning; it is not a single-Checker remediation workflow |
| Operational responsibility | User deploys and operates the stack and owns code, IAM, invocation, data, and logs | AWS operates scanning; the customer enables coverage and manages findings and remediation | AWS maintains checks; the customer reviews availability and acts on recommendations | AWS orchestrates supported services; the customer designs and operates the landing zone, organization, controls, and accounts |
| Best-fit use case | Learning and narrowly scoped, explicit custom validation in a small self-hosted workflow | Continuous workload vulnerability and network-exposure assessment | Broad AWS best-practice guidance | Landing-zone setup, account provisioning, and organization-level governance |

## AWS Config

AWS Config records supported AWS resource configurations, their relationships, and how those configurations change over time. Config Rules evaluate desired configuration. Depending on the rule, evaluation can occur when configuration changes or on a periodic schedule, and both managed and custom rules are available.

AWS Config aggregators provide a read-only view of configuration and compliance data across multiple accounts and Regions, including AWS Organizations sources when configured. Noncompliant resources evaluated by Config Rules can be associated with Systems Manager Automation documents for manual or automatic remediation.

This project does not maintain an equivalent resource inventory or configuration history. It also has no managed-rule catalog, multi-account or multi-Region aggregation, continuous recorder, scheduled evaluation, or remediation workflow. A completed run records only the current Checker results in one DynamoDB item. Consider AWS Config when continuous configuration auditing, historical change analysis, resource relationships, managed rules, aggregation, or Config-based remediation is required.

## AWS Security Hub CSPM

AWS Security Hub CSPM evaluates security posture through standards and controls, including AWS Foundational Security Best Practices. It also receives findings from supported AWS services and third-party products, normalizes findings in AWS Security Finding Format (ASFF), and provides a consolidated security posture view.

In an AWS Organizations environment, a delegated administrator can use central configuration to manage Security Hub CSPM, standards, and controls across accounts, organizational units, and linked Regions. Automation Rules can update or suppress findings, and EventBridge rules can initiate responses to selected findings. Most Security Hub CSPM controls use service-linked AWS Config rules and require the relevant resources to be recorded by AWS Config.

This project is not a finding aggregation platform. It does not produce ASFF findings, receive findings from integrations, provide standards or security scores, centrally configure an organization, or send current results to Security Hub CSPM. Security Hub CSPM is the more appropriate service when managed standards, consolidated findings, and security posture management across an organization are required.

## Amazon Inspector

Amazon Inspector is a vulnerability management service. It automatically discovers eligible EC2 instances, ECR container images, and Lambda functions, then continually scans them for software vulnerabilities and unintended network exposure. Detected issues become detailed vulnerability findings.

This differs from the project's current configuration-checking target. The project manually evaluates one account-level S3 setting and does not scan software packages, container images, Lambda code, CVEs, or network reachability. Use Amazon Inspector when continuous vulnerability and supported workload exposure assessment is required.

## AWS Trusted Advisor

AWS Trusted Advisor inspects an AWS environment and provides recommendations based on AWS best practices. Its scope is broader than security alone and includes areas such as cost, performance, and availability. The checks, access methods, and update capabilities available to a customer can depend on current AWS Support conditions, so users should consult the current official documentation rather than rely on support-plan details fixed in this document.

Trusted Advisor's AWS-maintained recommendations serve a different purpose from this project's user-owned code extension model. In this project, a user implements a focused Checker, explicitly registers it, grants its exact runtime permissions, and maintains its tests and operations.

## AWS Control Tower

AWS Control Tower helps establish and govern a multi-account AWS environment. It orchestrates services including AWS Organizations to create a landing zone, applies preventive, detective, and proactive controls, and provides Account Factory for standardized account provisioning.

This project does not create or govern an AWS organization, provision accounts, establish a landing zone, apply organization-level controls, or monitor organizational units. It is a single-account Checker execution stack, not an account or organization governance foundation. Use AWS Control Tower when landing-zone setup, standardized account provisioning, and multi-account governance are the primary requirements.

## When this project is appropriate

This project may fit a bounded use case such as:

- Learning how a configuration Checker, runner, persistence path, and Lambda handler work.
- Implementing a narrowly scoped custom check whose behavior is explicit in source code.
- Reviewing the direct mapping between AWS API operations and least-privilege IAM permissions.
- Running a small, manually initiated, self-hosted validation workflow in one account.
- Demonstrating design and testing with AWS CDK, Lambda, Python, DynamoDB, S3, CloudWatch Logs, and local test suites.

These examples do not imply that an AWS managed service is unnecessary. Evaluate the required coverage, history, scale, integrations, operations, and assurance before choosing an approach.

## When an AWS managed service is more appropriate

An AWS managed service is generally more appropriate when the requirement includes:

- Resource configuration inventory and history.
- Continuous compliance monitoring or change-triggered evaluation.
- Managed rules, security standards, or a managed control catalog.
- Centralized and normalized security findings.
- Continuous workload vulnerability scanning.
- Multi-account and multi-Region aggregation or organization governance.
- Managed remediation and response workflows.
- Enterprise-scale coverage and operations.

The specific service should be selected by workload and governance requirements rather than by treating these capabilities as interchangeable.

## Coexistence

The project and AWS services can be used together when their responsibilities remain clear. For example:

- AWS Config can retain continuous configuration history and evaluate Config Rules, while this project runs a learning-oriented or narrowly tailored custom Checker.
- AWS Security Hub CSPM can aggregate and normalize security findings, while this project performs a separate, focused validation and retains its own run result.
- Amazon Inspector can manage supported workload vulnerability scanning, while this project evaluates its implemented configuration condition.
- AWS Trusted Advisor can provide AWS-maintained recommendations, while project contributors use this repository to study an explicit code, IAM, and test extension path.
- AWS Control Tower can govern a multi-account landing zone, while a separately deployed instance of this project remains a single-account, manually invoked Checker workflow.

These coexistence examples describe responsibility boundaries. The project does not currently integrate with AWS Config, import from or publish to Security Hub CSPM, consume Inspector findings, consume Trusted Advisor recommendations, or integrate with AWS Control Tower.

## Decision guidance

- Continuous configuration history or relationship tracking required: consider AWS Config.
- Managed security standards and centralized findings required: consider AWS Security Hub CSPM.
- Continuous workload vulnerability scanning required: consider Amazon Inspector.
- Broad AWS best-practice recommendations required: consider AWS Trusted Advisor.
- Landing-zone setup and organization governance required: consider AWS Control Tower.
- A small, explicit, custom learning Checker with user-owned code and operations required: this project may fit.

Requirements can overlap, so more than one service or tool may be appropriate.

## Cost and operations

Do not compare these options using an assumed fixed price. Each AWS service has its own enablement and operational model, and chargeable dimensions may include configuration recording, rule evaluations, retained data, aggregation, processed findings, security checks, or workload scans. Actual usage and charges can depend on Region, number of accounts, resource count, evaluation or scan frequency, data volume, enabled integrations, and other service-specific factors. Review the current official AWS documentation and pricing page for each service before enabling it.

This project can also incur AWS charges. Its current path uses Lambda execution, a DynamoDB on-demand write and retained item data, CloudWatch Logs ingestion and retention, and an S3 Control API request for each run. The stack also provisions an S3 bucket, which can incur storage and request charges even though Checker results are not currently written to it. CDK bootstrap and deployment artifacts can add storage and request usage. This document does not claim that the project costs less than an AWS managed service.

Operational effort also differs. AWS operates the managed-service control plane, while customers still configure service scope, permissions, accounts, Regions, retention, integrations, and response processes. For this project, the user additionally owns the application code, deployment, Checker coverage, manual invocation, IAM review, test maintenance, result storage, and cleanup.

## References

Only AWS official documentation is used for the AWS service descriptions in this document:

### AWS Config

- [How AWS Config Works](https://docs.aws.amazon.com/config/latest/developerguide/how-does-config-work.html)
- [Multi-Account Multi-Region Data Aggregation for AWS Config](https://docs.aws.amazon.com/config/latest/developerguide/aggregate-data.html)
- [Remediating Noncompliant Resources with AWS Config](https://docs.aws.amazon.com/config/latest/developerguide/remediation.html)

### AWS Security Hub CSPM

- [Introduction to AWS Security Hub CSPM](https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub.html)
- [Enabling central configuration in Security Hub CSPM](https://docs.aws.amazon.com/securityhub/latest/userguide/start-central-configuration.html)
- [Automatically modifying and acting on findings in Security Hub CSPM](https://docs.aws.amazon.com/securityhub/latest/userguide/automations.html)

### Amazon Inspector

- [What is Amazon Inspector?](https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html)

### AWS Trusted Advisor

- [AWS Trusted Advisor](https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html)

### AWS Control Tower

- [What Is AWS Control Tower?](https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html)
