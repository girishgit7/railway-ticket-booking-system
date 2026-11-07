# Sprint 3 MERN implementation patch

This patch adds the passenger booking interface and protected admin console, plus admin API routes and an explicit initial-admin seed script. It does not modify the independent C++ application.

## Apply the patch

Copy the contents of `client/` into the existing project `client/` folder, preserving paths. Copy the contents of `server/` into the existing `server/` folder, preserving paths. Allow replacement only for `server/src/server.js` and `server/package.json`; the new admin files should be added. Keep your existing `.env` files and do not overwrite them.

## Admin setup

In `server/.env`, add these variables (use a unique password, at least 14 characters):

```env
ADMIN_NAME=Railway Administrator
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=use-a-unique-long-random-password
```

Run once from the server folder:

```powershell
npm run seed:admin
```

If that email already exists, the script verifies `ADMIN_PASSWORD` against that account before promoting it; it never changes the existing password. If it does not exist, it creates the initial admin account using the supplied password. Remove `ADMIN_PASSWORD` from `.env` after setup. Do not expose this seed script as an HTTP endpoint. Public registration always creates passenger accounts and cannot request admin role.

## Start and test

Terminal 1 (server):

```powershell
cd path\to\your\project\server
npm run dev
```

Terminal 2 (client):

```powershell
cd path\to\your\project\client
npm run dev
```

The frontend expects `VITE_API_URL=http://localhost:5000/api` in `client/.env.local` (or uses that default).

## MongoDB requirement for cancellation

The existing cancellation controller uses a MongoDB transaction so that the booking status, refund record and seat restoration succeed or roll back together. Transactions require a replica set or sharded cluster. MongoDB Atlas supports this. A standalone local `mongod` instance does not. Do not replace this with separate non-transactional writes; that can produce duplicate refunds or incorrect seat counts.

## Admin API

All routes below require a valid JWT for a user whose database role is `admin`:

- `GET /api/admin/overview`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/role` with `{ "role": "passenger" | "admin" }`
- `GET /api/admin/trains`
- `POST /api/admin/trains`
- `PATCH /api/admin/trains/:id`
- `POST /api/admin/schedules`
- `GET /api/admin/bookings`
- `GET /api/admin/audit`

The admin UI includes overview, user-role management, train creation/activation, schedule creation, bookings and audit log. Train deletion is intentionally avoided because existing schedules/bookings may reference it; deactivate trains instead.

## Important scope note

Payment modes are simulated only. This project does not charge real money or connect to a payment gateway. Test bookings with a non-production database first. The patch is code-level implementation, not proof of a successful live integration; run the test checklist against your own MongoDB data before submission.
