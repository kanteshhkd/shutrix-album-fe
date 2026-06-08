# Shutrix Album Studio

A SaaS web application for Indian wedding photographers to design, customize, and export print-ready photo albums. Photographers log in (directly or via their existing Shutrix account), pick a template, drag-and-drop their photos into the canvas editor, and export high-resolution JPEGs or PDFs for printing.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Repository Structure](#4-repository-structure)
5. [Database Schema](#5-database-schema)
6. [Authentication Strategy](#6-authentication-strategy)
7. [Shutrix Integration](#7-shutrix-integration)
8. [Storage & CDN Strategy](#8-storage--cdn-strategy)
9. [Subscription Model](#9-subscription-model)
10. [API Reference](#10-api-reference)
11. [Editor Architecture](#11-editor-architecture)
12. [Local Development](#12-local-development)
13. [Environment Variables](#13-environment-variables)
14. [Pending Work](#14-pending-work)

---

## 1. Product Overview

### Who uses it
**Photographers** — registered on Shutrix or directly on Album Studio. They create and design albums.

**Customers** — clients of the photographer. They view and select photos on Shutrix (existing flow). They have **no interaction** with Album Studio directly.

### Core workflow
```
Shutrix (existing)                    Album Studio (this app)
──────────────────                    ───────────────────────
1. Photographer uploads photos
2. Creates private album
3. Shares link with customer
4. Customer selects favorites    →    5. Photographer opens Album Studio
                                      6. Imports selected photos from Shutrix
                                      7. Designs print album in the editor
                                      8. Exports JPEG / PDF for print lab
```

### Album sizes supported
| Size    | Canvas dimensions |
|---------|-------------------|
| 12×36"  | 3600 × 1200 px    |
| 12×30"  | 3000 × 1200 px    |
| 10×24"  | 2400 × 1000 px    |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Shutrix Platform                          │
│                                                                   │
│   Drupal Backend  ←→  Next.js Frontend                           │
│   (OAuth Server)       (shutrix.com)                             │
│   Simple OAuth module                                            │
│          │                    │                                   │
│          │ OAuth 2.0          │ S3 Presigned URL                  │
│          ↓                    ↓                                   │
└──────────┼────────────────────┼────────────────────────────────-─┘
           │                    │
           │                    │
┌──────────▼────────────────────▼──────────────────────────────────┐
│                    Shutrix Album Studio                            │
│                                                                    │
│  Next.js Frontend (port 3001)                                     │
│  ├── /login            Auth (email/password + Login with Shutrix) │
│  ├── /dashboard        Overview & stats                           │
│  ├── /albums           Album management                           │
│  ├── /templates        Template browser (admin: create/delete)    │
│  ├── /editor/[id]      Konva canvas editor                        │
│  ├── /exports          Export history & downloads                 │
│  └── /settings         Profile, subscription, billing            │
│                ↕ REST API                                         │
│  Laravel API (port 8000)                                          │
│  ├── Auth (Sanctum tokens)                                        │
│  ├── Albums / Pages                                               │
│  ├── Templates                                                    │
│  ├── Assets                                                       │
│  ├── Exports (queued via Horizon)                                 │
│  ├── Payments (Razorpay)                                          │
│  └── Admin                                                        │
│                ↕                                                  │
│  MySQL          Redis (cache + queues)                            │
└──────────────────────────────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────────────────────┐
│                   AWS (shared with Shutrix)                       │
│                                                                    │
│  S3 Bucket: shutrix-main                                          │
│  ├── photos/          ← Shutrix owns (photographer uploads)       │
│  ├── albums/          ← Shutrix owns (shared album assets)        │
│  └── album-exports/   ← Album Studio writes via presigned URL     │
│                                                                    │
│  CloudFront CDN → serves all of the above                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

### Frontend (`shutrix-album-studio-web`)
| Concern | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| Canvas editor | React Konva + Konva.js |
| State management | Zustand (editor store, auth store) |
| Server state | TanStack Query v5 |
| Styling | Tailwind CSS + Radix UI primitives |
| Animations | Framer Motion |
| Drag & drop | @hello-pangea/dnd (timeline) |
| Forms | React Hook Form + Zod |
| HTTP | Axios |
| Auth persistence | Zustand persist (localStorage) |

### Backend (`shutrix-album-studio-api`)
| Concern | Library |
|---|---|
| Framework | Laravel 12 |
| Auth | Laravel Sanctum (token-based) |
| OAuth client | Laravel Socialite (custom Drupal provider — pending) |
| Queues | Laravel Horizon (Redis) |
| Storage | league/flysystem-aws-s3-v3 |
| Image processing | Intervention Image |
| PDF export | barryvdh/laravel-dompdf |
| Payments | razorpay/razorpay |
| Query building | spatie/laravel-query-builder |
| Cache | Redis (Predis) |

### Infrastructure
| Service | Usage |
|---|---|
| MySQL | Primary database |
| Redis | Queue jobs, cache, sessions |
| AWS S3 | File storage (shared with Shutrix) |
| CloudFront | CDN for all media |
| Laravel Horizon | Queue monitoring dashboard |
| Razorpay | Payment gateway (INR) |

---

## 4. Repository Structure

```
album-builder/
├── shutrix-album-studio-api/        Laravel backend
│   ├── app/
│   │   ├── Http/Controllers/Api/V1/
│   │   │   ├── AuthController.php
│   │   │   ├── AlbumController.php
│   │   │   ├── PageController.php
│   │   │   ├── TemplateController.php
│   │   │   ├── AssetController.php
│   │   │   ├── ExportController.php
│   │   │   ├── PaymentController.php
│   │   │   ├── UserController.php
│   │   │   └── AdminController.php
│   │   ├── Http/Resources/
│   │   ├── Models/
│   │   └── Services/
│   ├── database/migrations/
│   ├── routes/api.php
│   └── bootstrap/app.php
│
└── shutrix-album-studio-web/        Next.js frontend
    └── src/
        ├── app/
        │   ├── (auth)/              login, register, forgot-password
        │   ├── (dashboard)/         albums, templates, exports, settings
        │   └── editor/[albumId]/    canvas editor page
        ├── components/
        │   ├── editor/              EditorLayout, Canvas, Toolbar, Sidebars, Timeline
        │   ├── templates/           TemplateLayoutPreview (SVG)
        │   └── shared/              LoadingScreen, Logo, Toast
        ├── hooks/                   useAlbums, useTemplates, useAssets, useAuth...
        ├── store/                   editorStore (Zustand), authStore (Zustand)
        ├── lib/                     apiClient (Axios), utils
        └── types/                   index.ts (all TypeScript interfaces)
```

---

## 5. Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | string | |
| email | string unique | |
| password | string nullable | null for OAuth-only users |
| role | enum | `user`, `admin` |
| plan | enum | `free`, `starter`, `pro` |
| avatar | string nullable | |
| provider | string nullable | `shutrix` when OAuth login |
| provider_id | string nullable | Drupal user ID from Shutrix |
| shutrix_user_id | string nullable | **Pending** — for Shutrix OAuth link |
| is_verified | boolean | |

### `subscriptions`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users | |
| plan_id | enum | `free`, `starter`, `pro` |
| status | enum | `active`, `trialing`, `past_due`, `canceled`, `paused` |
| razorpay_subscription_id | string nullable | |
| current_period_start / end | timestamp | |

### `albums`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users | |
| title | string | |
| category | enum | wedding, pre_wedding, engagement, haldi, mehndi, reception, cinematic, luxury, minimal |
| size | enum | `12x36`, `12x30`, `10x24` |
| status | enum | `draft`, `published`, `archived` |
| template_id | FK → templates nullable | |
| cover_image_url | string nullable | |
| page_count | int | |

### `pages`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| album_id | FK → albums | |
| page_number | int | display order |
| page_order | int | drag-drop order |
| background | string nullable | raw background color (template format) |
| json_data | json | `{ width, height, background_color, elements[] }` |
| thumbnail_url | string nullable | |

### `templates`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | string | |
| slug | string unique | |
| category | enum | same as album category |
| size | enum | same as album size |
| thumbnail | string nullable | |
| json_data | json | `{ version, width, height, pages[{ background, elements[] }] }` |
| is_premium | boolean | |
| is_active | boolean | |
| price | int | stored in paise (÷100 = ₹) |
| pages_count | int | |
| tags | json nullable | |

### `assets`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users | |
| file_name | string | |
| file_url | string | CloudFront URL |
| thumbnail_url | string nullable | |
| file_size | int | bytes |
| mime_type | string | |
| asset_type | enum | `photo`, `frame`, `element`, `texture` |
| shutrix_photo_url | string nullable | **Pending** — CloudFront URL from Shutrix when imported |
| shutrix_album_id | string nullable | **Pending** — source Shutrix album reference |

### `exports`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| album_id | FK → albums | |
| user_id | FK → users | |
| export_type | enum | `jpg`, `pdf` |
| size | enum | album size |
| dpi | int | 300 |
| status | enum | `pending`, `processing`, `completed`, `failed` |
| download_url | string nullable | CloudFront URL to exported file |
| payment_id | string nullable | Razorpay payment ID |

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users | |
| razorpay_order_id | string | |
| razorpay_payment_id | string nullable | |
| amount | int | paise |
| currency | string | `INR` |
| status | enum | `created`, `paid`, `failed` |
| purpose | enum | `export`, `subscription` |

### `template_purchases`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users | |
| template_id | FK → templates | |
| payment_id | string | |

---

## 6. Authentication Strategy

### Direct registration (no Shutrix account)
Standard email + password. Laravel Sanctum issues a Bearer token stored in `localStorage` via Zustand persist.

```
POST /api/v1/auth/register  →  { token, user }
POST /api/v1/auth/login     →  { token, user }
```

### Login with Shutrix (OAuth — pending implementation)
Shutrix runs Drupal with the **Simple OAuth** module as the OAuth 2.0 provider.

```
Flow:
1. User clicks "Login with Shutrix" on Album Studio
2. Next.js redirects →  GET /api/v1/auth/shutrix/redirect
3. Laravel redirects →  https://shutrix.com/oauth/authorize?client_id=...
4. User authenticates on Shutrix
5. Shutrix redirects →  /api/v1/auth/shutrix/callback?code=...
6. Laravel exchanges code for token
7. Laravel calls Shutrix userinfo endpoint → gets { id, name, email, avatar }
8. Laravel creates or updates local user (matched by shutrix_user_id or email)
9. Laravel returns Sanctum token to Next.js frontend
10. User is now logged in on Album Studio
```

**Required on Shutrix (Drupal):**
- Simple OAuth module installed and configured
- Album Studio registered as an OAuth client (client_id + client_secret)
- Userinfo endpoint returning: `id`, `name`, `email`, `avatar_url`

**Required on Album Studio (Laravel):**
- Laravel Socialite + custom Drupal provider
- `shutrix_user_id` column on `users` table
- `GET /api/v1/auth/shutrix/redirect` and `GET /api/v1/auth/shutrix/callback` routes

### Admin access
Users with `role = admin` bypass all premium template restrictions and have access to template management (create, delete) via the `/api/v1/admin/*` routes.

---

## 7. Shutrix Integration

### Photo import into Album Studio (pending)

Photographers import photos that their customers selected on Shutrix directly into the Album Studio editor.

**Required Shutrix API endpoint (to be built on Drupal side):**
```
GET /api/album-studio/albums/{shutrix_album_id}/selected-photos
Authorization: Bearer {shutrix_oauth_token}

Response:
{
  "photos": [
    {
      "id": "abc123",
      "url": "https://cdn.shutrix.com/photos/abc123.jpg",
      "thumbnail_url": "https://cdn.shutrix.com/photos/abc123_thumb.jpg",
      "width": 6000,
      "height": 4000,
      "selected_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Album Studio side (to be built):**
- "Import from Shutrix" tab in the editor's left asset sidebar
- Calls Album Studio backend → which calls Shutrix API using the photographer's stored OAuth token
- Returns CloudFront URLs that Konva renders directly (no re-upload)

### Export upload via Shutrix presigned URL (pending)

Album Studio exports (JPEG/PDF) are stored in Shutrix's S3 bucket under `album-exports/` prefix.

**Why Shutrix presigns the URL:**
- Keeps all S3 credentials on the Shutrix side
- Album Studio never holds AWS keys
- Shutrix controls bucket access policy

**Flow:**
```
1. Album Studio backend:
   POST https://shutrix.com/api/album-studio/presign-upload
   { filename: "album_8_page_1.jpg", content_type: "image/jpeg" }
   → { presigned_url: "https://s3.amazonaws.com/...", cdn_url: "https://cdn.shutrix.com/album-exports/..." }

2. Album Studio backend uploads directly to the presigned_url (PUT)

3. cdn_url is saved in exports.download_url and returned to the photographer
```

---

## 8. Storage & CDN Strategy

| File type | Who uploads | Where stored | Served via |
|---|---|---|---|
| Photographer photos | Shutrix | `s3://shutrix-main/photos/` | CloudFront |
| Shared album assets | Shutrix | `s3://shutrix-main/albums/` | CloudFront |
| Album Studio user-uploaded assets | Album Studio | `s3://shutrix-album-studio/assets/` | CloudFront |
| Exported albums (JPEG/PDF) | Album Studio (via Shutrix presigned URL) | `s3://shutrix-main/album-exports/` | CloudFront |

**Key principle:** Photos from Shutrix are **never copied** into Album Studio's storage. The editor references CloudFront URLs directly. Only the final exported files are written to S3.

---

## 9. Subscription Model

Album Studio and Shutrix have **separate, independent subscriptions.** They cover different value:

| | Shutrix | Album Studio |
|---|---|---|
| What it covers | Photo storage (GB) | Album design tools |
| Pricing model | Storage tiers | Feature tiers |
| Who pays | Photographer | Photographer |
| Customers pay? | No | No |

### Album Studio Plans

| Feature | Free | Starter | Pro |
|---|---|---|---|
| Albums | 3 | 15 | Unlimited |
| Exports/month | 2 | 10 | Unlimited |
| Storage | 1 GB | 10 GB | 50 GB |
| Premium templates | No | No | Yes |
| Watermark on export | Yes | No | No |
| Priority exports | No | No | Yes |

### Admin users
Admins (`role = admin`) are not subject to any plan limits or premium template restrictions.

### Payment gateway
Razorpay (INR). Handles both one-time payments (per-template purchase, per-export) and recurring subscriptions.

---

## 10. API Reference

All routes prefixed with `/api/v1`. Authenticated routes require `Authorization: Bearer {token}`.

### Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register with email/password |
| POST | `/auth/login` | No | Login, returns token |
| POST | `/auth/logout` | Yes | Revoke current token |
| POST | `/auth/forgot-password` | No | Send reset email |
| POST | `/auth/reset-password` | No | Reset with token |
| GET | `/auth/shutrix/redirect` | No | **Pending** — start OAuth |
| GET | `/auth/shutrix/callback` | No | **Pending** — OAuth callback |

### Albums
| Method | Route | Description |
|---|---|---|
| GET | `/albums` | List user's albums |
| POST | `/albums` | Create blank album |
| POST | `/albums/from-template` | Create album from template |
| GET | `/albums/{id}` | Get album + pages |
| PUT | `/albums/{id}` | Update album metadata |
| DELETE | `/albums/{id}` | Delete album |
| POST | `/albums/{id}/duplicate` | Duplicate album |

### Pages
| Method | Route | Description |
|---|---|---|
| GET | `/albums/{id}/pages` | List pages |
| POST | `/albums/{id}/pages` | Add page |
| PUT | `/albums/{id}/pages/reorder` | Reorder pages |
| PUT | `/albums/{id}/pages/{page}` | Save page canvas data |
| DELETE | `/albums/{id}/pages/{page}` | Delete page |
| POST | `/albums/{id}/pages/{page}/duplicate` | Duplicate page |

### Templates
| Method | Route | Description |
|---|---|---|
| GET | `/templates` | List templates (premium gated for free users) |
| GET | `/templates/{id}` | Get single template |
| POST | `/templates/{id}/purchase` | Purchase premium template |

### Assets
| Method | Route | Description |
|---|---|---|
| GET | `/assets` | List user's assets |
| POST | `/assets/upload` | Upload photo/frame/element |
| DELETE | `/assets/{id}` | Delete asset |

### Exports
| Method | Route | Description |
|---|---|---|
| GET | `/exports` | Export history |
| POST | `/exports` | Request new export (queued) |
| GET | `/exports/{id}` | Check export status |
| GET | `/exports/{id}/download` | Get download URL |

### Admin (role = admin only)
| Method | Route | Description |
|---|---|---|
| GET | `/admin/users` | List all users |
| GET | `/admin/analytics` | Platform analytics |
| GET | `/admin/exports` | All exports |
| GET | `/admin/templates` | All templates |
| POST | `/admin/templates` | Create template |
| PUT | `/admin/templates/{id}` | Update template |
| DELETE | `/admin/templates/{id}` | Delete template |

---

## 11. Editor Architecture

The editor is a full-screen Konva canvas application loaded at `/editor/[albumId]`.

### State (`editorStore` — Zustand)
```
pages[]            — all pages for the album
currentPageIndex   — which page is shown
selectedElementId  — which element is selected
tool               — 'select' | 'pan'
zoom               — float (0.1 – 3.0)
pan                — { x, y }
history[]          — undo/redo snapshots of pages
historyIndex       — current position in history
isDirty            — unsaved changes exist
isSaving           — auto-save in progress
```

### Page data format (`json_data`)
```json
{
  "width": 3600,
  "height": 1200,
  "background_color": "#1a1a1a",
  "elements": [
    {
      "id": "abc123",
      "type": "image",
      "x": 100, "y": 100, "width": 800, "height": 600,
      "rotation": 0, "opacity": 1, "locked": false, "visible": true,
      "src": "https://cdn.shutrix.com/photos/abc123.jpg",
      "fit_mode": "fill",
      "border_radius": 0
    }
  ]
}
```

### Template JSON format (raw, before normalization)
```json
{
  "version": "1.0",
  "width": 3600,
  "height": 1200,
  "pages": [
    {
      "background": "#1a1a1a",
      "elements": [
        { "id": "el1", "type": "rect", "x": 0, "y": 0, "width": 1800, "height": 1200, "fill": "#2a2a2e" },
        { "id": "el2", "type": "image", "x": 20, "y": 20, "width": 1760, "height": 1160, "placeholder": true }
      ]
    }
  ]
}
```

> **Note:** When pages are loaded from the API, they are normalized in `editor/[albumId]/page.tsx` to inject `width`, `height`, and resolve `background_color` from the album size before being passed to the editor store.

### Auto-save
Pages auto-save 1.5 seconds after the last canvas change via a debounced `PUT /albums/{id}/pages/{pageId}` call.

### Component tree
```
EditorLayout
├── Toolbar          (undo/redo, zoom, tools, add text/shape, export)
├── LeftSidebar      (Photos, Templates, Elements, Text tabs)
├── EditorCanvas     (Konva Stage → Layer → elements)
├── RightSidebar     (element properties panel)
└── BottomTimeline   (page thumbnails, drag-to-reorder, add/delete page)
```

---

## 12. Local Development

### Prerequisites
- PHP 8.2+, Composer
- Node.js 20+
- MySQL 8
- Redis

### Backend
```bash
cd shutrix-album-studio-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve                  # http://localhost:8000
php artisan horizon                # queue worker
```

### Frontend
```bash
cd shutrix-album-studio-web
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                         # http://localhost:3001
```

---

## 13. Environment Variables

### Backend (`.env`)
| Variable | Description |
|---|---|
| `APP_URL` | Laravel app URL |
| `DB_*` | MySQL connection |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection |
| `AWS_ACCESS_KEY_ID` | S3 credentials (Album Studio bucket only) |
| `AWS_SECRET_ACCESS_KEY` | |
| `AWS_DEFAULT_REGION` | `ap-south-1` |
| `AWS_BUCKET` | `shutrix-album-studio` |
| `RAZORPAY_KEY_ID` | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `SHUTRIX_CLIENT_ID` | **Pending** — Drupal OAuth client ID |
| `SHUTRIX_CLIENT_SECRET` | **Pending** — Drupal OAuth client secret |
| `SHUTRIX_BASE_URL` | **Pending** — `https://shutrix.com` |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:3001,app.shutrix.com` |

### Frontend (`.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Laravel API base URL |
| `NEXT_PUBLIC_CLOUDFRONT_URL` | **Pending** — Shutrix CDN base URL |

---

## 14. Pending Work

---

### Phase 1 — Shutrix ↔ Album Studio Connection

This is the core integration work that links the two platforms. All items below must be completed together as they depend on each other.

---

#### 1A. Shutrix side — Drupal work (one-time setup)

> These tasks are done on the **Shutrix Drupal backend** by the Shutrix team.

| # | Task | Detail |
|---|---|---|
| S1 | Install & configure Simple OAuth module | Enable on Drupal. Set token expiry: access token 1h, refresh token 30 days |
| S2 | Register Album Studio as an OAuth client | Grant types: `authorization_code`, `refresh_token`. Redirect URI: `https://studio.shutrix.com/api/v1/auth/shutrix/callback`. Scopes: `openid profile email` |
| S3 | Expose userinfo endpoint | `GET /oauth/userinfo` → returns `{ sub, name, email, picture }` |
| S4 | Expose photographer's albums API | `GET /api/album-studio/my-albums` → list of albums the photographer owns (id, title, cover, photo count) |
| S5 | Expose selected photos API | `GET /api/album-studio/albums/{id}/selected-photos` → photos the customer marked as selected (CloudFront URLs only) |
| S6 | Expose presigned upload URL endpoint | `POST /api/album-studio/presign-export` → receives `{ filename, content_type }`, returns `{ presigned_url, cdn_url }` scoped to `album-exports/` prefix |

**S5 response format:**
```json
{
  "album": { "id": "123", "title": "Sharma Wedding" },
  "photos": [
    {
      "id": "ph_abc",
      "url": "https://cdn.shutrix.com/photos/ph_abc.jpg",
      "thumbnail_url": "https://cdn.shutrix.com/photos/ph_abc_thumb.jpg",
      "width": 6000,
      "height": 4000,
      "selected_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**S6 response format:**
```json
{
  "presigned_url": "https://shutrix-main.s3.ap-south-1.amazonaws.com/album-exports/...?X-Amz-Signature=...",
  "cdn_url": "https://cdn.shutrix.com/album-exports/album_8_export.jpg",
  "expires_in": 300
}
```

---

#### 1B. Album Studio backend — Laravel work

| # | Task | File | Detail |
|---|---|---|---|
| L1 | Add migration for OAuth fields on users | new migration | Add `shutrix_user_id string nullable`, `shutrix_access_token text nullable`, `shutrix_refresh_token text nullable`, `shutrix_token_expires_at timestamp nullable` |
| L2 | Create custom Socialite provider for Drupal | `app/Socialite/ShutrixProvider.php` | Extends AbstractProvider. Auth URL: `{SHUTRIX_BASE_URL}/oauth/authorize`, Token URL: `{SHUTRIX_BASE_URL}/oauth/token`, Userinfo: `{SHUTRIX_BASE_URL}/oauth/userinfo` |
| L3 | Register Socialite provider | `AppServiceProvider` | `Socialite::extend('shutrix', ...)` |
| L4 | Add OAuth routes | `routes/api.php` | `GET /auth/shutrix/redirect` and `GET /auth/shutrix/callback` (public, no Sanctum) |
| L5 | Build `ShutrixAuthController` | `app/Http/Controllers/Api/V1/ShutrixAuthController.php` | `redirect()` → returns OAuth URL. `callback()` → exchanges code, upserts user by `shutrix_user_id` or email, stores tokens, returns Sanctum token |
| L6 | Build `ShutrixProxyController` | `app/Http/Controllers/Api/V1/ShutrixProxyController.php` | Proxies requests to Shutrix API using stored OAuth token. Handles token refresh automatically |
| L7 | Add Shutrix proxy routes | `routes/api.php` (authenticated) | `GET /shutrix/albums` → list photographer's Shutrix albums. `GET /shutrix/albums/{id}/photos` → selected photos for import |
| L8 | Add export upload via presign | `ExportController` or `ExportJob` | Before saving export, call Shutrix presign endpoint, PUT file to presigned URL, store cdn_url in exports table |

**Token refresh logic (L6):**
```
On every proxy request:
  if shutrix_token_expires_at < now + 5min:
    call {SHUTRIX_BASE_URL}/oauth/token with refresh_token grant
    update user's shutrix_access_token, shutrix_refresh_token, shutrix_token_expires_at
  proceed with fresh token
```

---

#### 1C. Album Studio frontend — Next.js work

| # | Task | File | Detail |
|---|---|---|---|
| F1 | "Login with Shutrix" button on login page | `app/(auth)/login/page.tsx` | Button calls `GET /api/v1/auth/shutrix/redirect`, gets back OAuth URL, redirects browser there |
| F2 | OAuth callback page | `app/(auth)/shutrix-callback/page.tsx` | Receives `?code=` param, sends to Laravel callback, receives token + user, stores in authStore, redirects to `/dashboard` |
| F3 | Shutrix albums hook | `hooks/useShutrix.ts` | `useShutrixAlbums()` — fetches `/shutrix/albums` (photographer's Shutrix albums) |
| F4 | Shutrix photos hook | `hooks/useShutrix.ts` | `useShutrixPhotos(albumId)` — fetches `/shutrix/albums/{id}/photos` (selected photos for that album) |
| F5 | "Import from Shutrix" tab in editor sidebar | `components/editor/LeftSidebar.tsx` | New tab shown only for users with a linked Shutrix account. Lists their Shutrix albums. On album select, shows customer-selected photo thumbnails. Click a photo → adds it as an image element on the canvas (CloudFront URL as `src`) |
| F6 | Link Shutrix account from Settings | `app/(dashboard)/settings/page.tsx` | If user registered directly (no Shutrix link), show "Connect Shutrix Account" button that starts the same OAuth flow |

---

#### 1D. Full end-to-end flow after integration

```
Scenario A — Photographer already on Shutrix
─────────────────────────────────────────────
1. Visits studio.shutrix.com
2. Clicks "Login with Shutrix"
3. Authenticated via Drupal OAuth → lands on /dashboard
4. Creates a new album (picks template, sets title/category/size)
5. Opens editor
6. Left sidebar → "Shutrix" tab → sees their Shutrix albums
7. Picks "Sharma Wedding 2025"
8. Sees 48 photos the customer selected → clicks to add to canvas
9. Photos appear as image elements on the canvas (served from CloudFront, no re-upload)
10. Designs all pages, saves automatically
11. Clicks Export → 300 DPI JPEG
12. Album Studio calls Shutrix presign → uploads to S3 album-exports/
13. Download link (CloudFront URL) sent to photographer

Scenario B — New photographer, no Shutrix account
──────────────────────────────────────────────────
1. Visits studio.shutrix.com
2. Registers with email/password directly
3. Uses the asset upload panel to upload photos from their computer
4. Everything else is the same from step 4 above
5. Can connect Shutrix account later from Settings if they sign up on Shutrix

Scenario C — Customer (never touches Album Studio)
──────────────────────────────────────────────────
1. Photographer shares private album link from Shutrix
2. Customer opens the Shutrix link (normal Shutrix flow)
3. Customer browses and selects favourite photos
4. Those selections are visible to the photographer in Album Studio via the import panel
5. Customer never creates an account on Album Studio
```

---

### Phase 2 — Editor & Export

| # | Feature | Notes |
|---|---|---|
| E1 | **Canvas export rendering** | Queue job using headless Chromium (Puppeteer via Node microservice) or server-side canvas to generate 300 DPI JPEG/PDF from page JSON |
| E2 | **Template element → canvas element converter** | Map raw template types (`rect`→`shape`, `image`→`image`, `text`→`text`) when loading a template so elements render correctly in Konva |
| E3 | **Right sidebar — image controls** | Crop, fit mode (`fit`/`fill`/`crop`), border radius, shadow, border |
| E4 | **Drag photos from sidebar to canvas** | Drag a photo from the Shutrix import panel or asset panel and drop it onto a placeholder frame on the canvas |

---

### Phase 3 — Polish & Growth

| # | Feature | Notes |
|---|---|---|
| P1 | Asset manager folders | Group assets by folder, search by filename |
| P2 | Admin analytics dashboard | Charts for users by plan, revenue, exports, albums created |
| P3 | Bulk template import | Upload a ZIP of JSON files to seed many templates at once |
| P4 | Mobile-responsive editor | Currently desktop-only; tablet support at minimum |
| P5 | Customer album preview portal | Photographer shares a read-only link to the finished designed album before sending to print |
| P6 | Collaborative editing | Multiple photographers on one album simultaneously |

---

## Key Architectural Decisions

| Decision | Choice | Reason |
|---|---|---|
| Auth for Album Studio | Sanctum tokens (not cookies) | SPA with cross-origin API |
| Shutrix auth integration | OAuth 2.0 (Drupal Simple OAuth) | Standard, decoupled, works across domains |
| Subscriptions | Separate from Shutrix | Different value props (storage vs. design features) |
| Photo storage | Shutrix S3/CloudFront (reference by URL) | No duplication; photographers' photos stay in one place |
| Export storage | Shutrix S3 via presigned URL | Shutrix controls bucket; Album Studio holds no AWS keys |
| Canvas engine | Konva / React Konva | Best-in-class for 2D canvas editing in React; SSR disabled for Konva |
| Queue | Laravel Horizon (Redis) | Export jobs are heavy; need async processing and monitoring |
| Payment gateway | Razorpay | INR-native; supports subscriptions + one-time payments |
