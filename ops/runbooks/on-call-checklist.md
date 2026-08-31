# On-call checklist

- [ ] Confirm alarm name, environment, and start time
- [ ] Check `/health` for auth-api
- [ ] Check CloudFront 4xx/5xx and cache hit ratio
- [ ] Check PgBouncer/RDS connections
- [ ] Decide: wait, patch-forward, or rollback
- [ ] Execute the matching runbook
- [ ] Update Slack thread and incident issue
