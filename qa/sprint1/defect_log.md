# Sprint 1 Defect Log

Project: Railway Ticket Booking System  
Testing phase: Sprint 1  
Tester: Hanumantha L

## DEF-001 — Alternative trains are not displayed when the selected class is full

- **Requirement:** RRS-F-006
- **Severity:** Medium
- **Expected result:** The system displays alternative trains for the same route when the requested train has no availability.
- **Actual result:** The system displays a message asking the user to search for an alternative train, but does not display an alternative train list.
- **Status:** Open — pending developer review.

## DEF-002 — Invalid calendar date is accepted

- **Requirement:** RRS-SR-003
- **Severity:** Medium
- **Test input:** `2026-02-31`
- **Expected result:** The system rejects the impossible calendar date and asks the user to enter a valid date.
- **Actual result:** The invalid date is accepted and displayed in search results.
- **Status:** Open — pending developer review.

## Notes

These findings were identified during offline testing. Retest both cases after fixes are available.
