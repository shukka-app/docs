---
title: Cloudflare Workers
description: Run the same Shukka panel on Cloudflare Workers with a remote libsql database and an environment-variable encryption key.
---

Cloudflare Workers is a **second full-panel path**, not a feed-only edge. Setup, sign-in, apps, channels, notes, integration, the upload API, and the update feed are the same product as Docker / VPS.

Self-hosting on a single machine with a data volume remains the primary path. See [Self-hosting](/en-US/docs/deployment).

## What changes on Workers

| Topic | Node (Docker / VPS) | Cloudflare Workers |
|------|------|------|
| Database | Local SQLite file under `SHUKKA_DATA_DIR` | Remote libsql over HTTP (`SHUKKA_DB_URL`) |
| Schema | Applied on process start when `drizzle/` is in the working directory | Apply `drizzle/` **outside** the isolate before deploy. The Worker does not migrate. |
| Encryption key | Default file, or filepath, or value | **Value only**: `SHUKKA_ENCRYPTION_KEY` (64 hex characters). Filepath is rejected. |
| Password hash | Default `scrypt` is fine | Set `SHUKKA_PASSWORD_HASH=pbkdf2` **before first setup** (Cloudflare Free CPU). Locked after init. |
| Login rate limit | 10 failures / 15 minutes per IP | Off. Use the platform WAF / firewall. |
| Feed download / check counts | Written on each feed hit | Not recorded. Use Cloudflare logs / analytics. The feed still returns yml and 302. |

The Worker script on the Free plan must stay under Cloudflare's **3 MiB gzip** limit. Client static assets do not count toward that script limit.

## Prerequisites

1. A [shukka](https://github.com/shukka-app/shukka) checkout (the Worker build lives in that repo).
2. Node 24, same as CI.
3. A remote libsql database (Turso or any compatible HTTP endpoint).
4. Wrangler logged in to the Cloudflare account that will own the Worker.

Apply the SQL files under `drizzle/` to that database **in order**, with the Turso CLI or any client that can run those statements. Do not call `migrate('./drizzle')` inside the Worker. Do not run `npm run db:generate` against a production database.

## Secrets

Set these with Wrangler. Do not commit them.

```bash
npx wrangler secret put SHUKKA_ENCRYPTION_KEY
npx wrangler secret put SHUKKA_DB_URL
npx wrangler secret put SHUKKA_DB_AUTH_TOKEN   # if the remote database requires a token
npx wrangler secret put SHUKKA_PASSWORD_HASH   # pbkdf2 — only needed before first setup
```

| Secret | Required | Notes |
|------|------|------|
| `SHUKKA_ENCRYPTION_KEY` | Yes | 64 hex characters (32 bytes). Generate with `openssl rand -hex 32`. Filepath / `SHUKKA_ENCRYPTION_KEY_FILEPATH` / `SHUKKA_KEY_PATH` are not supported on Workers. |
| `SHUKKA_DB_URL` | Yes | Remote libsql HTTP URL. Node self-hosting does not read this variable. |
| `SHUKKA_DB_AUTH_TOKEN` | If the database requires it | Optional token for that URL. |
| `SHUKKA_PASSWORD_HASH` | Before first setup | Must be `pbkdf2` on Cloudflare Free. After setup, changing this variable is a no-op. |

S3 credentials, the admin password, and API keys are **not** process environment variables. You set those in the panel after deploy, same as Docker.

Generate a key and keep a copy. If you lose `SHUKKA_ENCRYPTION_KEY`, stored S3 secrets cannot be decrypted. The Worker never writes `encryption.key`.

## Deploy

From the shukka repository root:

```bash
npm ci
npm run deploy:worker
```

That runs `npm run build:worker` then `wrangler deploy`. The repo's `wrangler.jsonc` is the Worker config (`nodejs_compat`, entry `src/worker.ts`). `npm run build` is still the Docker / Node Nitro artifact — do not use it for this path.

Open the Worker URL. First visit is setup (password at least 8 characters), then the same login → create app → publish → feed 302 flow as self-hosting.

Object storage is still configured per app in the panel. The Worker host must be able to reach that S3 endpoint (Head / Get / Delete / probe). CI and desktop clients talk to storage directly, not through the Worker.

## Password recovery

There is no email reset. On the remote database, delete the admin row and sessions, then open setup again:

```sql
DELETE FROM admin;
DELETE FROM sessions;
```

If you are moving an existing `scrypt$` instance onto Cloudflare Free, use this same path and set `SHUKKA_PASSWORD_HASH=pbkdf2` before setup. The panel does not convert hashes.

Hand-editing `admin.password_hash` is unsupported. Stored values start with `scrypt$` or `pbkdf2$`; the process verifies by that prefix. Rewriting the row yourself can lock you out, or leave a `scrypt$` admin on Cloudflare Free (login may exceed the isolate CPU budget).

## Backup

The backup boundary is the **remote database plus** the `SHUKKA_ENCRYPTION_KEY` secret. Losing either makes stored S3 secrets unreadable. Artifacts stay in each app's bucket.

## After deploy

```bash
curl -sS "https://<your-worker>/api/health"
# {"status":"ok","db":"ok"}
```

A failed Worker start is usually a missing `SHUKKA_ENCRYPTION_KEY` or `SHUKKA_DB_URL`, a filepath key, or a remote database that never received `drizzle/`.
