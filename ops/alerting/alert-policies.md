# Alert policies

| Alarm                          | SLO                              | Severity | Escalation                               |
| ------------------------------ | -------------------------------- | -------- | ---------------------------------------- |
| auth-api Errors > 1/min        | API availability 99.9%, 5xx < 1% | SEV2     | On-call, then engineering lead after 15m |
| API Gateway 5xx > 1/min        | API 5xx < 1%                     | SEV2     | On-call                                  |
| p95 latency (follow-up metric) | p95 < 500 ms                     | SEV3     | Next business day if not user-facing     |
| CloudFront 5xx                 | Web availability 99.9%           | SEV2     | On-call                                  |

Notifications: SNS topic `namma-medmate-<env>-alarms` → Slack webhook configured in `slack-notification-config/`.
