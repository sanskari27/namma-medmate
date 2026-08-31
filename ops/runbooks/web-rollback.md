# Web rollback

Owner: platform on-call

1. Open GitHub Actions → **Rollback**.
2. Inputs: `environment`, `targetType=web`, `targetName=dispensary-app-web`, `version`.
3. Verify:
   ```sh
   curl --fail "https://dispensary.<env>.nammamedmate.com"
   aws cloudfront get-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --id <id>
   ```
   Production hostname omits the environment label: `https://dispensary.nammamedmate.com`.
