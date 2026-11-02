# Sprint 2 Test Case Document

**Tester:** Hanumantha L (PES2UG24CS179)  
**Baseline:** `fc2c53227724ae2fd914a0d1c4fb4815c1ee2727`  
**Evidence root:** `docs/evidence/sprint2/`

Status meanings: **PASS** = executed with supporting evidence; **FAIL** = executed and requirement mismatch observed; **BLOCKED** = prerequisite/environment/measurement unavailable; **NOT TESTED** = outside executable scope or not attempted.

| ID | Requirement | Scenario / input | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| TC-Auth-01 | RRS-F-001 | Register Alice QA with contact `9000000001`, password `secret1` | Account saved | Registration succeeded | PASS | `01_registration_valid.out`, `users.txt` |
| TC-Auth-02 | RRS-F-001 | Register another user with existing contact | Duplicate rejected | `That contact is already registered.` | PASS | `02_registration_duplicate.out` |
| TC-Auth-03 | RRS-F-001 | Register password shorter than six characters | Short password rejected | Minimum-length message displayed | PASS | `03_registration_short_password.out` |
| TC-Auth-04 | RRS-F-002 | Login with correct Alice credentials | User authenticated | `Welcome, Alice QA.` | PASS | `04_login_success_history.out` |
| TC-Auth-05 | RRS-F-003 | Three wrong passwords, then correct password | Account locks after third failure | Fourth attempt reported account locked | PASS | `05_lockout.out`, `users.txt` |
| TC-Search-01 | RRS-F-004 | Search Bengaluru → Chennai on valid date | Matching trains listed | Matching routes and classes displayed | PASS | `06_invalid_date.out`, `14_alternative_full_class.out` |
| TC-Search-02 | RRS-F-005 | Inspect Sleeper/AC/General availability | Counts and fares displayed | All three classes displayed | PASS | `14_alternative_full_class.out` |
| TC-Search-03 | RRS-F-006 | Select train 12007 Sleeper, which has zero capacity | Alternative trains displayed | Alternatives including train 16526 displayed | PASS / regression fixed | `14_alternative_full_class.out` |
| TC-Book-01 | RRS-F-007 | Book 2 General seats on train 16526 | Booking confirmed if inventory exists | Confirmed ticket generated | PASS | `09_booking.out` |
| TC-Book-02 | RRS-F-008 | Select Upper berth | Preference recorded | Ticket showed Upper | PASS | `09_booking.out` |
| TC-Book-03 | RRS-F-009 | Inspect generated PNR | Unique numeric PNR generated | PNR `1893602221` generated in final suite run | PASS | `09_booking.out`, `booking_pnr.txt` |
| TC-Book-04 | RRS-F-010 | Confirmed booking and cancellation state | Inventory calculation changes with confirmed status | Booking/cancellation state persisted and recalculated | PASS / scope-limited | `09_booking.out`, `12_cancellation.out`, `bookings.txt` |
| TC-Book-05 | RRS-F-011 | Request 999 seats, then valid recovery input | Excess request rejected | Invalid range message displayed; flow recovered | PASS | `15_overbooking_boundary.out` |
| TC-Pay-01 | RRS-F-012 | Book 2 General seats at demo fare | Total fare equals fare table | Fare and ticket total displayed | PASS | `09_booking.out` |
| TC-Pay-02 | RRS-F-013 | Use UPI, Cash, and Card in separate bookings | Selected mode stored/displayed | All three modes displayed | PASS | `09_booking.out`, `20_cash_booking.out`, `21_card_booking.out` |
| TC-Pay-03 | RRS-F-014 | Inspect e-ticket fields | PNR, passenger, train, route, date, class, seats, berth, fare, status present | Required fields present | PASS | `09_booking.out` |
| TC-Cancel-01 | RRS-F-015 | Cancel a confirmed PNR | Status changes to CANCELLED | Cancellation succeeded | PASS | `12_cancellation.out` |
| TC-Cancel-02 | RRS-F-016 | Cancel booked seats | Seats reported restored | Restoration message displayed; file state updated | PASS / scope-limited | `12_cancellation.out`, `bookings.txt` |
| TC-Cancel-03 | RRS-F-017 | Apply demo 10% cancellation charge | Refund equals 90% of fare | Charge and refund displayed | PASS | `12_cancellation.out` |
| TC-Cancel-04 | RRS-F-018 | Check cancelled PNR status | Status/refund displayed | CANCELLED and refund displayed after restart | PASS | `13_repeat_cancel_and_status.out` |
| TC-History-01 | RRS-F-019 | View Alice booking history | Account-linked bookings listed | Booking history displayed | PASS | `11_history_before_cancel.out` |
| TC-Admin-01 | RRS-SR-002 | Passenger selects administration option | Access denied/unavailable | Invalid option for passenger account | PASS | `17_admin_gate.out` |
| TC-Admin-02 | RRS-F-020 | Admin add, update, remove train 99999 | Changes persist and report success | Add, update, remove all succeeded | PASS | `16_admin_flow.out` |
| TC-Admin-03 | RRS-F-021 | Admin change capacities for train 99999 | New inventory saved | Inventory updated | PASS | `16_admin_flow.out` |
| TC-Admin-04 | RRS-F-022 | Admin generate date-range report | Report shows seats/revenue/capacity | Report generated | PASS | `16_admin_flow.out` |
| TC-Rel-01 | RRS-NF-003 | Restart and query prior PNR | Booking persists | Confirmed ticket recovered after restart | PASS | `10_pnr_after_restart.out` |
| TC-Sec-01 | RRS-SR-001 | Inspect password entry and users file | Input masked; no plaintext password | Terminal password input was non-echoed; users file stores hash | PASS / Linux evidence | `01_registration_valid.out`, `users.txt` |
| TC-Sec-02 | RRS-SR-002 | Passenger attempts admin action | Access restricted | Admin menu unavailable to passenger | PASS | `17_admin_gate.out` |
| TC-Sec-03 | RRS-SR-003 | Search with `2026-02-31` | Impossible date rejected | Rejected and valid date requested | PASS / regression fixed | `06_invalid_date.out` |
| TC-Sec-04 | RRS-SR-004 | Inspect booking/cancellation/admin logs | Timestamped actions recorded | Audit entries present | PASS | `audit.log` |
| TC-Sec-05 | RRS-SR-005 | Repeat cancellation and cross-account cancellation | State-changing action rejected | Repeat and wrong-owner cancellations rejected | PASS | `13_repeat_cancel_and_status.out`, `22_cross_account_cancel.out` |
| TC-Perf-01 | RRS-NF-001 | Search response under normal load | ≤2 seconds | Not formally measured with a timing harness | BLOCKED | Not collected |
| TC-Rel-02 | RRS-NF-002 | Multi-process rapid booking/concurrency | No over-allocation | Single-process CLI only; no concurrency harness | BLOCKED | Not collected |
| TC-UX-01 | RRS-NF-004 | Three-user unaided walkthrough | All users complete booking | No three-user study performed | BLOCKED | Not collected |
| TC-Port-01 | RRS-NF-005 | Build/run Windows and Linux | Both platforms pass | Linux only in available environment | BLOCKED | Linux build evidence |
| TC-Unit-01 | STP unit strategy | Isolated function tests via framework | Unit-level results | No separable unit-test target/framework in monolithic source | NOT TESTED | Architecture limitation |

## Summary

Executed cases passed except none in the executed scope. The two Sprint 1 regression cases passed against Sprint 2. The blocked/not-tested cases are explicitly not claimed as complete.
