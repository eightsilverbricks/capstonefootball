# Supabase schema deployment

This repository is linked to The Clark Index Supabase project:
`qubjlpndblrsarzxcobf`.

Deploy all pending migrations from the repository root:

```bash
npx supabase db push
```

For a new machine, authenticate and link once before pushing:

```bash
npx supabase login
npx supabase link --project-ref qubjlpndblrsarzxcobf
npx supabase db push
```

Verify local and remote migration history:

```bash
npx supabase migration list
npx supabase db push --dry-run
```

Create every future schema change as a new migration under
`supabase/migrations/`; do not edit an already-deployed migration.
