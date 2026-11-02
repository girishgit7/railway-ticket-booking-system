# Branch Coverage Report — Sprint 2

**Tool:** GCC `gcov -b`  
**Command:** `gcov -b -c railway_sprint2.cpp`  
**Source:** `railway_sprint2.cpp` at `fc2c53227724ae2fd914a0d1c4fb4815c1ee2727`

## Measured application branch coverage

```text
File 'railway_sprint2.cpp'
Branches executed:71.78% of 2672
Taken at least once:40.27% of 2672
```

GCC reports **2,672 instrumented application branches**, with **71.78% of branch sites executed** and **40.27% taken at least once**. The raw `gcov` output is committed as `docs/evidence/sprint2/coverage_gcov.txt`; the annotated source is `docs/evidence/sprint2/railway_sprint2.cpp.gcov`.

## Tested decision paths

The suite exercised valid and invalid menu/input paths, duplicate registration, short passwords, three-failure lockout, invalid dates, no-route search, invalid PNRs, full-class alternative output, over-limit seat recovery, booking confirmation/no-confirmation, all simulated payment options, repeat cancellation, ownership rejection, admin access control, add/update/remove, inventory validation, reporting, persistence, and audit paths.

## Uncovered or not safely executable

The percentage does not mean all semantic paths were validated. Remaining paths include filesystem open/write/rename failures, malformed persisted records, multi-process concurrency, Windows-specific password handling, platform-specific terminal behavior, some administrator failure branches, and unit-level module paths. These require additional harnesses or controlled fault injection and are not claimed as tested here.
