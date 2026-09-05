# Software Requirements Specification (SRS)

**Project:** Railway Reservation System  
**Section:** 5C | **Team:** Team 1 (Jackfruit Problem)  
**Version:** 1.0  
**Authors:** Farheen Akhtar, Hanumantha L, Girish Jayan Senthilkumar, Meenakshi P  
**Date:** 05-09-2026  
**Status:** Final Submission  

## Team Details

| USN | Student Name |
|---|---|
| PES2UG24CS164 | Farheen Akhtar |
| PES2UG24CS179 | Hanumantha L |
| PES2UG24CS170 | Girish Jayan Senthilkumar |
| PES2UG25CS811 | Meenakshi P |

**Project Description:** A railway ticket reservation system with booking and cancellation features.  
**Programming Language:** C / C++

## Revision History

| Version | Date | Author | Change Summary | Approval |
|---|---|---|---|---|
| 1.0 | 05-09-2026 | Team 1 | Initial SRS | |

## Approvals

| Role | Name | Signature / Email | Date |
|---|---|---|---|
| Course Coordinator | Dr. Pradeep Kumar Kenny S |  | 5-09-2026 |

## Table of Contents

1. Introduction
2. Overall Description
3. External Interfaces
4. System Features (Detailed)
5. Non-Functional Requirements (Detailed)
6. Quality Attributes & Acceptance Tests
7. System Models and Diagrams
8. Requirements Traceability Matrix (RTM)

---

# 1. Introduction

## 1.1 Purpose

This document is a Software Requirements Specification (SRS) for a Railway Reservation System (RRS). It defines the functional and non-functional requirements, external interfaces, and verification criteria for a system that allows passengers to search trains, book and cancel tickets, and allows administrators to manage schedules, seat inventory, and reports.

## 1.2 Scope

Covers passenger-facing operations (train search, seat booking, payment, ticket generation, cancellation, and refund tracking) and administrative operations (train schedule and seat-inventory management, fare/quota configuration, and reporting). The system is implemented in C/C++ and stores reservation records for retrieval, update, and cancellation. Excludes actual payment-gateway settlement and the physical railway signalling/operations systems, which are treated as external interfaces.

## 1.3 Audience

Developers, Testers/QA, Course Instructor/Evaluators, and end-users (passengers and booking-counter staff) referenced during requirements review.

## 1.4 Definitions

- **RRS:** Railway Reservation System
- **PNR:** Passenger Name Record
- **UI:** User Interface
- **DB:** Database/File Store
- **CLI:** Command Line Interface
- **NFR:** Non-Functional Requirement
- **FR:** Functional Requirement

# 2. Overall Description

## 2.1 Product Perspective

The Railway Reservation System is a standalone application (console/CLI based, built in C/C++) that manages train information, seat availability, and passenger bookings using structured file storage (or an in-memory/array-and-file-based data model). It is not dependent on external banking or railway-operations systems for its core booking logic.

## 2.2 Major Product Functions (Detailed)

- Register / authenticate user (passenger login or guest booking)
- Search train availability by source, destination, date, and class
- Book a ticket with seat/berth preference
- Generate PNR and print/display the ticket
- Cancel a booked ticket and process refund status
- View booking history / check PNR status
- Administrative: add/update train schedule and seat inventory
- Administrative: generate occupancy and revenue reports

## 2.3 User Roles and Characteristics (Expanded)

- **Passenger:** General public, basic computer literacy, expects a simple booking flow and quick confirmation.
- **Booking Clerk / Admin:** Railway staff who manage schedules, seat inventory, and process manual bookings/cancellations.
- **System Administrator:** Manages user accounts, data backups, and system configuration.

## 2.4 Operating Environment

Desktop/console environment running on Windows/Linux, compiled with a standard C/C++ compiler (e.g., GCC). Data is persisted using flat files or a lightweight local database. No specialised hardware is required beyond a standard PC.

## 2.5 Constraints

- Must be implemented in C/C++ as per project requirements.
- Limited to single-machine/local data storage (no distributed database).
- Seat inventory must remain consistent under concurrent-like access simulation.
- Academic-project time and resource constraints.

# 3. External Interface Requirements

## 3.1 User Interfaces

Primary UI: menu-driven console interface (text-based) with numbered options for search, booking, cancellation, and admin functions. Clear prompts and input validation messages are shown for invalid choices.

## 3.2 Hardware Interfaces

- Standard keyboard for input
- Monitor/console for text output
- Local disk storage for persisting train, seat, and booking records

## 3.3 Software Interfaces

- File I/O interface (`fstream` / file handling) for reading and writing train, seat, and booking data.
- Optional: simple text-based report export for admin reports.

## 3.4 Communications

No network communication is required for the base version; the system operates on local file-based storage. If extended, a client-server socket interface may be added for multi-user access.

> **Project requirement coverage:** At least 15 Functional Requirements, 5 Non-Functional Requirements, 2 Security Objectives, and 5 Security Requirements are defined in Sections 4, 5, and 5.1.

# 4. System Features (Detailed)

Each requirement includes acceptance criteria and a reference test case. IDs follow `RRS-F-###`.

## 4.1 User Registration & Authentication

**Description:** Allow a passenger to register, log in, and access their booking history securely.

| Req ID | Requirement | Type | Priority | Source / Stakeholder | Acceptance Criteria / Test Case | Comments / Dependencies |
|---|---|---|---|---|---|---|
| RRS-F-001 | The system shall allow a new passenger to register with name, contact number, and a password. | Functional | High | Passenger | AC-RRS-F-001: Valid registration details create a new user record. Test: TC-Auth-01 | Duplicate contact should be rejected |
| RRS-F-002 | The system shall authenticate a registered passenger using contact number/username and password before allowing booking. | Functional | High | Passenger | AC-RRS-F-002: Correct credentials grant access; incorrect credentials are rejected. Test: TC-Auth-02 | Depends on RRS-F-001 |
| RRS-F-003 | The system shall lock further login attempts after 3 consecutive failed password attempts. | Functional | Medium | Security | AC-RRS-F-003: After 3 failures, further attempts are blocked with a message. Test: TC-Auth-03 | Audit review required |

## 4.2 Train Search & Availability

**Description:** Enable passengers to search for trains and check real-time seat availability.

| Req ID | Requirement | Type | Priority | Source / Stakeholder | Acceptance Criteria / Test Case | Comments / Dependencies |
|---|---|---|---|---|---|---|
| RRS-F-004 | The system shall allow a passenger to search trains by source, destination, and date of journey. | Functional | High | Passenger | AC-RRS-F-004: Matching trains are listed with timing and class. Test: TC-Search-01 | Requires train master data |
| RRS-F-005 | The system shall display seat availability for each class (Sleeper, AC, General) for the selected train. | Functional | High | Passenger | AC-RRS-F-005: Availability count matches current seat inventory. Test: TC-Search-02 | Depends on seat inventory module |
| RRS-F-006 | The system shall display an alternative train list if the requested train has no availability. | Functional | Medium | Passenger | AC-RRS-F-006: Alternate trains for same route shown when full. Test: TC-Search-03 | |

## 4.3 Ticket Booking

**Description:** Allow passengers to book tickets, choose seat/berth preferences, and receive a confirmed PNR.

| Req ID | Requirement | Type | Priority | Source / Stakeholder | Acceptance Criteria / Test Case | Comments / Dependencies |
|---|---|---|---|---|---|---|
| RRS-F-007 | The system shall allow a passenger to book a ticket by selecting a train, class, and number of passengers. | Functional | High | Passenger | AC-RRS-F-007: Booking succeeds only if requested seats are available. Test: TC-Book-01 | Depends on RRS-F-005 |
| RRS-F-008 | The system shall allow the passenger to select a seat/berth preference (Lower/Middle/Upper/Window). | Functional | Medium | Passenger | AC-RRS-F-008: Preference is recorded and honoured subject to availability. Test: TC-Book-02 | |
| RRS-F-009 | The system shall generate a unique PNR number for every successful booking. | Functional | High | Business | AC-RRS-F-009: Each booking produces a unique, non-repeating PNR. Test: TC-Book-03 | |
| RRS-F-010 | The system shall decrement the available seat count in the seat inventory immediately upon successful booking. | Functional | High | Operations | AC-RRS-F-010: Seat count reduces by the number of seats booked. Test: TC-Book-04 | Requires atomic update |
| RRS-F-011 | The system shall reject a booking request if the requested number of seats exceeds available inventory. | Functional | High | Business | AC-RRS-F-011: Over-booking attempts are rejected with a clear message. Test: TC-Book-05 | Depends on RRS-F-010 |

## 4.4 Payment & Ticket Generation

**Description:** Record fare payment and generate/print the ticket with journey and passenger details.

| Req ID | Requirement | Type | Priority | Source / Stakeholder | Acceptance Criteria / Test Case | Comments / Dependencies |
|---|---|---|---|---|---|---|
| RRS-F-012 | The system shall calculate the total fare based on class, distance/route, and number of passengers. | Functional | High | Business | AC-RRS-F-012: Computed fare matches fare table for given inputs. Test: TC-Pay-01 | Requires fare master data |
| RRS-F-013 | The system shall record the payment mode (Cash/Card/UPI - simulated) against the booking. | Functional | Medium | Business | AC-RRS-F-013: Payment mode is stored with the booking record. Test: TC-Pay-02 | Simulated, no real gateway |
| RRS-F-014 | The system shall generate and display/print a ticket containing PNR, passenger name(s), train, class, seat/berth, and fare. | Functional | High | Passenger | AC-RRS-F-014: Printed ticket contains all required fields. Test: TC-Pay-03 | Depends on RRS-F-009 |

## 4.5 Cancellation & Refund

**Description:** Allow passengers to cancel a booked ticket and view refund status; restore seat inventory.

| Req ID | Requirement | Type | Priority | Source / Stakeholder | Acceptance Criteria / Test Case | Comments / Dependencies |
|---|---|---|---|---|---|---|
| RRS-F-015 | The system shall allow a passenger to cancel a ticket using the PNR number. | Functional | High | Passenger | AC-RRS-F-015: Valid PNR cancellation updates booking status to Cancelled. Test: TC-Cancel-01 | |
| RRS-F-016 | The system shall restore the cancelled seat(s) back to the seat inventory immediately upon cancellation. | Functional | High | Operations | AC-RRS-F-016: Seat count increases by the number of seats cancelled. Test: TC-Cancel-02 | Depends on RRS-F-010 |
| RRS-F-017 | The system shall calculate a refund amount based on a cancellation-charge policy (e.g., time before departure). | Functional | Medium | Business | AC-RRS-F-017: Refund amount matches policy for given cancellation time. Test: TC-Cancel-03 | Requires cancellation policy table |
| RRS-F-018 | The system shall allow a passenger to check refund/cancellation status using the PNR number. | Functional | Medium | Passenger | AC-RRS-F-018: Correct refund/cancellation status is displayed for the PNR. Test: TC-Cancel-04 | |

## 4.6 Booking History & Administration

**Description:** Provide passengers with booking history and administrators with schedule/inventory management and reporting.

| Req ID | Requirement | Type | Priority | Source / Stakeholder | Acceptance Criteria / Test Case | Comments / Dependencies |
|---|---|---|---|---|---|---|
| RRS-F-019 | The system shall allow a passenger to view their past and current bookings. | Functional | Medium | Passenger | AC-RRS-F-019: All bookings linked to the passenger account are listed. Test: TC-Admin-01 | Depends on RRS-F-002 |
| RRS-F-020 | The system shall allow an admin to add, update, or remove train schedules (train number, route, timing). | Functional | High | Admin | AC-RRS-F-020: Schedule changes are reflected immediately in search results. Test: TC-Admin-02 | |
| RRS-F-021 | The system shall allow an admin to configure seat inventory (total seats per class per train). | Functional | High | Admin | AC-RRS-F-021: Updated seat counts are used in subsequent availability checks. Test: TC-Admin-03 | |
| RRS-F-022 | The system shall allow an admin to generate an occupancy/revenue report for a selected train and date range. | Functional | Medium | Admin | AC-RRS-F-022: Report totals match sum of underlying booking records. Test: TC-Admin-04 | |

# 5. Non-Functional Requirements (Detailed)

NFRs below are measurable and tied to test plans. IDs follow `RRS-NF-###`.

| Req ID | Requirement | Category | Priority | Acceptance Criteria / Measurement |
|---|---|---|---|---|
| RRS-NF-001 | Seat search and availability results shall be returned within 2 seconds under normal load. | Performance | High | Response time measured ≤ 2s in test. Test: TC-Perf-01 |
| RRS-NF-002 | The system shall maintain data consistency such that total booked seats never exceed total available seats. | Reliability | High | Stress test with rapid bookings shows no over-allocation. Test: TC-Rel-01 |
| RRS-NF-003 | The system shall persist all booking and cancellation records to file storage so no data is lost on program restart. | Reliability / Data Persistence | High | Records verified present after restart. Test: TC-Rel-02 |
| RRS-NF-004 | The user interface (menu prompts) shall be understandable to a first-time user without external documentation. | Usability | Medium | Usability walkthrough with 3 test users, all complete booking unaided. Test: TC-UX-01 |
| RRS-NF-005 | The system shall be portable and compile/run on both Windows and Linux with a standard C/C++ compiler. | Portability | Medium | Successful build and run verified on both OS. Test: TC-Port-01 |

## 5.1 Security

### 5.1.1 Security Objectives

- Protect passenger credentials and personal details from unauthorized access or disclosure.
- Ensure booking and cancellation records cannot be tampered with by unauthorized users, preserving data integrity.

### 5.1.2 Security Requirements

| Req ID | Requirement | Type | Priority | Acceptance Criteria / Test Case |
|---|---|---|---|---|
| RRS-SR-001 | The system shall mask the password during entry and shall not store passwords in plain text. | Security | High | Password field shows masked characters; stored value is hashed. Test: TC-Sec-01 |
| RRS-SR-002 | The system shall restrict administrative functions (schedule/inventory management, reports) to authenticated admin users only. | Security | High | Non-admin login cannot access admin menu. Test: TC-Sec-02 |
| RRS-SR-003 | The system shall validate all user inputs (menu choices, dates, seat counts) to prevent invalid data or buffer overflows. | Security | High | Invalid/out-of-range inputs are rejected with an error message. Test: TC-Sec-03 |
| RRS-SR-004 | The system shall log all booking, cancellation, and admin actions with a timestamp for audit purposes. | Security | Medium | Audit log file contains an entry for every state-changing action. Test: TC-Sec-04 |
| RRS-SR-005 | The system shall prevent a cancelled or non-existent PNR from being reused or modified. | Security | Medium | Actions on invalid/cancelled PNR are rejected. Test: TC-Sec-05 |

# 6. Quality Attributes & Acceptance Tests

**Exit criteria for acceptance:** All high-priority functional requirements implemented and verified, no critical NFR failures, and the RTM shows all test cases passed.

**Acceptance test suites:**

- Registration & Authentication
- Search
- Booking
- Payment & Ticketing
- Cancellation & Refund
- Administration & Reporting
- Security tests

# 7. System Models and Diagrams

## 7.1 UML Use-Case Diagram — Passenger

*passenger_usecase.drawio*

## 7.2 UML Use-Case Diagram — Admin / Booking Clerk

*admin_usecase.drawio*

# 8. Requirements Traceability Matrix (RTM)

| Req ID | Requirement Short | Section Ref / Design Spec | Module | Test Case(s) | Status (N/P/A) | Comments |
|---|---|---|---|---|---|---|
| RRS-F-001 | Passenger registration | 4.1 / DS-Auth-01 | AuthModule | TC-Auth-01 | N | |
| RRS-F-002 | Passenger login | 4.1 / DS-Auth-02 | AuthModule | TC-Auth-02 | N | |
| RRS-F-004 | Train search | 4.2 / DS-Search-01 | SearchModule | TC-Search-01 | N | |
| RRS-F-007 | Ticket booking | 4.3 / DS-Book-01 | BookingModule | TC-Book-01 | N | |
| RRS-F-009 | PNR generation | 4.3 / DS-Book-02 | BookingModule | TC-Book-03 | N | |
| RRS-F-014 | Ticket generation | 4.4 / DS-Pay-01 | PaymentModule | TC-Pay-03 | N | |
| RRS-F-015 | Ticket cancellation | 4.5 / DS-Cancel-01 | CancelModule | TC-Cancel-01 | N | |
| RRS-F-020 | Manage train schedule | 4.6 / DS-Admin-01 | AdminModule | TC-Admin-02 | N | |
| RRS-NF-001 | Search response time | 5 / DS-Perf-01 | SearchModule | TC-Perf-01 | N | |
| RRS-SR-001 | Password masking/hashing | 5.1.2 / DS-Sec-01 | AuthModule | TC-Sec-01 | N | |

---

**Source:** Converted from the uploaded Railway Reservation System SRS PDF, preserving its requirements, terminology, organization, and level of detail. fileciteturn0file0L35-L50
