# Sprint 2 Defect Log and Regression Status

**Tester:** Hanumantha L (PES2UG24CS179)
**Application:** `railway_sprint2.cpp`
**Baseline tested:** `fc2c53227724ae2fd914a0d1c4fb4815c1ee2727`  
**Environment:** Linux x86-64, GCC/G++ C++17
**Original Sprint 1 evidence:** `qa/sprint1/defect_log.md`
**Sprint 2 evidence:** `docs/evidence/sprint2/`

## DEF-001 — Alternative train suggestions when selected class is full

- **Requirement:** RRS-F-006
- **Original severity:** Medium
- **Original actual behavior:** Generic message without an alternative train list.
- **Retest steps:** Log in as a passenger; choose Book Ticket; enter Bengaluru → Chennai, date `2026-11-04`; choose train `12007`; choose Sleeper, which has zero capacity.
- **Expected:** Alternative trains for the same route are displayed.
- **Actual in Sprint 2:** The application printed `Alternative trains on the same route:` and listed matching alternatives including train `16526`.
- **Retest status:** **PASS — fixed in tested Sprint 2 baseline.**
- **Evidence:** `docs/evidence/sprint2/14_alternative_full_class.out`

## DEF-002 — Impossible calendar date accepted

- **Requirement:** RRS-SR-003; related RRS-F-004
- **Original severity:** Medium
- **Original actual behavior:** `2026-02-31` was accepted and displayed.
- **Retest steps:** Use guest search; enter Bengaluru → Chennai and `2026-02-31`, then provide valid date `2026-11-02` after the validation prompt.
- **Expected:** Impossible date is rejected and a valid date is requested.
- **Actual in Sprint 2:** The application printed `Please use YYYY-MM-DD format...` for `2026-02-31` and continued only after a valid date.
- **Retest status:** **PASS — fixed in tested Sprint 2 baseline.**
- **Evidence:** `docs/evidence/sprint2/06_invalid_date.out`

## New defects

No new defect was logged from the executed scenarios. This is limited to the tested Linux CLI scope; blocked tests may reveal additional issues later.

## Remaining QA risks

Formal Windows portability, multi-process concurrency, performance timing, three-user usability, filesystem fault injection, and isolated unit tests remain pending or blocked. These are coverage gaps, not classified as confirmed defects from this execution.
