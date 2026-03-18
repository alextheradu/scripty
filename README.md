# Scripty

Scripty is a self-hosted collaborative screenwriting app built with Next.js, NextAuth, Prisma, Socket.IO, and PostgreSQL.

It is designed for small invite-only teams that want real-time script editing, comments, sharing, exports, and writing stats without relying on a third-party SaaS.

## Features

- Real-time collaborative screenplay editor with live cursors and selections
- Screenplay-aware line types: scene headings, action, character, dialogue, parenthetical, transition, shot
- Invite-only Google sign-in with admin-controlled access
- Script sharing with collaborator roles and public read-only links
- Inline text comments with replies, reactions, and resolve/reopen flow
- Revision snapshots and per-script restore points
- Writing stats, streaks, contribution graph, and per-script word/page totals
- Profile setup with custom display name and avatar upload
- Export to PDF, Fountain, Final Draft (`.fdx`), and plain text
- Built-in pomodoro timer and script chat

## Stack

- Next.js 16 App Router
- React 19
- NextAuth with Google OAuth
- Prisma + PostgreSQL
- Socket.IO for presence and collaboration
- MinIO for avatar storage
- Nodemailer for invite emails
- Puppeteer for PDF export

## How It Works

- Authentication is Google-only.
- Access is invite-gated by email.
- The email in `ADMIN_EMAIL` is always allowed to sign in and administer the app.
- Other users must exist in the `Invite` table before they can get through login.
- Collaboration permissions are role-based: `viewer`, `editor`, and `admin`.
- Public share links are read-only.

## Requirements

- Node.js 20+
- PostgreSQL
- A Google OAuth app
- MinIO or another S3-compatible object store if you want avatar uploads
- SMTP credentials if you want invite emails to send successfully

For PDF export, Puppeteer must be able to launch Chromium on the host.

## Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Important variables:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `NEXTAUTH_SECRET`: required in production
- `NEXTAUTH_URL`: canonical app URL, for example `http://localhost:3009`
- `NEXT_PUBLIC_APP_URL`: public app URL used in links and emails
- `DATABASE_URL`: PostgreSQL connection string
- `ADMIN_EMAIL`: bootstrap admin account
- `MINIO_*`: avatar storage configuration
- `SMTP_*`: outbound email configuration

Default local port is `3009`.

## Local Development

1. Start PostgreSQL.

You can use the included compose example:

```bash
docker compose -f docker-compose.example.yml up -d
```

2. Install dependencies.

```bash
npm install
```

3. Create `.env` from `.env.example` and configure Google OAuth, database, and auth values.

4. Run Prisma migrations.

```bash
npm run db:migrate
```

5. Start the app.

```bash
npm run dev
```

Open `http://localhost:3009`.

## Google OAuth Setup

Create a Google OAuth application and add these callback settings:

- Authorized redirect URI: `http://localhost:3009/api/auth/callback/google`
- For production, use your real domain instead of localhost

The app uses secure cookies automatically when `NEXTAUTH_URL` is `https://...`.

## First Login

- Set `ADMIN_EMAIL` to the Google account that should own the instance.
- Sign in with that account.
- Use Settings to invite additional users.

Invited users must sign in with the same email address that was invited.

## Storage

Avatars are uploaded to MinIO using the configured bucket in `MINIO_BUCKET`.

Make sure the bucket exists before testing avatar uploads.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run db:migrate
npm run db:studio
```

Notes:

- `npm run build` runs `next build` and then restarts the `Scripty` PM2 process.
- `npm run start` serves the app on port `3009` through `server.js`.
- `server.js` hosts both Next.js and Socket.IO on the same HTTP server.

## Production Notes

- Set a real `NEXTAUTH_SECRET`. The app will error in production without it.
- Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to the deployed URL.
- Make sure Chromium can launch for PDF export.
- Make sure SMTP credentials are valid if you rely on email invites.
- The app expects to run behind a persistent Node process. This repo uses PM2 in its build script.

## Project Structure

```text
src/app/                     App Router pages and API routes
src/components/editor/      Editor, comments, toolbar, page layout
src/components/shared/      Header, export/share/profile UI
src/components/sidebar/     Scene list, characters, revisions, collaborators
src/components/stats/       Writing graphs and charts
src/lib/                    Auth, DB, exporters, mailer, MinIO, helpers
prisma/                     Prisma schema and migrations
server.js                   Custom Next + Socket.IO server
```

## Export Formats

- `PDF`: screenplay-styled PDF with title page and page numbering
- `Fountain`: plain-text screenplay format
- `FDX`: Final Draft 12 XML
- `TXT`: readable plain text export

## Current Limitations

- There is no automated test suite in this repo yet.
- PDF pagination is screenplay-aware, but not a full Final Draft clone.
- Invite email delivery depends entirely on valid SMTP configuration.

## License

No license file is currently included in this repository.
