# Authentication

Uses the existing NestJS JWT/HttpOnly cookie and MailService. No schema change or migration is required.

Endpoints (frontend forwards through `/api/auth/...`):

- `POST /auth/register`: three member types, always PENGUNJUNG, initially unverified.
- `GET /auth/verify-email?token=...`: verification token; invalid/expired error codes; repeat verification is safe.
- `POST /auth/resend-verification`: `{ email }`, 60-second cooldown.
- `POST /auth/login`: `{ email, password, remember? }`, sets `perpus_session`; unverified accounts receive 403 `EMAIL_NOT_VERIFIED`.
- `GET /auth/me`: safe current user, including `emailVerified`; no password hash.
- `POST /auth/logout`: clears the cookie.
- `POST /auth/forgot-password`: `{ email }`; sends a one-hour reset link through the existing SMTP service.
- `POST /auth/reset-password`: `{ token, password }`; minimum 8 characters, maximum 72 UTF-8 bytes (bcrypt limit).

Frontend pages: `/register`, `/login`, `/verify-email`, `/check-email`, `/forgot-password`, `/reset-password`. Registration success displays a waiting state with the registered email and resend button. Server layouts protect `/admin` and `/pengunjung` using the backend current user.

Reset tokens use a separate JWT purpose, issuer/audience and secret; a keyed fingerprint of the current password hash binds the token to that password. An atomic conditional update changes the hash once and invalidates all previous reset links. Session credentials are also bound to the hash, so password reset invalidates old sessions. Cookies issued before this change require a fresh login.

## Configuration

Copy the variable names from `.env.example` and supply real values privately in `.env`. Keep `JWT_SECRET`, `EMAIL_VERIFICATION_SECRET` and `PASSWORD_RESET_SECRET` distinct and random; email/reset secrets require at least 32 characters.

Set `EMAIL_VERIFICATION_URL=http://localhost:3000/verify-email` and `PASSWORD_RESET_URL=http://localhost:3000/reset-password` locally; use your frontend HTTPS URLs in production. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, plus existing `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` and `PORT`. Frontend `API_URL` defaults to `http://127.0.0.1:3001`; set it if the backend is hosted elsewhere.

SMTP failure never rolls back a successfully created account or claims that its verification message was sent. Resend and forgot-password return readable service errors when mail cannot be sent. Delivery to actual inboxes, provider credentials and production TLS require configured production SMTP; local capture checks do not prove external delivery.

## Minimal verification

Build backend with `npm.cmd run build`. The existing MySQL verification script now additionally checks session/logout and reset, including expired/reused tokens and password hashing. It creates uniquely named accounts and removes only those accounts in cleanup. Optionally `AUTH_FRONTEND_SMOKE=1` also checks frontend pages, proxies and server role redirects against a running Next dev server on port 3000; port 3001 must be free. Configure `EMAIL_VERIFICATION_TEST_DATABASE_URL` explicitly as an existing test database or `perpus_db` before running the script. Test SMTP stays on loopback and does not send externally.
