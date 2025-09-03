# Write-Ahead Intent: Infrastructure Change - [Change Description]

## Intent
[Clear description of the infrastructure change. What systems, services, or resources are being modified?]

## Current Infrastructure
[Description of the current infrastructure setup in the affected area.]

## Proposed Infrastructure
[Description of the proposed infrastructure after the change.]

## Rationale
[Why is this infrastructure change necessary? What problems does it solve?]

## Expected Outcome
[Specific infrastructure outcomes. Include reliability, scalability, cost, or performance improvements.]

## Impact Assessment

### Affected Systems
- [ ] Application servers
- [ ] Database systems
- [ ] Caching layers
- [ ] Load balancers
- [ ] CDN configuration
- [ ] Monitoring systems
- [ ] Backup systems

### Downtime Requirements
- [ ] Zero-downtime deployment possible
- [ ] Maintenance window required
- [ ] Service degradation acceptable
- [ ] Full service interruption required

### Rollback Complexity
- [ ] Simple rollback (configuration change)
- [ ] Moderate rollback (service restart required)
- [ ] Complex rollback (data migration required)
- [ ] High-risk rollback (potential data loss)

## Implementation Plan
[Step-by-step deployment plan with rollback points.]

## Testing Strategy
[Infrastructure testing including load testing, failover testing, and performance validation.]

## Monitoring Changes
[What monitoring needs to be added or modified for the new infrastructure.]

## Cost Impact
[Expected cost changes including upfront costs and ongoing operational costs.]

## Security Impact
[Security implications of the infrastructure change.]

## Compliance Impact
[Impact on compliance requirements and audit trails.]

## Rollback Plan
[Detailed rollback procedure with timeline and responsible parties.]

## Success Metrics
[Infrastructure metrics to monitor post-deployment.]

## Timeline
[Deployment timeline with milestones and coordination requirements.]

## Communication Plan
[How will this infrastructure change be communicated to stakeholders.]

---

**Change Window**: [Date/Time - Duration]
**Rollback Window**: [Duration after deployment]
**Monitoring Period**: [Duration for post-deployment monitoring]

**WAI Created By**: [Your Name]
**Date Created**: [YYYY-MM-DD]
**Infrastructure Category**: [Compute/Storage/Networking/Security/Monitoring]
**Estimated Effort**: [Days/Weeks]
**Related Issues**: [Issue/PR links]
**WAI Status**: [Draft/Review/Approved/Rejected]

---

*This infrastructure WAI ensures that system changes are thoroughly planned and can be safely deployed with minimal risk.*