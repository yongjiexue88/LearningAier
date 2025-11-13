# Local Supabase Persistence

- `npx supabase start` spins up a Docker Compose stack (Postgres, Auth, Storage, Edge Runtime, Mailpit, Studio, etc.) inside `~/.supabase/docker`. Each service mounts persistent Docker volumes (e.g., `supabase-db-data`, `supabase-storage-data`), so the data lives outside the running containers.

- Running `npx supabase stop` only stops the containers. Because the volumes remain, your Postgres database, auth users, storage buckets/files, and any other state will still be there the next time you run `npx supabase start`.

- You only lose data if you explicitly wipe it:
  - `npx supabase db reset` recreates the Postgres database by reapplying migrations.
  - `npx supabase stop --hard` (or manually deleting the Docker volumes via `docker volume rm`) removes the stored data entirely.
  - Storage objects are removed only if you delete the storage volume or run a specific cleanup script.

- In other words: stopping Docker does **not** delete Storage or DB content. Treat `db reset` / `stop --hard` as destructive operations; otherwise everything persists between restarts.
