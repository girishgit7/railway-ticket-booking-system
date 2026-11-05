# Railway Reservation System — Sprint 2

## Overview
Sprint 2 extends the C++17 console application with passenger registration/login, booking history, cancellation and simulated refunds, administrator train management, inventory configuration, and date-range reporting. The original C++ implementation remains the primary deliverable.

## Build and run

Run these commands from the repository root.

### Linux / macOS
```sh
g++ -std=c++17 -Wall -Wextra -pedantic railway_sprint2.cpp -o railway_sprint2
./railway_sprint2
```

Or use the helper script:
```sh
chmod +x build_linux.sh
./build_linux.sh
./railway_sprint2
```

### Windows (MinGW-w64 / MSYS2)
```powershell
g++ -std=c++17 -Wall -Wextra -pedantic railway_sprint2.cpp -o railway_sprint2.exe
.\\railway_sprint2.exe
```

Run in a real terminal for masked password input. Data files are read/written relative to the current working directory: `trains.txt`, `bookings.txt`, `users.txt`, and `audit.log`.

## Demo administrator
- Username: `admin`
- Password: `Railway@123`

This fixed credential is for academic demonstration only. Do not use real passenger or payment data.

## Behaviour and limitations
- Routes, timings, fares, and capacities in `trains.txt` are illustrative demo data, not live railway information.
- Cash/Card/UPI and refunds are simulated; cancellation uses a 10% demo charge and 90% simulated refund.
- The bundled FNV-1a password hash is educational only, not a secure password KDF. Production software should use Argon2id, scrypt, or PBKDF2 with unique salts.
- This is a single-process local-file prototype; it does not provide cross-process locking or network concurrency.
- Existing 9-field Sprint 1 booking records are loaded as confirmed legacy bookings. Since they do not contain an account owner, only the administrator can view or cancel them after this security fix.
- Passenger PNR lookup and cancellation are restricted to bookings owned by the logged-in account.

## Sprint 2 smoke-test checklist
1. Register a passenger; verify `users.txt` contains a hash rather than the plaintext password.
2. Log in with the correct password; test three failed attempts on a separate account and confirm lockout.
3. Book a ticket; verify PNR, fare, payment mode, owner, and availability reduction.
4. Try to view and cancel another passenger's PNR; confirm access is denied.
5. Cancel the passenger's own booking; confirm status/refund and restored availability.
6. Try cancelling the same PNR twice; confirm the second attempt is rejected.
7. Enter an invalid date such as `2026-02-31`; confirm it is rejected.
8. Log in as a passenger and verify admin functions are unavailable.
9. Log in as admin; add, update (including fares), remove a train, configure inventory, and generate a report.
10. Restart the application and verify train, user, booking, cancellation, and audit data persist.
