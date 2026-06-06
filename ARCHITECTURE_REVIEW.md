# NewTech Website/Admin Audit and Firebase Implementation

## Executive summary

The repository was a static prototype: the public website (`index.html`) contained hardcoded text, remote image URLs, a fake contact submission, and no database reads. The admin dashboard (`admin.html`) previously simulated CRUD with in-memory/local browser state. This meant the dashboard existed visually, but it was not the source of truth for the website.

This update converts the static prototype into a Firebase-backed implementation that can run as the requested single source of truth once `firebase-config.js` is populated with a real Firebase web app configuration.

## Disconnected pages found

| Area | Previous state | Current state |
| --- | --- | --- |
| Public website | Hardcoded company details, images, gallery, contact details and product content. | Reads company profile, media, ads, news, blogs and jobs from Firestore via `public-site.js`. |
| Admin dashboard | Fake demo login and local CRUD state. | Uses Firebase Auth, role profile documents and Firestore CRUD via `admin-dashboard.js` and `firebase-app.js`. |
| Media library | Metadata-only URL form; no real storage upload. | Uploads images/videos to Firebase Storage, creates thumbnails, stores URLs/metadata in `media`. |
| News/blog/jobs/ads | UI records could be edited locally only. | Create/edit/delete operations write Firestore documents that the website subscribes to. |
| Activity logs | Demo log entries only. | Login, logout, create, edit, delete and media upload actions are written to `activityLogs`. |
| Mobile dashboard | Prototype responsive shell. | Mobile-first dashboard shell with slide-out sidebar and single-column forms/cards. |

## Firestore collections implemented

The shared Firebase layer expects the requested collections:

- `users`
- `companies`
- `media`
- `news`
- `blogs`
- `jobs`
- `ads`
- `activityLogs`

## Role based access control

The client enforces UX-level RBAC:

| Role | Read/write modules |
| --- | --- |
| Super Admin | users, companies, media, news, blogs, jobs, ads, activityLogs |
| Company Admin | companies, media, news, blogs, jobs, ads, activityLogs |
| Editor | media, news, blogs |

> Important: client-side RBAC is not sufficient for production security. Mirror these rules in Firebase Security Rules before going live.

## Media management coverage

Implemented in `admin-dashboard.js` + `firebase-app.js`:

- Real image upload to Firebase Storage
- Real video upload to Firebase Storage
- Drag-and-drop upload
- Upload progress bar
- Image thumbnail generation with canvas
- Video poster thumbnail generation with video/canvas
- Delete media from Storage and Firestore
- Edit media details
- Replace media
- Bulk upload
- Bulk delete
- Stored media URL, thumbnail URL, storage path, MIME type, size, metadata, `createdAt`, `updatedAt`

## Website integration coverage

The public website renders from Firestore only:

- Company logo/cover/details: `companies`
- Gallery images/videos: `media`
- News: `news`
- Blogs: `blogs`
- Jobs: `jobs`
- Advertisements: `ads`

Draft/inactive content is hidden. Published/active records appear immediately through Firestore listeners.

## Deployment steps

1. Create a Firebase web app.
2. Enable Firebase Auth email/password sign-in.
3. Enable Firestore and Firebase Storage.
4. Copy `firebase-config.example.js` to `firebase-config.js` or inject `window.NEWTECH_FIREBASE_CONFIG` before `firebase-app.js` loads.
5. Create a `users/{uid}` document for the first admin:

```json
{
  "name": "Site Owner",
  "email": "owner@example.com",
  "role": "Super Admin",
  "status": "active"
}
```

6. Publish the static files, or move the same HTML/JS modules into a Next.js app shell if a full Next.js repository is introduced.

## Recommended Firebase Security Rules

These are starter rules and should be tightened for company-level tenancy before production:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function profile() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
    function active() { return signedIn() && profile().status == 'active'; }
    function superAdmin() { return active() && profile().role == 'Super Admin'; }
    function companyAdmin() { return active() && profile().role == 'Company Admin'; }
    function editor() { return active() && profile().role == 'Editor'; }

    match /users/{id} { allow read, write: if superAdmin(); }
    match /companies/{id} { allow read: if true; allow write: if superAdmin() || companyAdmin(); }
    match /media/{id} { allow read: if true; allow write: if superAdmin() || companyAdmin() || editor(); }
    match /news/{id} { allow read: if true; allow write: if superAdmin() || companyAdmin() || editor(); }
    match /blogs/{id} { allow read: if true; allow write: if superAdmin() || companyAdmin() || editor(); }
    match /jobs/{id} { allow read: if true; allow write: if superAdmin() || companyAdmin(); }
    match /ads/{id} { allow read: if true; allow write: if superAdmin() || companyAdmin(); }
    match /activityLogs/{id} { allow read: if superAdmin() || companyAdmin(); allow create: if active(); allow update, delete: if false; }
  }
}
```

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function signedIn() { return request.auth != null; }
    match /media/{allPaths=**} { allow read: if true; allow write: if signedIn(); }
    match /thumbnails/{allPaths=**} { allow read: if true; allow write: if signedIn(); }
  }
}
```

## Remaining production recommendations

- Convert the static files into an actual Next.js application when the repo contains a Next.js scaffold.
- Persist contact form submissions to a `leads` collection if enquiry tracking is required.
- Add Cloud Functions for server-side video transcoding and malware scanning.
- Add Firestore composite indexes if high-cardinality filtering/sorting is introduced.
