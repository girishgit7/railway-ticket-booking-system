# Sprint 3 engineering audit and verification

## Snapshot audited

This report is based on the source tree supplied in `railway-ticket-booking-system(1).zip`.
The canonical Sprint 3 project is the outer folder containing `client/`, `server/`,
`railway_sprint2.cpp`, and `trains.txt`. The archive also contained an older nested
copy of the project and temporary patch/backup folders; those are not part of the
clean delivery.

## Changes applied in this pass

- Added a cross-process lock file around Node-to-C++ engine operations. The existing
  in-process Promise queue remains, and a stale lock is recovered only when its
  recorded process is no longer alive (or the lock is malformed and old).
- Added a real C++ integration test that compiles the adapter in a temporary directory
  and exercises search, booking, history, PNR lookup after a new process starts, and
  cancellation. Test data is isolated from the project's real booking files.
- Changed the server test command to run the complete Node test suite (`node --test`).
- Added API-wide and authentication-specific rate limits, and disabled Express's
  `X-Powered-By` header.
- Prevented an administrator from demoting the final remaining administrator.
- Corrected the C++ payment-mode label for `NET_BANKING` so it is not recorded as UPI.

## Verification performed

- C++17 adapter compilation with `-Wall -Wextra -Wpedantic -O2`: passed.
- TypeScript project check (`tsc -b`): passed.
- ESLint over the client: passed.
- Node syntax checks over server source and test files: passed.
- Server test suite: 3 passed, 0 failed.
- Vite production bundle: could not be completed in this Linux audit environment because
  the supplied `node_modules` archive lacked the Linux Rolldown native optional binding.
  This is an environment/dependency-platform issue, not a TypeScript error. Reinstall
  dependencies on the target machine with `npm ci` before running `npm run build`.

## Existing limitations that remain explicit

1. **Train inventory classes:** the original C++ engine has only Sleeper, AC, and
   General inventory/fare fields. AC3, AC2, and First AC still share one AC inventory
   and fare. The integration test confirms this legacy behavior; it does not pretend
   these are independent coach inventories.
2. **Admin train/schedule CRUD:** the current Admin Panel's train and schedule screens
   still use MongoDB models, while passenger search/booking use the C++ `trains.txt`
   and booking files. They are separate sources and must not be represented as synced.
3. **Schedules:** the C++ catalogue is a static demo timetable. It does not model
   official daily/weekly service calendars or per-date schedule records.
4. **Live data:** RailRadar is a separate, read-only third-party data source. Its live
   results do not create local bookable trains and are not official IRCTC inventory.
5. **Payments/refunds:** payments and refunds are simulated; no funds are collected
   or transferred.
6. **Official booking:** this application does not issue an official IRCTC ticket or
   reserve official Indian Railways inventory. That requires an authorized integration.
7. **Storage:** the C++ flat-file engine remains suitable for the academic single-host
   demonstration. The lock coordinates Node processes sharing this directory, but
   direct use of the standalone interactive C++ program can bypass the Node lock.
   Do not run the standalone CLI concurrently with the web app against the same files.

## Important credential hygiene

The uploaded archive contained `server/.env` and `client/.env.local`. These files are
excluded from the clean delivery. Rotate any real MongoDB credentials, JWT secret,
RailRadar API key, or other secrets that were present in those files. Keep the new
values only in your local untracked environment files; never commit or upload them.
