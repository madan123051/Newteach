# NewTech Platform Architecture Review

## Issues found

1. The public website file was wrapped in Markdown code fences, which can render invalid HTML in browsers and break deployment pipelines.
2. Admin functionality existed in duplicated extensionless files (`Admin` and `New`), creating maintenance risk and inconsistent routing.
3. There was no clear top-right company login entry point from the public website.
4. Authentication was only a demo convenience and did not model roles, protected navigation or activity logs.
5. Admin modules were product-specific and did not cover the requested business collections: users, companies, media, news, blogs, ads, jobs and logs.
6. CRUD patterns were not centralized, which increases duplicate code and makes search, filters, pagination and bulk actions harder to keep consistent.
7. The interface lacked a consolidated SaaS information architecture with breadcrumbs, responsive sidebar navigation, dark mode and reusable management components.
8. Database structure was undocumented, and production security boundaries were not described.

## Implemented architecture

- `index.html` now preserves the original public website and only adds a visible `Company Login` button in the top-right header, plus removal of accidental Markdown code fences for valid HTML rendering.
- `admin.html` is the centralized admin SPA with:
  - professional login screen,
  - demo role-based authentication,
  - route/module protection by role,
  - dashboard overview metrics,
  - reusable CRUD manager renderer,
  - search, status filtering, pagination and bulk delete,
  - media grid with metadata editing and HTTPS URL validation,
  - activity/audit logging,
  - confirmation dialogs, toast notifications, loading-ready UI states and dark mode,
  - responsive mobile sidebar.
- `Admin` and `New` are restored as the original full admin panel source files so existing work is not discarded; `admin.html` is the new canonical fully controlled admin dashboard route.
- `types.ts` defines scalable TypeScript contracts for users, companies, media, content, ads, jobs and activity logs so the static prototype can migrate cleanly into a typed application.

## Role permissions

| Role | Access |
| --- | --- |
| Super Admin | Overview, Users, Companies, Media, News, Blogs, Ads, Jobs, Activity Logs |
| Company Admin | Overview, Companies, Media, News, Blogs, Ads, Jobs, Activity Logs |
| Editor | Overview, Media, News, Blogs |
| Moderator | Overview, Media, News, Blogs, Activity Logs |

## Proposed production database schema

### users
- `id` UUID primary key
- `company_id` nullable UUID foreign key
- `name` text
- `email` citext unique
- `password_hash` text
- `role` enum: `super_admin`, `company_admin`, `editor`, `moderator`
- `status` enum: `active`, `inactive`, `invited`, `locked`
- `mfa_enabled` boolean
- `last_login_at` timestamp
- `created_at`, `updated_at`, `deleted_at`

### companies
- `id` UUID primary key
- `name`, `category`, `description`
- `logo_media_id`, `cover_media_id`
- `website`, `phone`, `email`, `address`
- `social_links` JSONB
- `verification_status` enum: `pending`, `verified`, `rejected`
- `created_by`, `created_at`, `updated_at`, `deleted_at`

### media
- `id` UUID primary key
- `company_id` UUID
- `folder_id` nullable UUID
- `type` enum: `photo`, `video`, `document`
- `storage_key`, `public_url`, `mime_type`, `size_bytes`
- `title`, `alt_text`, `metadata` JSONB
- `created_by`, `created_at`, `updated_at`, `deleted_at`

### folders
- `id` UUID primary key
- `company_id` UUID
- `parent_id` nullable UUID
- `name`
- `created_at`, `updated_at`

### news
- `id` UUID primary key
- `company_id` nullable UUID
- `title`, `slug`, `summary`, `content`
- `status` enum: `draft`, `published`, `scheduled`, `archived`
- `publish_at`
- `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`

### blogs
- `id` UUID primary key
- `company_id` nullable UUID
- `title`, `slug`, `content`
- `category_id`
- `tags` text[]
- `seo_title`, `seo_description`, `canonical_url`
- `status`, `publish_at`
- `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`

### ads
- `id` UUID primary key
- `company_id` UUID
- `title`, `banner_media_id`, `destination_url`
- `start_date`, `end_date`
- `status` enum: `active`, `inactive`, `expired`
- `impressions`, `clicks`, `analytics` JSONB
- `created_by`, `created_at`, `updated_at`, `deleted_at`

### jobs
- `id` UUID primary key
- `company_id` UUID
- `title`, `department`, `location`, `description`
- `expiry_date`
- `status` enum: `draft`, `active`, `expired`, `closed`
- `application_count`
- `created_by`, `created_at`, `updated_at`, `deleted_at`

### activity_logs
- `id` UUID primary key
- `actor_user_id` UUID
- `company_id` nullable UUID
- `action` text
- `entity_type`, `entity_id`
- `ip_address`, `user_agent`
- `metadata` JSONB
- `created_at`

## Migration notes

1. Deploy `admin.html` as the canonical admin route and configure `/Admin` and `/New` to redirect to `/admin.html` server-side when possible.
2. Replace the browser demo credentials with a server-side authentication provider before production launch.
3. Move localStorage data into the normalized schema above.
4. Store uploaded files in object storage with private buckets, signed upload URLs and virus scanning.
5. Add database indexes for `company_id`, `status`, `created_at`, `publish_at`, `expiry_date`, `slug`, and full-text search columns.
6. Preserve existing public URLs with redirects to avoid SEO regressions.

## Security recommendations

- Enforce RBAC on the API and database layer; client-side route protection is only UX, not security.
- Hash passwords with Argon2id or bcrypt and require MFA for admins.
- Use short-lived sessions with refresh token rotation and secure, HTTP-only cookies.
- Validate all inputs server-side with a schema validator.
- Validate file MIME type, extension, dimensions and size; scan uploads for malware.
- Use signed URLs for uploads/downloads and keep original media private by default.
- Add CSRF protection for cookie-based sessions.
- Rate-limit login, upload and destructive endpoints.
- Record immutable audit logs for login, create, update, delete, bulk delete, export and permission failures.
- Add Content Security Policy, security headers and dependency scanning in CI.

## Step-by-step implementation plan

1. Stabilize the static frontend and routes. Completed in this patch.
2. Introduce a backend API with auth, RBAC middleware and validation schemas.
3. Create database migrations for the proposed schema.
4. Replace localStorage CRUD with authenticated API calls.
5. Add secure object storage upload flow for media.
6. Add automated tests for permissions, CRUD, validation and audit logs.
7. Add monitoring, backup policy and admin analytics dashboards.
