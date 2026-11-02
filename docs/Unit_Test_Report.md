# Unit Test Report — Sprint 2

**Tester:** Hanumantha L  
**Source baseline:** `fc2c53227724ae2fd914a0d1c4fb4815c1ee2727`  
**Environment:** Linux x86-64, GCC C++17

## Method

The implementation is a single 620-line CLI translation unit. It does not expose a unit-test target, headers, dependency injection boundary, or framework tests. Therefore, a separate Unity/CUnit unit suite could not be executed without modifying the application design, which was outside this QA task. Function behavior was exercised through deterministic CLI probes and file assertions instead; these are system-level black-box checks, not claimed as isolated unit tests.

## Function-level behaviors exercised

| Behavior | Input/probe | Actual result | Status |
|---|---|---|---|
| `validDate` through search | `2026-02-31`, then valid date | Invalid date rejected; valid date accepted | PASS |
| `readInt` bounds | Menu `99`, seat request `999` | Range error and recovery | PASS |
| Registration duplicate check | Existing contact `9000000001` | Duplicate rejected | PASS |
| Password hashing/storage | Register Alice; inspect `users.txt` | Hash field stored, not plaintext | PASS |
| Lockout state transition | Three wrong passwords | Account locked | PASS |
| Booking PNR generation | Successful booking | Numeric PNR created | PASS |
| Fare/payment mapping | UPI, Cash, Card bookings | Selected modes and fare displayed | PASS |
| Cancellation/refund calculation | Cancel confirmed booking | 10% charge and 90% refund displayed | PASS |
| Ownership guard | Bob cancels Alice’s PNR | Rejected as not owned | PASS |
| Admin state operations | Add/update/inventory/report/remove | Each operation succeeded | PASS |

## Build command

```bash
g++ -std=c++17 -Wall -Wextra -pedantic --coverage railway_sprint2.cpp -o railway_sprint2
```

The build completed without compiler errors. The complete command transcripts and outputs are under `docs/evidence/sprint2/`.

## Limitations

No isolated unit-test executable was created, no source was refactored to make functions linkable, and no unit framework was introduced. A future developer task should extract Auth, Search, Booking, Cancellation, and Admin modules behind testable interfaces and add true unit tests.
