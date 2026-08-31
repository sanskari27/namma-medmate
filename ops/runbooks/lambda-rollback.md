# Lambda rollback

Owner: platform on-call
Escalation: engineering lead

1. Identify the function name `namma-medmate-<env>-auth-api` and version from the failed deploy.
2. Open GitHub Actions → **Rollback**.
3. Inputs: `environment`, `targetType=lambda`, `targetName`, `version`.
4. Verify:
   ```sh
   aws lambda get-function --function-name namma-medmate-<env>-auth-api --region ap-south-1
   curl --fail "$API_BASE_URL/health"
   ```
5. Rollback is successful when `/health` returns `{ "status": "ok" }` and error rate returns to SLO.
