# Newteach

Firebase-backed NewTech website and admin dashboard.

## Runtime setup

1. Copy `firebase-config.example.js` to `firebase-config.js`.
2. Fill the Firebase web app config.
3. Enable Firebase Auth, Firestore and Firebase Storage.
4. Create an active `users/{uid}` document with role `Super Admin`, `Company Admin` or `Editor`.
5. Open `admin.html` to manage content and `index.html` to view the Firestore-powered website.

See `ARCHITECTURE_REVIEW.md` for the full audit, implemented collections and recommended Firebase rules.
