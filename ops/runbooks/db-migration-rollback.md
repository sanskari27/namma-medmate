# Database migration rollback

Owner: platform on-call

1. Auth currently has no domain schema. If a future `libs/db-services` migration is applied, restore from the RDS snapshot created before migrate.
2. Commands:
   ```sh
   aws rds describe-db-instances --db-instance-identifier namma-medmate-<env> --region ap-south-1
   aws rds restore-db-instance-to-point-in-time --source-db-instance-identifier namma-medmate-<env> --target-db-instance-identifier namma-medmate-<env>-rollback --restore-time <iso>
   ```
3. Point PgBouncer at the restored instance only after application smoke tests pass.
