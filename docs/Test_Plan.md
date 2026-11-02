# Railway Ticket Booking System — Sprint 2 Test Plan

**QA owner:** Hanumantha L (PES2UG24CS179)  
**Baseline:** Original repository `main` at `fc2c53227724ae2fd914a0d1c4fb4815c1ee2727`
**Implementation:** `railway_sprint2.cpp`  
**Plan basis:** Existing `Team1_STP_Railway_Ticket_Reservation_System.pdf`, SRS in `README.md`, SAD PDF, and `README_Sprint2.md`.

## Objective and scope

This plan verifies the Sprint 2 implementation without changing application source. Scope includes passenger registration, duplicate registration, login, account lockout, route/date search, availability, alternative trains, booking, berth preference, PNR/ticket generation, fare and simulated Cash/Card/UPI payment, cancellation/refund/status, booking history, persistence, audit logging, administrator authentication, train administration, inventory configuration, and revenue reporting.

The two Sprint 1 defects are regression targets:

- **DEF-001 / RRS-F-006:** alternative train suggestions when a selected class is full.
- **DEF-002 / RRS-SR-003:** rejection of impossible calendar dates such as `2026-02-31`.

## Test levels and types

Functional and system tests were executed through the CLI in a disposable Linux environment. Integration behavior was exercised across the CLI, file persistence, booking state, cancellation state, and audit log. Negative and boundary tests covered duplicate contacts, short passwords, invalid dates, invalid menu/PNR input, account lockout, over-limit seat requests, repeat cancellation, and unauthorized cancellation. Regression tests covered both Sprint 1 defects. Coverage was measured with GCC `gcov -b -c`.

The evidence records **22 executed process scenarios**: 18 primary-suite scenarios plus 4 supplemental scenarios. These scenarios map to **36 documented test cases** in the test-case document: 31 PASS, 4 BLOCKED, and 1 NOT TESTED. The counts are not interchangeable because one process scenario can cover multiple documented cases.

A separate unit-test framework was not present in the single-file implementation. Function-level behavior was therefore exercised through CLI and persistence probes; true isolated unit tests remain a limitation and are marked accordingly in the test case document. Windows, multi-process concurrency, formal performance timing, filesystem fault injection, formal three-user usability, and production payment settlement were not executable in this Linux sandbox and are marked BLOCKED or NOT TESTED.

## Environment and commands

- Linux x86-64 sandbox
- GCC/G++ with C++17
- Repository evidence directory: `docs/evidence/sprint2/`
- Source copied without edits from the baseline commit

```bash
g++ -std=c++17 -Wall -Wextra -pedantic --coverage railway_sprint2.cpp -o railway_sprint2
python3 sprint2-test-runner.py
gcov -b -c railway_sprint2.cpp
```

The application created only disposable `trains.txt`, `users.txt`, `bookings.txt`, and `audit.log` files in the test directory. Evidence is stored under `docs/evidence/sprint2/`.

## Entry and exit criteria

Entry criteria were met: the source compiled successfully and sample train data was available. The complete STP exit criteria are not claimed because separate unit tests, Windows portability, concurrency/stress testing, formal usability testing, and some performance measurements were not completed. All executed high-priority Sprint 2 CLI scenarios passed; the two Sprint 1 regression defects were fixed in the tested baseline.

## Test data and safety

Only synthetic names, contacts, and passwords were used. No real payment credentials or passenger data were used. The demo administrator credential is documented by the project as `admin / Railway@123` and was used only in the disposable test copy.
