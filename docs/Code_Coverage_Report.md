# Code Coverage Report — Sprint 2

**Tool:** GCC `gcov`  
**Command:** `gcov -b -c railway_sprint2.cpp`  
**Source:** `railway_sprint2.cpp` at `fc2c53227724ae2fd914a0d1c4fb4815c1ee2727`  
**Instrumentation build:** `g++ -std=c++17 -Wall -Wextra -pedantic --coverage railway_sprint2.cpp -o railway_sprint2`

## Measured application coverage

The report entry for the application source was:

```text
File 'railway_sprint2.cpp'
Lines executed:86.20% of 413
Branches executed:71.78% of 2672
Taken at least once:40.27% of 2672
Calls executed:66.74% of 1828
```

This report separates the application source from the many standard-library headers also printed by `gcov`. Percentages are from the actual final suite plus the Cash/Card/ownership supplemental scenarios, not estimates.

## Evidence and interpretation

- Raw summary: `docs/evidence/sprint2/coverage_gcov.txt`
- Line-level annotated output: `docs/evidence/sprint2/railway_sprint2.cpp.gcov`
- Suite result: `docs/evidence/sprint2/suite_summary.txt`
- Supplemental result: `docs/evidence/sprint2/supplement_assertions.txt`

The 13.80% of application lines not executed and the uncovered branches require additional negative/error, storage-failure, and platform-specific tests. Coverage is a measurement of executed code, not a proof of correctness.
