# Verification Hub

Build the CORE WORKING PROTOTYPE of a Legal Metrology Verification System for a hackathon.

IMPORTANT:
FUNCTIONALITY FIRST.
Do not add advanced features or spend time on visual polish yet.

TECH:
- React
- TypeScript
- TailwindCSS
- React Router
- localStorage
- Mock data only
- No Supabase
- No Firebase
- No backend
- No external APIs

The application must actually work after refreshing the browser.

================================================
CORE USER ROLES
================================================

Create 3 demo roles:

CITIZEN
ADMIN
OFFICER

Use a simple demo login screen.

Demo accounts:

citizen@demo.com
admin@demo.com
officer@demo.com

Password can be:
demo123

After login, redirect according to role.

Add logout.

================================================
MAIN ROUTES
================================================

/login

/citizen

/admin

/officer

Keep the application small. Do not create unnecessary pages.

================================================
DATA MODEL
================================================

Use one centralized localStorage-based application state.

Users:
- id
- name
- email
- role

Instruments:
- id
- ownerId
- type
- make
- model
- serialNumber
- capacity
- unit
- location
- verificationStatus
- validUntil

Applications:
- id
- instrumentId
- applicantId
- assignedOfficerId
- verificationType
- status
- riskScore
- riskLevel
- riskReasons
- createdAt

Inspection:
- applicationId
- result
- zeroError
- standardReading1
- standardReading2
- remarks
- evidence
- inspectedAt

Certificates:
- id
- applicationId
- certificateNumber
- issueDate
- validUntil
- status
- qrToken

================================================
CITIZEN DASHBOARD
================================================

Create a working citizen dashboard.

Show:

My Instruments
Active Applications
Verified Certificates
Expiring Certificates

Section:

MY INSTRUMENTS

Display instrument cards containing:

Type
Make
Model
Serial Number
Location
Status

Button:

+ REGISTER INSTRUMENT

The form must actually create an instrument and save it to localStorage.

Fields:

Instrument Type
Make
Model
Serial Number
Capacity
Unit
Location

================================================
APPLICATION SUBMISSION
================================================

Add:

+ NEW VERIFICATION APPLICATION

Allow the citizen to select one of their instruments.

Verification type:

INITIAL VERIFICATION
RE-VERIFICATION

On submit:

Create an application.

Set:

status = SUBMITTED

Immediately calculate a simple risk score.

================================================
RISK SCORE
================================================

Use a simple explainable rules-based calculation.

High-risk instrument category:
+40

Previous failed verification:
+30

Overdue verification:
+20

Other compliance issue:
+10

Maximum = 100.

Risk levels:

0-30 = LOW
31-60 = MEDIUM
61-100 = HIGH

Store:

riskScore
riskLevel
riskReasons

Example:

87 / 100
HIGH RISK

Reasons:
- Previous failed verification
- Verification overdue

Do NOT call this AI.

Call it:

RISK-BASED PRIORITIZATION

================================================
APPLICATION TRACKING
================================================

Citizen must see submitted applications.

Each application shows:

Application ID
Instrument
Verification Type
Risk Score
Risk Level
Status

Status values:

SUBMITTED
ASSIGNED
INSPECTION
CERTIFIED
FAILED

Use a simple visual status timeline.

================================================
ADMIN DASHBOARD
================================================

Create:

LEGAL METROLOGY CONTROL CENTER

Show summary cards:

Total Applications
Pending
High Risk
Assigned
Certified

Main section:

PRIORITY INSPECTION QUEUE

Show applications sorted by highest risk score first.

Columns:

Application
Instrument
Serial Number
Risk Score
Risk Level
Status
Officer
Action

Admin can open an application.

Show:

Applicant
Instrument details
Risk score
Risk reasons
Application status

Add:

ASSIGN OFFICER

Allow selection of:

LMO Officer
GATC Officer

When admin assigns an officer:

application.assignedOfficerId = selected officer
application.status = ASSIGNED

Save the change to localStorage.

The citizen dashboard must immediately reflect the updated status.

================================================
OFFICER DASHBOARD
================================================

Create:

FIELD INSPECTIONS

Show only applications assigned to the logged-in officer.

Each application shows:

Instrument
Serial Number
Applicant
Risk Score
Risk Level
Status

Button:

START INSPECTION

================================================
OFFICER INSPECTION
================================================

Create an inspection screen/modal.

Make it mobile-friendly.

Show:

INSTRUMENT DETAILS

Type
Make
Model
Serial Number
Capacity
Location

RISK:

Risk Score
Risk Level
Risk Reasons

Inspection fields:

Zero Error
Standard Weight Reading 1
Standard Weight Reading 2
Display Condition
Seal Condition
Measurement Observation
Remarks

Add a simple evidence/photo upload field.

Show image preview when a file is selected.

Buttons:

PASS INSPECTION
FAIL INSPECTION

================================================
PASS
================================================

When PASS INSPECTION is clicked:

1. Save inspection data.
2. Set application status to CERTIFIED.
3. Set inspection result to PASS.
4. Create a certificate object.
5. Generate certificate number such as:

LM-2026-0001

6. Generate a unique QR token.
7. Save certificate to localStorage.
8. Update the instrument verification status to VERIFIED.
9. Show a success message.

Do not build the certificate UI yet.

The important thing is that the data exists and persists.

================================================
FAIL
================================================

When FAIL INSPECTION is clicked:

Require remarks.

Then:

1. Save inspection data.
2. Set inspection result = FAIL.
3. Set application status = FAILED.
4. Save to localStorage.
5. Update the citizen application status.

Do NOT create a certificate.

================================================
MOCK DATA
================================================

Preload realistic demo data.

Create:

1 admin
2 officers
3 citizens

At least 5 instruments.

At least 6 applications.

Include:

2 HIGH risk
2 MEDIUM risk
2 LOW risk

Include:

- submitted application
- assigned application
- certified application
- failed application

Use realistic Indian names and locations.

================================================
PERSISTENCE
================================================

All important actions must persist through browser refresh.

Use localStorage.

Centralize the state so:

Citizen
→ creates application

Admin
→ sees same application
→ assigns officer

Officer
→ sees same assigned application
→ completes inspection

Citizen
→ sees updated result

Do NOT maintain separate fake data for each dashboard.

================================================
NAVIGATION
================================================

Citizen navigation:

Dashboard
Instruments
Applications
Certificates
Logout

Admin navigation:

Dashboard
Applications
Priority Queue
Logout

Officer navigation:

Dashboard
Inspections
History
Logout

Protect routes based on role.

================================================
BASIC DESIGN
================================================

Create a clean professional foundation.

Visual direction:

Modern digital government / regulatory platform.

Use:

Deep navy
Blue
White
Cool gray

Green:
verified/pass

Amber:
warning/high risk

Red:
failed

Use clean typography and professional cards.

Do NOT spend significant effort on animations or decorative graphics yet.

================================================
MOST IMPORTANT TEST
================================================

Before finishing, verify that this complete flow works:

LOGIN AS CITIZEN
↓
Register instrument
↓
Submit application
↓
Risk score appears
↓
Logout
↓
LOGIN AS ADMIN
↓
Application appears
↓
Admin assigns officer
↓
Logout
↓
LOGIN AS OFFICER
↓
Assigned application appears
↓
Open inspection
↓
Enter readings
↓
PASS
↓
Application becomes CERTIFIED
↓
Certificate object is created
↓
Logout
↓
LOGIN AS CITIZEN
↓
Application shows CERTIFIED

Also verify FAIL:

Officer
→ inspection
→ FAIL
→ remarks required
→ application becomes FAILED
→ no certificate created

================================================
CRITICAL
================================================

Do NOT build:

- QR UI
- PDF generation
- public verification
- complex analytics
- blockchain
- AI
- real notifications
- real authentication backend
- native mobile app
- documentation

Those will be added later.

Do NOT create placeholder buttons.

Do NOT create disconnected screens.

Make the core state and workflow WORK FIRST.

If a choice must be made between visual polish and functionality, choose functionality.

BUILD THIS CORE VERSION NOW.

Legal Metrology Verification System — hackathon prototype.

## Public QR verification

Set `VITE_PUBLIC_APP_ORIGIN` to the deployed public URL before generating certificates intended for phone scanning. QR codes use `/verify/<certificate-number>` and carry the small public certificate snapshot required by this frontend-only prototype. A local `localhost` URL will not be reachable from another phone.


## Final prototype workflow

The demo models a single coherent lifecycle: citizen registration -> instrument registration -> verification/re-verification application -> automatic risk prioritization -> admin review/assignment/scheduling -> LMO/GATC field inspection -> automatic inspection evaluation -> certificate + QR on PASS, or correction required -> reinspection request -> reassignment/rescheduling -> new inspection.

### Included requirements
- Citizen self-registration and demo accounts
- LMO/GATC/Admin role-based prototype login
- Instrument records and verification history
- Verification and re-verification applications
- Risk score and priority derived from current instrument state
- Admin review, assignment and scheduling
- Mobile-friendly officer inspection with manual readings
- Automatic repeatability, accuracy/linearity, eccentric-loading and overall PASS/FAIL evaluation
- Photos/supporting document uploads
- Failure reasons, corrective action and reinspection lifecycle
- Digital certificate PDF, print and QR verification
- Public verification page
- Date-driven in-app expiry/renewal alerts
- Search/retrieval
- Admin certificate registry and simple reports with CSV/print
- Regulatory reference link to the Department of Consumer Affairs Legal Metrology source

### Prototype disclaimer
This is a frontend/localStorage hackathon prototype. Risk weights and inspection thresholds are configurable demo rules, not claims that the Legal Metrology (General) Rules prescribe this exact scoring or threshold set. A production deployment should replace localStorage with a secured backend/database, server-side authentication/authorization, signed certificates, audit logging, secure file storage, and a server-side notification scheduler.
