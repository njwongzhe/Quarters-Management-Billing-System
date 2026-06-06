# How to Use These Migration:

1. In command line, run: `npx prisma migrate dev --name <name_of_migration>`. Replace `<name_of_migration>` with a descriptive name for the migration.
2. Then, find the generated SQL file (migration.sql) in `prisma/migrations/<id>_<name_of_migration>/migration.sql` and replace its content with this code.
3. To apply the migration, run: `npx prisma migrate deploy` again.

<br />

4. If any edited has been maded to the migration file, please make sure to do further steps to ensure the changes are applied correctly:
- Go to Supabase Sidebar > "SQL Editer" and run:
```sql
DELETE FROM _prisma_migrations 
WHERE migration_name = '<id>_<name_of_migration>'; -- Replace <id> and <name_of_migration> with the actual ID and name of the migration folder you just created. 
```
- Then, re-run Step 1 to Step 3 above to ensure the migration is applied with the correct changes.

<br />

# Prerequisites:

1. Activate pg_cron extension in your Supabase database to enable scheduled tasks.
- Go to Supabase Sidebar > "Integrations" > "Cron" and enable "pg_cron" if it's not already active.

<br />

2. To Check The Setup is Working:
- Go to Supabase Sidebar > "Database" > "Triggers" and verify that the triggers for "UnitOccupancy", "Transaction" and "Resident" are created successfully.
- Go to Supabase Sidebar > "Integrations" > "Cron" > "Jobs" and verify that the scheduled job "daily-age-status-update" is listed.