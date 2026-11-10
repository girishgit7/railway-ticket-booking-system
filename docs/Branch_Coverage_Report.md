# Branch Coverage Report — Sprint 2

**Tester:** Hanumantha L (PES2UG24CS179)
**Application:** `railway_sprint2.cpp`
**Baseline:** `fc2c53227724ae2fd914a0d1c4fb4815c1ee2727`
**Environment:** Linux x86-64, GCC/G++ C++17
**Evidence:** `docs/evidence/sprint2/`
**Tool:** GCC `gcov -b`  
**Command:** `gcov -b -c railway_sprint2.cpp`

## Measured application branch coverage

```text
File 'railway_sprint2.cpp'
Branches executed:71.78% of 2672
Taken at least once:40.27% of 2672
```

GCC reports **2,672 instrumented application branches**, with **71.78% of instrumented branch sites executed** and **40.27% of instrumented branches taken at least once**. These are different GCC metrics: the first indicates how many branch sites were reached during execution, while the second indicates how many individual branch outcomes were observed at least once. Therefore, 71.78% is not presented as conventional branch coverage without this qualification. The raw `gcov` output is committed as `docs/evidence/sprint2/coverage_gcov.txt`; the annotated source is `docs/evidence/sprint2/railway_sprint2.cpp.gcov`.

## Tested decision paths

The suite exercised valid and invalid menu/input paths, duplicate registration, short passwords, three-failure lockout, invalid dates, no-route search, invalid PNRs, full-class alternative output, over-limit seat recovery, booking confirmation/no-confirmation, all simulated payment options, repeat cancellation, ownership rejection, admin access control, add/update/remove, inventory validation, reporting, persistence, and audit paths.

## Uncovered or not safely executable

The percentage does not mean all semantic paths were validated. Remaining paths include filesystem open/write/rename failures, malformed persisted records, multi-process concurrency, Windows-specific password handling, platform-specific terminal behavior, some administrator failure branches, and unit-level module paths. These require additional harnesses or controlled fault injection and are not claimed as tested here.

## Current server test-suite measurement

**Measured:** 2026-11-10
**Environment:** Node.js v24.11.1
**Command:** `npm run test:coverage` (from `server/`)
**Result:** 3 tests passed; 0 failed.

| File | Branch coverage |
|---|---:|
| `server/src/services/railRadar.js` | 87.50% |

This is Node's branch coverage for the JavaScript module loaded by the current server tests. It is not a repository-wide percentage: the C++ integration test runs an uninstrumented binary, and the client currently has no test script. The 71.78% / 40.27% GCC figures above belong to the separate Sprint 2 measurement of `railway_sprint2.cpp`.
