# RijalClub CMS Backend + Admin

Lightweight Express API and React admin panel for managing all site JSON content in GitHub.

## What this implements

- Private GitHub repo as content source of truth (all JSON files)
- Public GitHub repo for media uploads
- Raw JSON editor mode for every content file
- Admin authentication with two roles: `master` and `editor`
- No public registration route
- Master-only user management and permission controls (per file + section map)

## Content files

By default the CMS manages:

- `profile.json`
- `links.json`
- `announcements.json`
- `blog.json`
- `prayer.json`
- `store.json`
- `quran.json`
- `hadith.json`
- `contact.json`
- `cache.json`

Override with `CONTENT_FILES` env if needed.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy env template and fill all required values:

```bash
cp .env.example .env
```

3. Start API + admin frontend:

```bash
npm run dev
```

- API: `http://localhost:4000`
- Admin UI: `http://localhost:5173`

On first login, if `AUTH_STORE_PATH` does not exist in the private content repo, the API bootstraps it using:

- `BOOTSTRAP_MASTER_USERNAME`
- `BOOTSTRAP_MASTER_DISPLAY_NAME`
- `BOOTSTRAP_MASTER_PASSWORD`

All CMS writes (content, media, auth store) use the commit identity configured by:

- `GITHUB_COMMITTER_NAME` (default: `RijalEditBot`)
- `GITHUB_COMMITTER_EMAIL` (default: `rijaleditbot@users.noreply.github.com`)

## API overview

### Public content

- `GET /api/content/:file`

If `CONTENT_PUBLIC_KEY` is set, pass it as:

- header: `x-content-public-key`
- or query: `?key=...`

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Admin

- `GET /api/admin/files`
- `GET /api/admin/content/:file`
- `PUT /api/admin/content/:file`
- `GET /api/admin/visual/:file`
- `PUT /api/admin/visual/:file`
- `GET /api/admin/media/folders`
- `GET /api/admin/media/files`
- `POST /api/admin/media/upload`
- `GET /api/admin/users` (master)
- `POST /api/admin/users` (master)
- `PATCH /api/admin/users/:id` (master)
- `PATCH /api/admin/users/:id/password` (master)

Media uploads are restricted to fixed folders:

- `images/announcements`
- `images/blog`
- `images/store`
- `images/profile`
- `images/hadith/covers`

## Deploying on Vercel

This repo includes `vercel.json` routing both API and admin UI through the same deployment.

Set all env vars in Vercel project settings before deploying.

## Security note

`CONTENT_PUBLIC_KEY` helps gate the public endpoint but should not be treated as high security on the client side. Real security is enforced by:

- private GitHub content repo
- backend-only GitHub tokens
- authenticated admin routes
