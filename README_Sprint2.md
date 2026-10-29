# Railway Reservation System — Sprint 2

## What changed
This update extends the existing Sprint 1 C++ console application while retaining its flat-file storage and sample train data.

- Passenger registration and login using contact/username and a password.
- Password entry is masked on Windows and Linux terminals; account passwords are stored as hashes, not plaintext.
- Account lockout after three failed password attempts.
- Booking history for the logged-in passenger.
- Ticket cancellation by PNR, seat restoration through confirmed-booking inventory calculations, and a simulated refund (10% cancellation charge; 90% refund).
- PNR status displays the cancellation status and refund amount.
- Administrator-only menu to add, update, and remove trains; configure seat capacity; and generate a date-range occupancy/revenue summary.
- Timestamped audit entries for bookings, cancellations, and administrator actions.
- Strict calendar-date validation (including leap years), addressing the Sprint 1 defect for dates such as `2026-02-31`.
- Alternative trains are listed when the selected class is full.
- Booking storage now preserves status/refund/account ownership. Existing 9-field Sprint 1 booking records are read as confirmed records for backward compatibility.

## Build and run

### Linux (GCC/G++)
```bash
g++ -std=c++17 -Wall -Wextra -pedantic railway_sprint1.cpp -o railway_sprint2
./railway_sprint2
```

### Windows (MinGW-w64 / g++)
Open PowerShell or Command Prompt in this folder:
```powershell
g++ -std=c++17 -Wall -Wextra -pedantic railway_sprint1.cpp -o railway_sprint2.exe
.\railway_sprint2.exe
```

Use a terminal for the masked password prompt. The program creates/updates local data files in the current working directory: `trains.txt`, `bookings.txt`, `users.txt`, and `audit.log`. Back these up before testing with real project data.

## Demo administrator
- Username: `admin`
- Password: `Railway@123`

This is a fixed academic-demo credential and must be changed before any real deployment. Do not use real passenger data or real payment credentials.

## Refund policy used in this prototype
The SRS mentions a cancellation-policy table but does not specify the actual rates. To make the cancellation flow testable, this implementation uses a clearly labelled demo policy: 10% cancellation charge and 90% simulated refund. No real payment or refund is performed.

## Important scope and limitations
- Train routes, fares, schedules, and capacities are illustrative sample data, not live railway data.
- Passwords are not stored in plaintext, but the bundled hash routine is a lightweight educational hash, **not a production password KDF**. A real deployment should use Argon2id, scrypt, or PBKDF2 with per-user salts and rate limiting.
- The application is a single-process, local-file prototype. It does not provide cross-process locking or multi-user network concurrency guarantees.
- The report's configured capacity is the sum of per-train class capacities; occupancy is based on confirmed bookings in the chosen date range. It is an academic summary, not an operational railway report.
- User ownership is enforced for newly created bookings. Legacy Sprint 1 bookings have no owner contact recorded and are retained for backward compatibility.

## Suggested Sprint 2 smoke tests
1. Register a passenger; verify a record is created in `users.txt` and no plaintext password is stored.
2. Log in with the correct password; try three wrong passwords for another test account and verify lockout.
3. Book a ticket and verify a unique PNR, fare, payment mode, and reduced availability.
4. Cancel that PNR; verify status becomes `CANCELLED`, the refund is displayed, and availability returns.
5. Try cancelling the same PNR again; verify it is rejected without changing data.
6. Search using `2026-02-31`; verify the program rejects it and asks for another date.
7. Log in as a passenger and attempt administration; verify the admin menu is unavailable.
8. Log in as `admin`; add/update/remove a train, configure inventory, and run a date-range report.
9. Exit and restart; verify users, trains, bookings, cancellation state, and audit entries persist.
