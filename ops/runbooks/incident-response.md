# Incident response

1. Acknowledge the CloudWatch alarm in SNS/Slack.
2. Check [on-call-checklist.md](on-call-checklist.md).
3. If Lambda 5xx or latency SLO is burning, run [lambda-rollback.md](lambda-rollback.md).
4. If the dispensary origin is failing, run [web-rollback.md](web-rollback.md).
5. Record timeline, impact, and follow-up in the incident issue.
