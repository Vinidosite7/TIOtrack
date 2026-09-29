# TioTrack v8.1 — Product creation performance patch

## Why v8 felt slow
The v8 product creation path performed several remote Supabase calls sequentially:
1. Auth user lookup
2. Workspace ownership lookup
3. Slug availability lookup
4. Product insert
5. Funnel insert
6. Funnel steps insert
7. Then the product detail page performed additional ownership/detail reads

## v8.1 changes
- Product + funnel + steps are created atomically by one Postgres RPC.
- Workspace authorization happens inside the RPC using `auth.uid()`.
- Product list/detail now rely on RLS and use a single database query.
- `turbopack.root` is pinned to the project directory to avoid scanning the user's home folder.

## Required SQL
Run `supabase/migrations/202609280003_products_fast_rpc.sql` once in the same Supabase project used by `.env.local`.

Then restart:

```bash
npm run dev
```
