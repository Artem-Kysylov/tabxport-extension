# Database Schemas

This directory contains SQL schema files for the Supabase database.

## Schema Files

- `supabase-schema.sql` - Main database schema
- `supabase-schema-updated.sql` - Updated schema with latest changes
- `supabase-schema-paypal.sql` - Schema with PayPal integration tables
- `fix-paypal-webhooks-rls.sql` - RLS fixes for PayPal webhooks
- `temp-enable-gdrive-free.sql` - Temporary script to enable Google Drive for free users

## Usage

These files can be used to set up or update the Supabase database:

```sql
-- Execute in Supabase SQL editor
-- Choose the appropriate schema file based on your needs
```

## Notes

- Always backup your database before applying schema changes
- Test schema changes in a development environment first
- Review RLS policies after applying updates 