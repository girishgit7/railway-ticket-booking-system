# Sprint 3 integration: C++ engine + MERN + live railway information

## Canonical project folder

Apply this patch at the outer repository root: the folder containing `client/`, `server/`, `railway_sprint2.cpp` and `trains.txt`. The uploaded archive also contains a nested legacy duplicate folder named `railway-ticket-booking-system/`; do not launch or edit that nested copy for Sprint 3.

## Architecture

- React + TypeScript calls the Express API.
- Express authenticates users with the existing MongoDB/JWT account system.
- Passenger booking, PNR lookup, booking history and cancellation now invoke the original C++ Sprint 2 engine through `server/engine/railway_api.cpp`.
- The C++ engine reads and writes the project's existing `trains.txt`, `bookings.txt` and `audit.log` files in the repository root. MongoDB remains responsible for MERN account/authentication data and the existing admin account records.
- RailRadar calls are made server-side; the API key is never sent to React. Live schedule/status/seat-availability data is read-only and clearly separate from local demo seat inventory.

## Prerequisites

1. Node.js 20+ (Node 22 recommended).
2. MongoDB Atlas or local MongoDB for account authentication.
3. A C++17 compiler available as `g++` in PATH (MinGW-w64/MSYS2 on Windows).
4. A RailRadar API key for live timetable/status features. The free plan is currently limited to 100 requests/month and 10 requests/minute; responses are cached for 60 seconds.

## Setup (Windows PowerShell)

```powershell
cd .\server
Copy-Item .env.example .env
# Edit .env and set MONGODB_URI, a random JWT_SECRET, and RAILRADAR_API_KEY.
npm install
npm run build:engine
npm run dev
```

In another terminal:

```powershell
cd .\client
npm install
npm run dev
```

Open `http://localhost:5173`. The first API request can also compile the C++ engine automatically; explicit `npm run build:engine` is recommended after any C++ source change.

## API routes added

- `GET /api/engine/search?source=Bengaluru&destination=Chennai&date=YYYY-MM-DD` — search the original C++ train catalogue.
- `POST /api/engine/bookings` — authenticated booking through C++.
- `GET /api/engine/bookings/my` — authenticated booking history from C++ files.
- `GET /api/engine/bookings/pnr/:pnr` — own-ticket lookup (10-digit C++ PNR).
- `POST /api/engine/bookings/pnr/:pnr/cancel` — own-ticket cancellation through C++.
- `GET /api/engine/admin/bookings` — C++ booking records for admins.
- `GET /api/live/stations/search?q=...` — RailRadar station autocomplete.
- `GET /api/live/trains/between?from=SBC&to=MAS&date=YYYY-MM-DD` — external timetable search by station code.
- `GET /api/live/trains/:number/live?date=YYYY-MM-DD` — running status.
- `GET /api/live/trains/:number/schedule` — train timetable.
- `GET /api/live/trains/:number/seats?source=SBC&destination=MAS&journeyDate=YYYY-MM-DD&classCode=3A&quotaCode=GN` — third-party seat-availability forecast (non-authoritative; no booking).

## Important behaviour and limitations

- The current C++ catalogue is still illustrative demo data. It is not replaced by RailRadar's timetable, and external live train results are not bookable in this academic app. Only trains in `trains.txt` can be booked using local demo inventory.
- Payments and refunds are simulated. No money is collected or returned.
- This app does not issue an IRCTC ticket, access the official IRCTC reservation inventory, or confirm an official railway reservation. RailRadar is independent of Indian Railways/IRCTC; its reservation endpoints are third-party/non-authoritative. Users must verify critical details on official railway channels.
- The C++ booking file stores passenger names, ages, genders and berth preferences for web bookings in an additional trailing field while retaining compatibility with old booking rows. The original CLI's older booking records remain readable.
- The Node API serializes C++ engine operations within one server process to reduce concurrent flat-file write conflicts. Do not run multiple Express server instances or the standalone C++ interactive program against the same data files at the same time. This flat-file store is appropriate for the project demo, not production multi-instance traffic.
- C++ uses a three-class inventory model (Sleeper, AC, General). AC2/AC3/First AC are currently mapped to the C++ AC inventory and fare; they are not separate real-world coach inventories.
- MongoDB still stores user accounts and admin metadata. The web booking system no longer mounts the older MongoDB booking routes; the C++ files are the single booking source used by the web UI. The admin overview counts C++ bookings, but the existing admin train/schedule CRUD screens still operate on MongoDB records and are not yet synchronized to the C++ catalogue.

## Security

- Never commit `.env`, `.env.local`, API keys, MongoDB credentials, JWT secrets or admin passwords. The uploaded archive contained `server/.env`; rotate any real credentials from that file.
- Public registration always creates passenger accounts. Use the existing seed-admin procedure for admin access.
- The standalone C++ interactive admin login no longer has a hard-coded default password. Configure `RAILWAY_CPP_ADMIN_CONTACT` and `RAILWAY_CPP_ADMIN_PASSWORD` in the shell before starting the standalone executable if you need its separate local admin login. Web admin access continues to use MongoDB role + JWT middleware.

## Verification

From the repository root, compile and smoke-test the engine:

```powershell
cd .\server
npm run build:engine
cd ..
.\server\bin\railway_engine.exe --api search Bengaluru Chennai 2026-11-09
```

Run client checks:

```powershell
cd .\client
npm run lint
npm run build
```

Then test with a disposable passenger account and a future journey date. The live endpoints require a valid RailRadar key; the booking engine does not.
