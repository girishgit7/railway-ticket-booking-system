# System Validation Report — Sprint 2

**Tester:** Hanumantha L (PES2UG24CS179)  
**Baseline:** `fc2c53227724ae2fd914a0d1c4fb4815c1ee2727`  
**Execution location:** disposable Linux directory; no project data was modified.

## End-to-end scenarios

1. **Registration and authentication:** Alice was registered, duplicate registration was rejected, valid login succeeded, and a separate account locked after three wrong passwords. **PASS.**
2. **Search and regression validation:** Search accepted valid routes, rejected `2026-02-31`, and displayed alternative trains when train 12007 Sleeper was full. **PASS; DEF-001 and DEF-002 retested as fixed.**
3. **Booking/payment/ticket:** Alice booked seats with berth preference; PNR, fare, ticket fields, and UPI payment were displayed. Separate Cash and Card bookings also passed. **PASS.**
4. **Persistence:** The generated PNR was queried in a fresh process and the confirmed ticket was recovered. **PASS.**
5. **Cancellation/refund:** The PNR was cancelled, the demo 10% charge/90% refund was displayed, repeat cancellation was rejected, and cancelled status persisted. **PASS.**
6. **Authorization:** A second passenger was rejected when attempting to cancel Alice’s PNR; passenger accounts could not access administration. **PASS.**
7. **Administration:** Admin added, updated, reconfigured, reported on, and removed a synthetic train. **PASS.**
8. **Audit/persistence:** User, booking, train, and audit files were produced and inspected after execution. **PASS.**

## Validation outcome

All executed Sprint 2 functional, negative, boundary, persistence, authorization, and regression scenarios passed. No new defect was observed in the executed scope. The two Sprint 1 defects are not present in the tested Sprint 2 baseline:

- DEF-001: alternative train list now appears for a full class.
- DEF-002: impossible calendar dates are rejected.

This is not a claim of complete STP exit-criteria satisfaction. Windows portability, concurrent/multi-process allocation, formal performance timing, three-user usability, and isolated unit testing remain incomplete or blocked.

## Reproduction evidence

The evidence files are under `docs/evidence/sprint2/`, including each input transcript (`.in`), output transcript (`.out`), return code, persisted data file, assertion summaries, and GCC coverage reports.
