# Write-Ahead Intent: AWS Account Setup and IAM Configuration

## 🎯 Intent
Establish a secure, compliant AWS environment for the MoMo Merchant Companion App with proper IAM governance and cost management controls.

## 📋 Rationale
AWS infrastructure is critical for the application's backend services, database, and deployment pipeline. Proper account setup ensures security compliance, cost control, and operational reliability. This foundation must be established before any infrastructure-as-code work can proceed.

## 🎯 Expected Outcome
- ✅ AWS account provisioned with proper billing and security settings
- ✅ IAM users and roles configured with least-privilege access
- ✅ MFA enabled for all accounts
- ✅ Cost monitoring and alerting configured
- ✅ Initial VPC and security groups created
- ✅ CI/CD integration credentials prepared

## 🔍 Alternatives Considered

### Option 1: Use Existing AWS Account
- **Pros**: Faster setup, existing infrastructure
- **Cons**: Security risks, compliance concerns, cost allocation issues
- **Decision**: Rejected - Need clean, dedicated environment for compliance

### Option 2: Start with Free Tier Only
- **Pros**: Zero initial cost, gradual scaling
- **Cons**: Limited resources, service restrictions, migration complexity
- **Decision**: Rejected - Need full AWS ecosystem for production requirements

### Option 3: Multi-Account Strategy from Day One
- **Pros**: Better security isolation, cost allocation, compliance
- **Cons**: Higher complexity, additional management overhead
- **Decision**: Considered but deferred - Start with single account, plan for multi-account later

## 📝 Implementation Approach

### Phase 1: Account Provisioning
1. Create dedicated AWS account for MoMo Merchant App
2. Configure billing alerts and budgets ($500/month initial limit)
3. Enable AWS Organizations for future multi-account setup
4. Set up consolidated billing if using existing organization

### Phase 2: Security Foundation
1. Enable AWS CloudTrail for audit logging
2. Configure AWS Config for compliance monitoring
3. Set up AWS Security Hub for security posture
4. Enable GuardDuty for threat detection

### Phase 3: IAM Setup
1. Create IAM groups (Admin, Developer, ReadOnly)
2. Configure IAM policies with least-privilege principle
3. Set up MFA for all IAM users
4. Create CI/CD service roles with minimal permissions

### Phase 4: Network Foundation
1. Create initial VPC with public/private subnets
2. Configure security groups for different service tiers
3. Set up VPC endpoints for AWS services
4. Configure network ACLs and routing

### Phase 5: Cost Management
1. Set up Cost Allocation Tags
2. Configure AWS Budgets with alerts
3. Enable Cost Explorer and detailed billing
4. Set up cost anomaly detection

## ⚠️ Risks & Mitigations

### Risk: Cost Overruns
- **Mitigation**: Budget alerts, cost allocation tags, regular monitoring
- **Contingency**: Automated shutdown scripts for unused resources

### Risk: Security Misconfiguration
- **Mitigation**: Least-privilege IAM, automated security scanning
- **Contingency**: Regular security audits, automated remediation

### Risk: Compliance Violations
- **Mitigation**: Enable AWS Config rules, regular compliance checks
- **Contingency**: Automated compliance reporting, audit trails

## 📊 Success Criteria
- [ ] AWS account active with proper billing setup
- [ ] IAM users created with MFA enabled
- [ ] Basic VPC and security groups configured
- [ ] Cost monitoring and alerting active
- [ ] CI/CD integration credentials prepared
- [ ] Security baseline established

## ⏱️ Timeline
- **Week 1**: Account provisioning and basic setup
- **Week 2**: IAM configuration and security setup
- **Week 3**: Network foundation and cost management
- **Week 4**: Testing and documentation

## 📚 Dependencies
- None - This is a foundational task

## 🔗 Related Documents
- [AWS Security Best Practices](../Resources/R-Security-Standards.md)
- [Infrastructure Standards](../Areas/A-Infrastructure-Management.md)
- [Cost Management Guidelines](../Areas/A-Infrastructure-Management.md)

---

**WAI Status**: Active
**Created**: September 2025
**Owner**: DevOps Engineer
**Review Date**: Monthly