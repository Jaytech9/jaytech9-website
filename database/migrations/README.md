# Database changes

`../schema.sql` creates the database from nothing. Once real data is in it, make every later change
as a small numbered file here, for example `0001_add_client_birthday.sql`:

```sql
ALTER TABLE clients ADD COLUMN birthday TEXT;
```

Then run it once on the live database:

```bash
npx wrangler d1 execute jaytech9 --remote --file=database/migrations/0001_add_client_birthday.sql
```

Also add the new column to `crm/functions/_lib/tables.ts` (the list of columns the CRM may read and write)
and to `crm/src/lib/types.ts`, or the CRM will ignore it.
