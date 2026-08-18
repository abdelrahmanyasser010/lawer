> **تنبيه حالة التنفيذ — V20:** هذا المستند يجمع متطلبات تاريخية ومستقبلية وقد يحتوي بدائل لم تُعتمد في النسخة الحالية. مرجع التشغيل الفعلي هو الكود و`README.md` و`backend/README.md`. النسخة الحالية تستخدم **Laravel + PostgreSQL + جلسات Cookie مخصصة + Scheduler**؛ ولا تعتمد MySQL أو Sanctum أو Redis ما لم يُعتمد ذلك لاحقًا كتطوير منفصل.

# Z draft – Smart Contracts & Consultations Platform

## Software Product Requirements Document (SPRD)

### Version 1.1 (Complete Blueprint + Architectural Addendum)

> **Document Status:** Complete Execution Blueprint (MVP)  
> **Audience:** AI Agent, Backend Developer, Frontend Developer, UI/UX Designer, QA Engineer  
> **Confidentiality:** Internal Use Only  
> **Last Updated:** 2026-07-11

---

## Table of Contents

- [Part 1 – Product Vision, Business Scope & MVP Definition](#part-1)
- [Part 2 – User Personas, User Journey & UX Strategy](#part-2)
- [Part 3 – Functional Requirements & Contract Engine Foundation](#part-3)
- [Part 4 – Administration System, Internal Workflows & Platform Management](#part-4)
- [Part 5 – System Architecture & Engineering Standards](#part-5)
- [Part 6 – Database Design & Data Modeling](#part-6)
- [Part 7 – API Specifications & Authentication](#part-7)
- [Part 8 – Screen Specifications & Frontend Architecture](#part-8)
- [Part 9 – PDF Engine, QR Verification & Document System](#part-9)
- [Part 10 – Security & Error Handling](#part-10)
- [Part 11 – Deployment Architecture & DevOps](#part-11)
- [Part 12 – Seeder Data, Roadmap & AI Agent Execution Guide](#part-12)
- [Part 13 – Architectural Addendum: Z draft Core Features & Rules](#part-13)

---

# Part 1 – Product Vision, Business Scope & MVP Definition {#part-1}

---

# 1. Document Information

| Item            | Value                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| Product Name    | **Z draft** (Smart Legal Contracts & Consultations Platform)                 |
| Project Type    | SaaS Web Platform                                                            |
| Version         | 1.1                                                                          |
| Status          | Complete Execution Blueprint v1.1                                            |
| Audience        | AI Agent, Backend Developer, Frontend Developer, UI/UX Designer, QA Engineer |
| Confidentiality | Internal Use Only                                                            |

---

# 2. Product Vision

## Vision Statement

Build a modern digital platform that enables individuals and businesses to create professional legal contracts through a guided, user-friendly workflow without requiring legal expertise.

The platform should simplify contract creation while maintaining flexibility, scalability, and a professional user experience.

The long-term goal is to become the largest Arabic platform for smart legal document generation and contract lifecycle management.

---

## Mission

Provide a secure, simple, and scalable system where anyone can:

* Create contracts.
* Review contracts.
* Purchase contracts.
* Store contracts.
* Verify contracts.
* Share contracts.

without hiring a lawyer for every standard agreement.

Lawyer review should remain available as an optional premium service.

---

# 3. Product Objectives

The MVP must validate three assumptions:

### Objective 1

Users are willing to pay for professionally generated contracts.

---

### Objective 2

Businesses are interested in subscription-based contract generation.

---

### Objective 3

The guided wizard significantly reduces mistakes compared to manually writing contracts.

---

# 4. Project Scope

The first release focuses on delivering only the core experience required to validate the business.

Everything else is intentionally postponed.

---

## Included in MVP

### Contract Types

* Rental Contract
* Apartment Sale Contract
* Freelancer / Fixed-Term Work Contract

---

### User Types

* Individual
* Business

---

### Authentication

* Google Login
* Email & Password
* Password Reset
* Email Verification

---

### Contract Features

* Guided Wizard
* Draft Saving
* Resume Later
* Contract Preview
* PDF Generation
* QR Verification
* Serial Number
* Contract History

---

### Business Features

* Business Dashboard
* Company Profile
* Subscription Plans
* Contract Management

---

### Lawyer Features

* Optional Lawyer Review
* Lawyer Dashboard
* Approve / Reject Workflow
* Comments

---

### Admin Features

* Platform Dashboard
* User Management
* Business Management
* Lawyer Management
* Pricing Management
* Contract Configuration
* System Settings
* Analytics

---

## Out of Scope

The following features **MUST NOT** be implemented in the MVP.

* Vehicle Sale Contracts
* Native Mobile Applications
* SMS Notifications
* AI Contract Generation
* OCR
* Arabic Voice Assistant
* Multiple Countries
* API Marketplace
* Third-party Integrations
* White Label Solution

The architecture should remain ready to support these features later.

---

# 5. Business Model

The platform supports two customer categories.

---

## Individuals

**Payment Model:** Pay Per Contract

**Workflow:**

```
Create Contract → Preview → Login → Payment → Download
```

**Pricing Example:**

| Contract Type   | Price    |
| --------------- | -------- |
| Rental          | 59 EGP   |
| Apartment Sale  | 149 EGP  |
| Freelancer      | 59 EGP   |

---

## Businesses

**Payment Model:** Monthly Subscription

**Features:**
* Business Dashboard
* Company Branding
* Contract Archive
* Usage Statistics

**Subscription Plans:**
* Starter
* Medium
* Enterprise

Businesses pay monthly instead of paying per contract.

---

# 6. Target Audience

## Individuals

Examples:
* Apartment Owner
* Tenant
* Freelancer
* Developer
* Designer
* Translator
* Content Writer
* Small Business Owner

---

## Businesses

Examples:
* Real Estate Offices
* Law Firms
* Startups
* Software Companies
* Marketing Agencies
* Recruitment Agencies
* Property Management Companies

---

# 7. Product Philosophy

The platform should never feel like filling a legal document.

Instead, it should feel like answering simple questions.

The system is responsible for transforming answers into a professionally formatted legal contract.

Users should never be overwhelmed by legal terminology.

---

## UX Principles

* Simple
* Guided
* Modern
* Friendly
* Minimal
* Professional
* Fast
* Accessible

Every screen should focus on a single task.

Avoid presenting large forms.

Break every contract into small logical steps.

---

# 8. Core Product Principles

The following principles are non-negotiable.

---

## Principle 1

The platform should always guide the user.

Never expect legal knowledge.

---

## Principle 2

Users should never lose progress.

Every change must be saved automatically.

---

## Principle 3

Every contract must have a unique identity.

Each contract receives:
* Unique ID
* Serial Number
* QR Code
* Creation Date
* Version

---

## Principle 4

Authentication happens only when necessary.

Visitors may browse the platform without logging in.

However, once the user clicks **"Start Creating Contract"**, authentication becomes mandatory.

This ensures:
* Draft ownership.
* Auto-save.
* Resume later.
* Secure storage.
* Cross-device synchronization.

---

## Principle 5

Every contract starts as a Draft.

**Possible statuses:**

```
Draft → In Progress → Completed → Waiting Payment → Paid →
Generating PDF → Waiting Lawyer Review (optional) → Approved → Issued → Archived
```

---

# 9. MVP Success Criteria

The MVP will be considered successful if the following objectives are achieved.

### Technical

* No critical bugs.
* No data loss.
* Fast loading.
* Responsive UI.
* Secure authentication.
* Reliable PDF generation.

---

### Business

* First paying users.
* Real contracts generated.
* Businesses subscribe.
* Positive user feedback.
* Low abandonment rate.

---

### User Experience

* Average completion time below 10 minutes.
* High Wizard completion rate.
* Users understand every step without external assistance.
* Minimal support requests.

---

# 10. Long-Term Vision

Although the MVP supports only three contract types, the platform architecture must be designed as a **Contract Engine**, not merely a collection of hardcoded forms.

The current release will expose only three predefined contracts to end users.

However, the internal architecture, database, and administration panel must be designed with future extensibility in mind.

This means:

* Contract definitions should be configurable.
* Field metadata should support future dynamic behavior.
* Help content should be editable from the administration panel.
* Optional video tutorial URLs should be supported by the data model, even if the feature remains disabled in the MVP.
* Validation rules and field visibility should be configurable at the data layer whenever practical.

These capabilities are **foundational only** in Version 1.0 and **must not** introduce unnecessary complexity into the MVP user experience. The public interface will continue to expose only the three supported contract types until a future release enables the dynamic contract engine.

---

# Part 2 – User Personas, User Journey & UX Strategy {#part-2}

---

# 11. User Types

The platform serves multiple categories of users.

Each user type has different permissions, workflows, and objectives.

The system must treat every role independently.

---

## 11.1 Guest User

A Guest User is any visitor who accesses the platform without authentication.

Guest users should be able to explore the platform freely before creating an account.

### Capabilities

* Browse the landing page.
* View supported contract types.
* Read pricing plans.
* Read FAQs.
* Learn how the platform works.
* Compare plans.
* View legal notices.

### Restrictions

A Guest User cannot:

* Create a contract.
* Save progress.
* Download PDFs.
* Access dashboards.
* Purchase contracts.
* Submit contracts for lawyer review.

Authentication becomes mandatory only when the visitor clicks **"Start Creating Contract."**

---

## 11.2 Individual User

Individuals represent the largest expected audience during the MVP.

Examples include:

* Apartment owners.
* Tenants.
* Freelancers.
* Software developers.
* Designers.
* Translators.
* Content writers.
* Small business owners.

### Primary Goals

* Create a contract quickly.
* Understand every legal question.
* Download a professional PDF.
* Save contracts for future reference.
* Optionally request legal review.

---

## 11.3 Business User

Business accounts are subscription-based.

Examples include:

* Real estate offices.
* Recruitment agencies.
* Marketing companies.
* Software houses.
* Property management companies.

Business accounts differ from individuals in several ways.

### Additional Features

* Company profile.
* Company logo.
* Company information.
* Subscription plans.
* Team contract archive.
* Usage statistics.
* Monthly billing.
* Shared business identity.

---

## 11.4 Lawyer

Lawyers are internal platform reviewers.

A lawyer account does not create contracts.

Instead, lawyers review contracts that customers voluntarily submit for legal verification.

### Responsibilities

* Review contracts.
* Leave comments.
* Approve contracts.
* Reject contracts.
* Request edits.

Lawyers never modify customer data directly.

---

## 11.5 Platform Administrator

Administrators control every aspect of the platform.

They are responsible for business operations rather than legal review.

Responsibilities include:

* Managing users.
* Managing businesses.
* Managing lawyers.
* Managing subscriptions.
* Managing pricing.
* Monitoring analytics.
* Configuring contracts.
* Managing help content.
* Reviewing reports.

---

# 12. User Journey

The entire platform revolves around a single user journey.

Everything else supports this journey.

---

## Step 1

Visitor lands on the homepage.

The homepage immediately answers three questions:

* What is this platform?
* Which contracts are available?
* How much does it cost?

The homepage should minimize friction.

No login request should appear here.

---

## Step 2

The visitor selects a contract.

Examples:
* Rental Contract.
* Apartment Sale.
* Freelancer Agreement.

Each contract card should clearly display:

* Estimated completion time.
* Starting price.
* Short description.
* Suitable audience.

---

## Step 3

The visitor clicks: **Start Creating Contract**

At this point authentication becomes mandatory.

The user may sign in using:
* Google.
* Email & Password.

Once authentication succeeds, a Draft Contract is immediately created.

This draft becomes the user's working copy.

---

## Step 4

The Contract Wizard begins.

The wizard divides the contract into logical sections.

Each screen focuses on one topic only.

```
Party Information → Property Information → Financial Details → Legal Clauses → Preview
```

Users should never face a long scrolling form.

---

## Step 5 – Auto Save

Every meaningful modification must be saved automatically.

The user should never manually press "Save."

**Save triggers:**
* Field loses focus.
* User changes step.
* 30 seconds without interaction.
* Browser close warning.
* Network reconnect.

If the user leaves the platform, progress must remain intact.

---

## Step 6 – Resume Draft

Whenever users log in again, they should immediately see:

> "You have an unfinished contract."

**Options:**
* Continue
* Delete Draft
* Start New Contract

This feature should dramatically reduce abandonment.

---

## Step 7 – Preview

Before any payment occurs, users should be able to preview the complete contract.

The preview should resemble the final PDF.

However, it must include a watermark: **Preview Only**

The preview should be scrollable and responsive.

---

## Step 8 – Payment Decision

After reviewing the preview, users choose between:

* Download Immediately
* Request Lawyer Review

Both options require payment.

---

## Step 9 – Lawyer Review (Optional)

If selected, the workflow changes:

```
Paid → Waiting Lawyer → Under Review → Approved → PDF Generated → Download
```

Lawyers may request edits.

Users receive notifications whenever the status changes.

---

## Step 10 – Direct Download

If the customer skips lawyer review:

```
Paid → PDF Generated → Download → Stored in Dashboard
```

---

# 13. UX Philosophy

The platform should feel more like an interview than a legal application.

Every screen asks only one logical group of questions.

The interface should continuously reassure users that they are making progress.

---

## Progress Tracking

Every wizard includes:
* Progress Bar.
* Current Step.
* Total Steps.
* Step Name.
* Remaining Steps.

**Example:**
```
Step 3 of 6 — Property Information
```

Progress should always be visible.

---

## Navigation Rules

* Users may navigate backward freely.
* Forward navigation requires validation.
* The system should prevent accidental data loss.

---

## Inline Guidance

Every important field supports contextual guidance.

Each field may include:
* Placeholder text.
* Short explanation.
* Help dialog.
* Example value.

The data model must also include an optional **Video URL** field. This feature will not be enabled in the MVP UI, but the administration panel should allow storing and editing it so that video guidance can be activated in a future release without changing the database schema.

---

## Error Prevention

Instead of showing errors after submission, the interface should prevent mistakes while users are typing.

Validation should happen immediately whenever practical.

Examples include:
* National ID format.
* Phone number length.
* Required fields.
* Date consistency.
* Numeric values.

Error messages must explain how to fix the issue rather than merely stating that something is wrong.

---

## Accessibility

The platform should remain usable for people with limited technical knowledge.

Avoid legal jargon wherever possible.

Prefer plain language.

When legal terminology is unavoidable, provide an explanation through the Help Dialog.

---

# 14. Contract Editing Window

Contracts remain editable for **24 hours** after generation.

During this period:
* Users may reopen the contract.
* Modify information.
* Regenerate the PDF.

Once the editing window expires:
* The contract becomes read-only.
* Download remains available.
* Sharing remains available.
* Editing is permanently disabled unless an administrator intervenes.

This policy should be enforced by the backend and must not rely solely on frontend restrictions.

---

# Part 3 – Functional Requirements & Contract Engine Foundation {#part-3}

---

# 15. Functional Requirements

The platform consists of multiple functional modules.

Each module must remain independent, scalable, and maintainable.

The MVP exposes only three contracts to end users, but the internal architecture should support future expansion.

## Core Modules

| Module               | Sub-modules                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| Public Website       | Landing Page, Pricing, FAQ, How It Works, Contact                          |
| Authentication       | Login, Register, Password Reset, Email Verification                        |
| Contract Module      | Rental, Apartment Sale, Freelancer, Drafts, Preview, PDF, QR               |
| User Dashboard       | My Contracts, Downloads, Profile, Notifications, Settings                  |
| Business Dashboard   | Company Profile, Subscription, Contract Archive, Statistics, Invoices      |
| Lawyer Dashboard     | Pending Reviews, Approved, Rejected, Comments, Review History              |
| Admin Dashboard      | Users, Businesses, Lawyers, Contracts, Pricing, Analytics, Settings, Logs |

---

# 16. Contract Engine

Although the MVP contains only three contracts, every contract should internally follow the same lifecycle.

Every contract is simply a different implementation of the same engine.

**Lifecycle:**

```
Create Draft → Fill Wizard → Preview → Payment → Generate PDF → Download
```

The engine should never depend on a specific contract type.

Only the wizard structure changes.

---

# 17. Contract Types

Version 1.0 supports exactly three contract templates.

---

## Rental Contract

**Supported Variants:** Apartment, Commercial Shop, Warehouse

**Purpose:** Property rental documentation.

**Key Features:**
* Property Information
* Financial Terms
* Maintenance Clauses
* Utility Responsibility
* Photo Attachments
* Automatic Renewal
* Subleasing Restrictions

---

## Apartment Sale Contract

**Purpose:** Property ownership transfer.

**Key Features:**
* Seller Information
* Buyer Information
* Property Details
* Mortgage Information
* Installments
* Ownership Transfer
* Delivery Conditions
* Termination Clauses

---

## Freelancer Agreement

**Purpose:** Service-based contractual relationship.

**Supported Categories:** Design, Programming, Marketing, Writing, Translation, Temporary Employment

**Key Features:**
* Scope of Work
* Deliverables
* Payment Schedule
* Intellectual Property
* Confidentiality
* Non-compete
* Dispute Resolution

---

# 18. Wizard Architecture

Every contract must follow the exact same interaction model.

The only difference is the displayed fields.

**General Wizard Flow:**

```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Preview
```

Users should never see more than one logical section at a time.

**Wizard Rules:** Each step contains:
* Title
* Description
* Fields
* Validation
* Navigation
* Progress

Every step should be independently savable.

---

# 19. Auto Save Requirements

Auto Save is mandatory.

The system should never depend on a Save button.

Drafts should be synchronized continuously.

**Save triggers include:**
* Field updated.
* Step changed.
* Page refreshed.
* User closes browser.
* Internet reconnects.
* Automatic background interval.

**If Auto Save fails, the interface should display:**

```
Saving... → Retrying... → Saved
```

without interrupting the workflow.

---

# 20. Draft Management

Each authenticated user may own multiple Draft Contracts.

**Draft States:**

```
Draft → Completed → Paid → Issued → Expired → Deleted
```

Drafts should appear immediately on the Dashboard.

**Users should be able to:**
* Continue
* Rename
* Delete
* Duplicate (Future)
* Archive

---

# 21. Smart Guidance System

The platform should educate users while they fill contracts.

Every field supports configurable metadata.

| Availability  | Properties                                           |
| ------------- | ---------------------------------------------------- |
| Current MVP   | Field Label, Placeholder, Help Text, Help Dialog, Required, Validation |
| Future Ready  | Video URL, Documentation Link, AI Explanation, Voice Tutorial |

The frontend must automatically render available guidance without requiring code changes.

---

# 22. Dynamic Field Configuration

The three MVP contracts are predefined.

However, field behavior should be configurable.

The Admin Panel must support editing field metadata.

**Configurable Properties:**
* Display Name
* Placeholder
* Required / Optional
* Help Dialog
* Sort Order
* Visibility
* Validation Rules
* Default Value
* Future Video URL

This configuration layer should **not** allow creating entirely new contracts in Version 1.0.

It only customizes the existing three templates.

**Example:**

```
Rental Contract → Monthly Rent
  Required:     YES
  Placeholder:  "Example: 5000 EGP"
  Help Dialog:  "Enter the agreed monthly rent excluding utility bills unless otherwise stated."
  Video URL:    NULL
```

If a future administrator provides a Video URL, the frontend should automatically display a "Watch Tutorial" action without requiring additional development.

---

# 23. Conditional Fields

Some questions should appear only when necessary.

**Example:**

```
Does the apartment have a mortgage?
  NO  → Hide: Mortgage Bank, Remaining Amount, Mortgage End Date
  YES → Show: Mortgage Bank, Remaining Amount, Mortgage End Date
```

Conditional logic should be configurable by the backend.

Avoid embedding conditions directly into frontend components whenever practical.

---

# 24. Contract Validation

Validation occurs on three levels.

| Level       | Scope               | Examples                                               |
| ----------- | ------------------- | ------------------------------------------------------ |
| Level One   | Frontend Validation | Required Fields, Formats, Dates, Numbers               |
| Level Two   | Backend Validation  | Ownership, Permissions, Business Rules, Security       |
| Level Three | PDF Validation      | All required fields exist, No missing placeholders, QR generated, Serial generated |

No contract may proceed to PDF generation unless all validation layers succeed.

---

# 25. Contract Preview

Preview should be almost identical to the generated PDF.

**Differences:**
* Watermark: "Preview Only"
* No Serial Number
* No Final Signature
* No Official Timestamp

Preview should be generated using the same rendering engine that produces the final PDF to ensure visual consistency.

---

# 26. Contract Generation Workflow

The backend controls all generation logic.

```
Authenticated User
  → Create Draft
  → Complete Wizard
  → Backend Validation
  → Preview
  → Payment
  → Generate PDF
  → Store PDF
  → Generate QR
  → Generate Serial
  → Save Metadata
  → User Dashboard
  → Download
```

Every step must be logged for audit and troubleshooting purposes.

---

# 27. Future Expansion Readiness

The platform should be designed to support additional contract types without requiring architectural changes.

**Examples of future contracts:**
* Vehicle Sale Agreement
* Partnership Agreement
* Construction Contract
* Employment Contract
* Consultancy Agreement
* Loan Agreement
* NDA Templates
* Custom Business Contracts

Although these contracts are not part of Version 1.0, the database schema, service layer, and administrative configuration should anticipate future growth.

No user-facing functionality for creating new contract types will be exposed during the MVP.

Only the underlying architecture should remain extensible.

---

# Part 4 – Administration System, Internal Workflows & Platform Management {#part-4}

---

# 28. Administration Philosophy

The Administration Panel is not merely a dashboard for viewing data. It is the operational control center of the platform.

All operational decisions should be configurable through the administration interface whenever possible.

Business logic, however, must remain enforced by the backend to preserve security and consistency.

The administration panel should enable non-technical administrators to manage the platform without requiring source code modifications.

---

# 29. Dashboard Modules

The Administration Panel shall be organized into independent modules.

**Core Modules:**
* Dashboard
* Users
* Businesses
* Lawyers
* Contracts
* Contract Templates
* Pricing
* Subscriptions
* Contract Reviews
* Platform Settings
* Help Content
* Reports & Analytics
* Audit Logs
* Roles & Permissions
* Notifications (Future Ready)

Each module must expose CRUD operations where appropriate and respect role-based permissions.

---

# 30. Dashboard Home

The Dashboard home page serves as the operational overview for administrators.

**Key Metrics:**
* Total registered users.
* Active users (last 30 days).
* Total businesses.
* Total lawyers.
* Contracts created today.
* Contracts awaiting payment.
* Contracts awaiting lawyer review.
* Contracts issued today.
* Revenue (daily, weekly, monthly).
* Subscription renewals due.
* Most frequently used contract type.

These metrics should be filterable by date range.

---

# 31. User Management

Administrators can manage all registered users.

**User Profile Fields:**
* Full name.
* Email address.
* Phone number.
* Authentication provider.
* Account status.
* Registration date.
* Last login.
* Country.
* Number of contracts.
* Total payments.
* Active subscription (if applicable).

**Administrative Actions:**
* View profile.
* Suspend account.
* Reactivate account.
* Reset account state.
* View contract history.
* View payment history.
* Send notification.
* Assign notes (internal only).

Deleting user accounts should be avoided. Soft deletion is preferred to preserve legal and financial records.

---

# 32. Business Management

Businesses represent subscription customers.

**Business Profile:**
* Company name.
* Logo.
* Trade register number.
* Tax number (optional).
* Address.
* Contact information.
* Subscription plan.
* Subscription status.
* Renewal date.
* Monthly contract quota.
* Contracts generated this month.

**Administrative Actions:**
* Edit company profile.
* Change subscription plan.
* Extend subscription.
* Suspend business.
* Restore business.
* Review contract activity.

---

# 33. Lawyer Management

Lawyers are managed separately from general users.

**Lawyer Profile:**
* Full name.
* Email.
* Phone.
* License number.
* Specialization.
* Approval status.
* Active contracts under review.
* Completed reviews.
* Average review time.

**Administrative Actions:**
* Activate lawyer.
* Suspend lawyer.
* Verify license.
* Assign review requests.
* Monitor performance.

The platform should support multiple lawyers to distribute review workload.

---

# 34. Contract Management

Administrators must be able to inspect every contract regardless of ownership.

**Contract Information:**
* Contract ID.
* Serial number.
* Contract type.
* Owner.
* Business (if applicable).
* Current status.
* Payment status.
* Lawyer review status.
* Creation date.
* Last update.
* Expiration date.

**Administrative Actions:**
* View details.
* View PDF.
* Download PDF.
* View audit history.
* Reopen contract (special permission).
* Force archive.
* Mark as invalid.
* Restore archived contract.

All administrative actions must be recorded in the audit log.

---

# 35. Contract Configuration

Version 1.0 includes three predefined contract templates.

The administration panel shall allow configuring these templates without modifying source code.

**Editable Configuration per Field:**
* Display label.
* Placeholder.
* Required/Optional state.
* Help dialog content.
* Validation message.
* Sort order within its section.
* Visibility (enable/disable).
* Future video URL.
* Future documentation URL.

The system must reject invalid configurations that would break mandatory business rules.

Creating entirely new contract templates is **not available** in Version 1.0, but the data structures should remain extensible.

---

# 36. Pricing Management

Pricing should be centrally managed.

**Administrators can define:**
* Price per contract type.
* Individual plans.
* Business subscription plans.
* Promotional discounts.
* Coupon codes (future).
* Tax configuration (future).

Price changes must not affect previously purchased contracts.

Historical pricing records should be preserved.

---

# 37. Subscription Management

The administration panel must provide complete visibility into subscription activity.

**Features:**
* View active subscriptions.
* View expired subscriptions.
* Renew subscriptions.
* Upgrade or downgrade plans.
* Cancel subscriptions.
* Review billing history.

Automatic renewal policies should be configurable for future releases.

---

# 38. Help Content Management

Every contract field may display contextual assistance.

The administration panel should allow editing this content.

**Configurable Help Elements:**
* Short description.
* Detailed help dialog.
* Placeholder text.
* Example value.
* Future video URL.
* Future documentation link.

If optional resources such as video or documentation are not configured, the frontend should simply omit the corresponding actions without affecting the layout.

---

# 39. Lawyer Review Workflow

The platform supports an optional lawyer review service.

**Workflow:**
1. User completes the contract.
2. User selects lawyer review.
3. Payment is confirmed.
4. Contract enters the review queue.
5. A lawyer is assigned.
6. Lawyer reviews the contract.
7. Lawyer may: Approve / Reject / Request revisions.
8. The user is notified of the outcome.
9. Once approved, the final PDF is generated and made available for download.

The review process should preserve comments and timestamps for auditing.

---

# 40. Audit & Activity Logging

Every significant action must be logged.

**Examples include:**
* User login.
* Draft creation.
* Draft updates.
* Payment completion.
* PDF generation.
* Lawyer assignment.
* Lawyer decision.
* Administrator actions.
* Subscription changes.

**Each log entry should include:**
* Actor.
* Action.
* Target entity.
* Timestamp.
* IP address (optional, subject to privacy requirements).
* Additional metadata where appropriate.

The audit log must be immutable to ensure traceability.

---

# 41. Roles & Permissions

The platform shall implement Role-Based Access Control (RBAC).

**Initial Roles:**

| Role          | Description                                    |
| ------------- | ---------------------------------------------- |
| Super Admin   | Full platform control                          |
| Admin         | Standard operational access                    |
| Support       | Read-only + limited write access               |
| Lawyer        | Contract review access only                    |
| Business      | Business dashboard + subscription features     |
| Individual    | Personal contracts + downloads                 |

Permissions should be granular and assigned through roles rather than hardcoded checks.

Future versions may introduce custom roles without requiring structural database changes.

---

# 42. Operational Principles

The administration panel should prioritize safety and transparency.

**Key principles:**
* No destructive operations without confirmation.
* Soft deletion where feasible.
* Complete audit trail.
* Server-side validation for all administrative actions.
* Consistent permission enforcement across all modules.

Operational changes should take effect immediately unless explicitly scheduled.

---

# Part 5 – System Architecture & Engineering Standards {#part-5}

---

# 43. System Architecture

The Smart Contracts Platform shall adopt a modern layered architecture designed for scalability, maintainability, and long-term growth.

**Core principles include:**
* Separation of Concerns.
* Single Responsibility Principle.
* Clean Architecture concepts.
* Service-Oriented Backend.
* Stateless APIs.
* Modular Development.
* Event-Driven Operations where appropriate.

---

# 44. Technology Stack

## Frontend

| Technology      | Purpose                              |
| --------------- | ------------------------------------ |
| Next.js (Latest)| Framework (SSR + SSG + App Router)   |
| TypeScript      | Type safety                          |
| Tailwind CSS    | Styling                              |
| React Hook Form | Form management                      |
| Zod             | Schema validation                    |
| TanStack Query  | Server state management              |
| Zustand         | Global client state                  |

## Backend

| Technology       | Purpose                              |
| ---------------- | ------------------------------------ |
| Laravel (LTS)    | Main framework                       |
| PHP 8.4+         | Language                             |
| Laravel Sanctum  | API authentication                   |
| Laravel Queues   | Background jobs                      |
| Laravel Scheduler| Cron tasks                           |

## Infrastructure

| Technology              | Purpose                              |
| ----------------------- | ------------------------------------ |
| MySQL 8+                | Primary relational database          |
| Redis                   | Cache + Queue driver                 |
| S3-Compatible Storage   | PDF & file storage (Cloudflare R2 or AWS S3) |
| Redis Queue             | Async processing                     |

## Authentication

* Google OAuth via Laravel Sanctum
* Email Login via Laravel Sanctum
* Password Reset
* Magic Link (Future)

---

# 45. Why MySQL 8+ & Laravel Eloquent ORM

The platform handles structured legal data where relational integrity is essential.

MySQL 8+ provides:
* Strong ACID compliance with InnoDB engine.
* Reliable Transactions and Savepoints.
* Strict Foreign Keys and Referential Integrity.
* Native JSON columns support.
* High scalability and robust query optimization.
* Seamless native integration with Laravel Eloquent ORM.

No NoSQL database should be used for core business entities. Database access shall use Laravel Eloquent ORM models and services exclusively.

No NoSQL database should be used for core business entities.

---

# 46. Why Laravel

Laravel is selected because it provides:
* Mature ecosystem.
* Excellent ORM.
* Queue System.
* Scheduler.
* Authorization.
* Notifications.
* Mail.
* Validation.
* Storage abstraction.
* API Resources.

Laravel significantly reduces backend development time while remaining enterprise capable.

---

# 47. Why Next.js

Next.js is selected because the platform requires:
* SEO.
* Fast page loading.
* Server Side Rendering.
* Static generation for marketing pages.
* Secure authentication flows.
* Excellent developer experience.

The Admin Dashboard and User Dashboard will also share the same application.

---

# 48. Overall System Flow

```
Visitor
  → Landing Website
  → Choose Contract
  → Authentication
  → Create Draft
  → Wizard
  → Preview
  → Payment
  → Generate PDF
  → Store PDF
  → Download
  → Dashboard
```

Every step should be recoverable.

No user progress should be lost unexpectedly.

---

# 49. Backend Layer Architecture

The backend shall be organized into logical layers.

```
Presentation Layer  → Controllers, API Resources, Requests
        ↓
Application Layer   → Services, Business Logic, Transactions
        ↓
Domain Layer        → Models, Policies, Rules
        ↓
Infrastructure Layer → Database, Storage, External APIs, Email, Queue, Payment
```

---

# 50. Production-Ready Modular Architecture & DDD Folder Organization

The Laravel backend shall be organized by feature domain where each Module encapsulates its own Application, Domain, Infrastructure, and HTTP layers. The shared `app/Services` folder is strictly reserved for infrastructure-wide services (such as Storage abstractions and Encryption).

**Module Layout Pattern (`Modules/Contracts/` example):**

```
Modules/Contracts/
├── Application/
│   ├── Actions/
│   └── DTOs/
├── Domain/
│   ├── Models/
│   ├── Services/
│   ├── Events/
│   └── Exceptions/
├── Infrastructure/
│   ├── Repositories/
│   └── Pdf/
└── Http/
    ├── Controllers/
    ├── Requests/
    └── Resources/
```

# 50.1 Production-Ready Engineering & Defense-in-Depth Standards

The platform follows a **Defense-in-Depth** security philosophy with strict database-level rules and state machines:

1. **Database-Level Contract Immutability & State Machine:**
   * Contract lifecycle state machine: `DRAFT → PENDING → LOCKED`.
   * Server and database policies block any updates to legal fields or parties once state is `LOCKED`.
   * Every locked contract stores a cryptographic hash (`document_hash`), version number (`contract_versions`), and static snapshot of all terms.
   * Post-lock modifications are strictly created as formal Amendments (`Amendment`) rather than altering original records.

2. **Append-Only Cryptographic Audit Log:**
   * Audit logs are immutable and append-only at the database engine level. Even administrative roles cannot execute `DELETE` queries on audit entries.
   * Schema columns include: `actor_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `request_id`, `created_at`, `previous_hash`, `record_hash`.

3. **Server-Side Attachment Security & Signed URLs:**
   * Browser-side compression is an optimization; the Laravel backend performs strict MIME type verification, file size checks, malware scanning, and strips sensitive metadata.
   * All documents and attachments are accessed via temporary time-limited **Signed URLs** rather than public paths.

4. **Secure Z-ID Document Collaboration:**
   * Document access via `Z-ID` requires a non-guessable access token, expiry date, granular permissions (`VIEW`, `COMMENT`, `SIGN`), and logs every access event.

5. **Resource Ownership & Laravel Policies:**
   * Authorization utilizes Laravel Policies to enforce strict resource ownership (e.g. Lawyers can only inspect consultations explicitly assigned to their `lawyer_id`).

6. **Payment State Machine & Idempotent PDF Queues:**
   * Payment transaction lifecycle: `PENDING → RECEIPT_UPLOADED → UNDER_REVIEW → VERIFIED | REJECTED | EXPIRED | REFUNDED`.
   * Backend prevents duplicate receipt submissions and verifies order amounts server-side.
   * PDF Generation queue jobs are fully idempotent, linked to contract version hashes, with retry and failed-job logging.

---

# 51. API Design Standards

All APIs shall follow REST conventions.

Versioning is mandatory.

**Base URL structure:**

```
/api/v1/auth
/api/v1/contracts
/api/v1/users
/api/v1/payments
/api/v1/businesses
/api/v1/admin/...
```

# 51.1 Backend Multi-Language & Internationalization (i18n) Architecture Base

Although the initial platform UI is presented exclusively in primary Arabic (`ar`), the Laravel backend and MySQL 8+ schema are architected from day one to natively support internationalization (`i18n`) and bilingual contract generation (`Arabic/English`) without structural breaking changes:

1. **API Header Negotiation (`Accept-Language`)**:
   * All REST endpoints respect the `Accept-Language` HTTP header (`ar`, `en`, or `ar,en`).
   * API validation messages, exception responses, and email notifications inspect the caller's locale while defaulting to `ar`.

2. **Translatable Schema Design (`MySQL 8+ JSON & Translatable Fields`)**:
   * Core entities such as `contract_templates` and `contract_fields` store multilingual strings using native MySQL JSON columns or explicit locale pairs (`title_ar`, `title_en`, `description_ar`, `description_en`).
   * `users` table includes `preferred_locale VARCHAR(5) NOT NULL DEFAULT 'ar'` to track language preference for notifications and queued emails.

3. **Bilingual Contract Engine Readiness**:
   * The contract PDF generator support flag `supports_bilingual BOOLEAN DEFAULT FALSE` in template configurations allows future output of dual-column Arabic/English side-by-side legal documents when requested.

**Successful Response:**

```json
{
  "success": true,
  "message": "Contract created successfully.",
  "data": {},
  "meta": {}
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {}
}
```

---

# 52. Coding Standards

The project shall maintain consistent engineering standards.

**Requirements:**
* Strict TypeScript on frontend.
* PSR standards for Laravel.
* Consistent naming conventions.
* Reusable components.
* Reusable services.
* No duplicated business logic.
* Dependency Injection.
* SOLID principles.
* Clean commit history.

Every feature should be understandable by another developer without additional explanation.

---

# 53. Performance Requirements

**Targets:**

| Operation             | Target          |
| --------------------- | --------------- |
| Initial page load     | < 2 seconds     |
| API response (typical)| < 300ms         |
| PDF generation        | < 10 seconds    |
| Search operations     | < 500ms         |
| Dashboard rendering   | < 1 second      |

Heavy operations must always execute asynchronously using queues.

---

# 54. Scalability Principles

The system shall be designed for future growth without architectural redesign.

**Future scalability targets include:**
* Multiple countries.
* Multiple languages.
* Multiple currencies.
* Additional contract templates.
* Mobile applications.
* Third-party integrations.
* Government verification APIs.
* Electronic signature providers.
* CRM integrations.

Database design should anticipate these future requirements even if not activated in Version 1.0.

---

# 55. General Engineering Rules

The following rules are **mandatory:**

* No business logic inside Controllers.
* No direct database queries inside Controllers.
* Services contain business logic.
* Validation must occur before business execution.
* Every write operation should be transactional when multiple records are affected.
* Every critical action must generate an audit log.
* Long-running tasks must execute in background queues.
* Configuration values should never be hardcoded.
* Every feature must be extensible without breaking existing functionality.

---

# Part 6 – Database Design & Data Modeling {#part-6}

---

# 56. Database Philosophy

The database shall be designed as a platform database, not as a database for three contract types.

The initial MVP supports only:
* Rental Contract
* Apartment Sale Contract
* Freelancer Contract

However, the schema shall remain extensible to support future contract templates without structural redesign.

All business entities must use relational integrity through PostgreSQL.

---

# 57. Database Standards

**Naming Convention:**

| Element      | Convention                    |
| ------------ | ----------------------------- |
| Tables       | plural, snake_case            |
| Columns      | snake_case                    |
| Primary Key  | `id`                          |
| Foreign Keys | `xxx_id`                      |
| Timestamps   | `created_at`, `updated_at`    |
| Soft Deletes | `deleted_at`                  |

**Data Standards:**
* UUIDs may be introduced later for public identifiers.
* Monetary values shall use `DECIMAL`, never `FLOAT`.
* Dates shall use `TIMESTAMP WITH TIME ZONE` where applicable.
* `JSONB` may be used only for dynamic metadata, never for core relational entities.

---

# 58. Core Database Tables

**Authentication:**
* `users`
* `user_sessions`
* `password_resets`
* `social_accounts`

**Business:**
* `businesses`
* `business_users`
* `subscriptions`
* `subscription_plans`

**Contracts:**
* `contract_templates`
* `contract_template_sections`
* `contract_fields`
* `contracts`
* `contract_field_values`
* `contract_versions`
* `contract_attachments`

**Legal:**
* `lawyers`
* `lawyer_reviews`
* `lawyer_comments`

**Payments:**
* `payments`
* `invoices`

**Notifications:**
* `notifications`
* `notification_logs`

**System:**
* `audit_logs`
* `settings`
* `countries`

---

# 59. Users Table

The Users table stores every authenticated account.

```sql
users
  id                    BIGINT PK
  first_name            VARCHAR
  last_name             VARCHAR
  email                 VARCHAR UNIQUE
  phone                 VARCHAR
  password              VARCHAR (nullable for OAuth)
  auth_provider         ENUM (email, google)
  avatar                VARCHAR
  account_type          ENUM (individual, business)
  status                ENUM (active, suspended, pending)
  country_id            FK → countries
  email_verified_at     TIMESTAMP
  last_login_at         TIMESTAMP
  created_at            TIMESTAMP
  updated_at            TIMESTAMP
  deleted_at            TIMESTAMP (soft delete)
```

A user may belong to zero or more businesses.

---

# 60. Businesses Table

Stores company accounts.

```sql
businesses
  id                        BIGINT PK
  name                      VARCHAR
  legal_name                VARCHAR
  trade_register_number     VARCHAR
  tax_number                VARCHAR (nullable)
  logo                      VARCHAR
  email                     VARCHAR
  phone                     VARCHAR
  address                   TEXT
  subscription_plan_id      FK → subscription_plans
  subscription_status       ENUM (active, expired, cancelled)
  subscription_expires_at   TIMESTAMP
  country_id                FK → countries
  created_at                TIMESTAMP
  updated_at                TIMESTAMP
```

A business may have multiple users.

---

# 61. Contract Templates Table

The system shall not hardcode contract definitions.

Every contract type is registered as a template.

**Example records:**
* `rental` – Rental Contract
* `apartment_sale` – Apartment Sale Contract
* `freelancer` – Freelancer Agreement

**Future:**
* `vehicle_sale`, `employment`, `construction`, `partnership`, `nda`

```sql
contract_templates
  id            BIGINT PK
  name          VARCHAR
  slug          VARCHAR UNIQUE
  description   TEXT
  status        ENUM (active, inactive, draft)
  version       VARCHAR
  created_at    TIMESTAMP
  updated_at    TIMESTAMP
```

---

# 62. Contract Template Sections Table

Each template is divided into logical sections.

**Rental Example sections:** Landlord, Tenant, Property, Financial, Legal, Preview

**Apartment Sale:** Seller, Buyer, Property, Financial, Legal

**Freelancer:** Client, Contractor, Project, Timeline, Payment, Legal

```sql
contract_template_sections
  id                      BIGINT PK
  contract_template_id    FK → contract_templates
  title                   VARCHAR
  description             TEXT
  order                   INTEGER
  icon                    VARCHAR (nullable)
  created_at              TIMESTAMP
```

---

# 63. Contract Fields Table

**This is one of the most important tables in the project.**

Instead of hardcoding fields in source code, every field has a definition in the database.

The Frontend reads field definitions and renders them dynamically.

```sql
contract_fields
  id                      BIGINT PK
  section_id              FK → contract_template_sections
  field_name              VARCHAR (machine name, e.g. "monthly_rent")
  label                   VARCHAR (display label)
  placeholder             VARCHAR
  field_type              ENUM (text, number, date, select, textarea, boolean, file)
  required                BOOLEAN DEFAULT true
  validation_rule         VARCHAR (nullable, e.g. "numeric|min:1")
  default_value           VARCHAR (nullable)
  display_order           INTEGER
  help_title              VARCHAR (nullable)
  help_description        TEXT (nullable)
  example_value           VARCHAR (nullable)
  video_url               VARCHAR (nullable) -- Future ready
  is_active               BOOLEAN DEFAULT true
  created_at              TIMESTAMP
  updated_at              TIMESTAMP
```

---

# 64. Contracts Table

Represents every contract created by a user.

```sql
contracts
  id                      BIGINT PK
  serial_number           VARCHAR UNIQUE
  contract_template_id    FK → contract_templates
  user_id                 FK → users
  business_id             FK → businesses (nullable)
  status                  ENUM (draft, in_progress, completed, waiting_payment, paid, generating_pdf, waiting_review, approved, issued, expired, archived)
  payment_status          ENUM (unpaid, pending, paid, refunded)
  lawyer_review_status    ENUM (none, requested, assigned, under_review, approved, rejected)
  current_step            INTEGER DEFAULT 1
  preview_generated       BOOLEAN DEFAULT false
  pdf_generated           BOOLEAN DEFAULT false
  pdf_path                VARCHAR (nullable)
  qr_code_path            VARCHAR (nullable)
  edit_expires_at         TIMESTAMP (nullable)
  issued_at               TIMESTAMP (nullable)
  created_at              TIMESTAMP
  updated_at              TIMESTAMP
```

---

# 65. Contract Field Values Table

Instead of creating a separate table for each contract type, user-entered data is stored as key-value pairs linked to field definitions.

```sql
contract_field_values
  id              BIGINT PK
  contract_id     FK → contracts
  field_id        FK → contract_fields
  value           TEXT
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

  UNIQUE (contract_id, field_id)
```

**Example data:**

```
contract_id = 150
  field: landlord_name    → "Ahmed Mohamed"
  field: tenant_name      → "Ali Hassan"
  field: monthly_rent     → "5000"
  field: start_date       → "2026-08-01"
```

This design allows adding new contract types in the future without any structural database changes.

---

# 66. Payments Table

```sql
payments
  id                BIGINT PK
  contract_id       FK → contracts
  user_id           FK → users
  amount            DECIMAL(10,2)
  currency          VARCHAR DEFAULT 'EGP'
  status            ENUM (pending, completed, failed, refunded)
  payment_method    VARCHAR
  provider          VARCHAR (e.g. "stripe", "paymob")
  provider_ref      VARCHAR (nullable)
  paid_at           TIMESTAMP (nullable)
  created_at        TIMESTAMP
  updated_at        TIMESTAMP
```

---

# 67. Lawyer Reviews Table

```sql
lawyer_reviews
  id                BIGINT PK
  contract_id       FK → contracts
  lawyer_id         FK → lawyers
  status            ENUM (pending, under_review, approved, rejected, revision_requested)
  decision          ENUM (approved, rejected, revision_requested) nullable
  notes             TEXT (nullable)
  assigned_at       TIMESTAMP
  reviewed_at       TIMESTAMP (nullable)
  created_at        TIMESTAMP
  updated_at        TIMESTAMP
```

---

# 68. Audit Logs Table

Every significant platform action must be recorded.

```sql
audit_logs
  id              BIGINT PK
  actor_id        FK → users (nullable for system)
  actor_type      ENUM (user, admin, lawyer, system)
  action          VARCHAR (e.g. "contract.created", "payment.completed")
  target_type     VARCHAR (e.g. "Contract", "User")
  target_id       BIGINT
  metadata        JSONB (nullable)
  ip_address      VARCHAR (nullable)
  created_at      TIMESTAMP
```

Audit logs must be **immutable**. No update or delete operations should be permitted on this table.

---

# 69. Settings Table

Platform-wide configuration values.

```sql
settings
  id          BIGINT PK
  key         VARCHAR UNIQUE
  value       TEXT
  group       VARCHAR (e.g. "payment", "email", "platform")
  is_public   BOOLEAN DEFAULT false
  updated_at  TIMESTAMP
```

---

# 70. Subscription Plans Table

```sql
subscription_plans
  id                    BIGINT PK
  name                  VARCHAR
  slug                  VARCHAR UNIQUE
  target                ENUM (individual, business)
  price_monthly         DECIMAL(10,2)
  contract_quota        INTEGER (nullable, null = unlimited)
  features              JSONB
  is_active             BOOLEAN DEFAULT true
  created_at            TIMESTAMP
  updated_at            TIMESTAMP
```

---

# 71. Database Relationships Summary

```
users           →  many → contracts
users           →  many → payments
users           →  many → businesses (via business_users)
businesses      →  one  → subscription_plans
contracts       →  one  → contract_templates
contracts       →  many → contract_field_values
contract_field_values → one → contract_fields
contract_fields →  one  → contract_template_sections
contract_template_sections → one → contract_templates
contracts       →  many → lawyer_reviews
lawyer_reviews  →  one  → lawyers
contracts       →  one  → payments
all entities    →  many → audit_logs
```

---

# 72. Data Integrity Rules

The following rules must be enforced at the database level wherever possible:

* Foreign key constraints on all relational columns.
* `NOT NULL` on all mandatory fields.
* `UNIQUE` constraints on email, serial_number, slug.
* `CHECK` constraints on ENUM columns.
* No orphaned records allowed.
* Cascade rules defined explicitly for each relationship.

---



# Part 7 – API Specifications & Authentication {#part-7}

---

# 73. Authentication Architecture

The platform uses **Laravel Sanctum** for authentication with two modes:

**SPA Mode (Cookie-based):** Used by the Next.js frontend. Sanctum issues an encrypted session cookie after login. CSRF protection is enforced via X-XSRF-TOKEN header.

**API Token Mode:** Used for mobile apps or third-party integrations in future releases. Bearer tokens stored in personal_access_tokens table.

**Authentication Flow:**

`
Frontend (Next.js)
  → GET /sanctum/csrf-cookie       (get CSRF token)
  → POST /api/v1/auth/login        (authenticate)
  → Cookie set                     (session established)
  → All subsequent requests carry  (session cookie + XSRF token)
`

---

# 74. Registration Flow

**Endpoint:** POST /api/v1/auth/register

**Request:**
`json
{
  "first_name": "أحمد",
  "last_name": "محمد",
  "email": "ahmed@example.com",
  "phone": "01012345678",
  "password": "SecurePass123!",
  "password_confirmation": "SecurePass123!",
  "account_type": "individual"
}
`

**Validation Rules:**

| Field                  | Rules                                                    |
| ---------------------- | -------------------------------------------------------- |
| first_name             | required, string, min:2, max:50                          |
| last_name              | required, string, min:2, max:50                          |
| email                  | required, email, unique:users, max:255                   |
| phone                  | required, regex:/^01[0125][0-9]{8}$/, unique:users       |
| password               | required, min:8, confirmed, mixed case + number          |
| account_type           | required, in:individual,business                         |

**Success Response (201):**
`json
{
  "success": true,
  "message": "Account created successfully. Please verify your email.",
  "data": {
    "user": {
      "id": 1,
      "first_name": "أحمد",
      "last_name": "محمد",
      "email": "ahmed@example.com",
      "account_type": "individual",
      "email_verified": false
    }
  }
}
`

**Error Response (422):**
`json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "email": ["The email has already been taken."],
    "phone": ["The phone format is invalid. Use Egyptian format: 01XXXXXXXXX"]
  }
}
`

---

# 75. Login Flow

## Email & Password Login

**Endpoint:** POST /api/v1/auth/login

**Request:**
`json
{
  "email": "ahmed@example.com",
  "password": "SecurePass123!"
}
`

**Success Response (200):**
`json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 1,
      "first_name": "أحمد",
      "last_name": "محمد",
      "email": "ahmed@example.com",
      "account_type": "individual",
      "email_verified": true,
      "has_active_drafts": true
    }
  }
}
`

**Rate Limit:** 5 attempts per minute per IP.

## Google OAuth Flow

`
Frontend                          Backend                         Google
  |                                 |                               |
  |-- Click "Sign in with Google" --|                               |
  |                                 |-- GET /auth/google/redirect --|
  |                                 |                               |
  |                                 |<-- Redirect to Google --------|
  |-- User authenticates ---------->|                               |
  |                                 |<-- Callback with code --------|
  |                                 |-- Exchange code for user -----|
  |                                 |-- Find or create user --------|
  |                                 |-- Create session --------------|
  |<-- Redirect to dashboard ------|                               |
`

**Endpoints:**
- GET /api/v1/auth/google/redirect — Redirects to Google OAuth consent
- GET /api/v1/auth/google/callback — Handles OAuth callback

**User Linking Logic:**
1. If email exists in users table → link social_accounts record → login
2. If email not found → create new user + social_accounts record → login

---

# 76. Password Reset Flow

**Step 1 — Request Reset:**
POST /api/v1/auth/forgot-password

`json
{ "email": "ahmed@example.com" }
`

Response: { "success": true, "message": "Password reset link sent." }

**Rate Limit:** 3 requests per 15 minutes per email.

**Step 2 — Reset Password:**
POST /api/v1/auth/reset-password

`json
{
  "token": "abc123...",
  "email": "ahmed@example.com",
  "password": "NewSecurePass456!",
  "password_confirmation": "NewSecurePass456!"
}
`

Token expires after **60 minutes**.

---

# 77. Email Verification

**Endpoint:** POST /api/v1/auth/email/verify/{id}/{hash}

**Resend:** POST /api/v1/auth/email/resend

**Rate Limit:** 3 resend requests per 15 minutes.

Verification link expires after **24 hours**.

Unverified users can create drafts but **cannot** proceed to payment.

---

# 78. Session Management

| Setting                | Value                    |
| ---------------------- | ------------------------ |
| Session Lifetime       | 120 minutes              |
| Remember Me Duration   | 30 days                  |
| Concurrent Sessions    | Allowed (max 5 devices)  |
| Session Driver         | Redis                    |
| Token Refresh          | Automatic via Sanctum    |

---

# 79. Authentication Middleware

**Laravel Middleware Groups:**

`php
'auth'     => ['auth:sanctum']           // Authenticated users
'admin'    => ['auth:sanctum', 'role:admin']
'lawyer'   => ['auth:sanctum', 'role:lawyer']
'business' => ['auth:sanctum', 'role:business']
'verified' => ['auth:sanctum', 'verified']
`

**Next.js Middleware (middleware.ts):**

| Route Pattern          | Guard         | Redirect if Unauthorized    |
| ---------------------- | ------------- | --------------------------- |
| /dashboard/*           | authenticated | /login                      |
| /admin/*               | admin role    | /login                      |
| /lawyer/*              | lawyer role   | /login                      |
| /business/*            | business role | /login                      |
| /contract/create/*     | authenticated | /login?redirect={url}       |
| /login, /register      | guest only    | /dashboard                  |

---

# 80. OAuth Provider Configuration

**Google OAuth Setup:**

`env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=https://api.domain.com/api/v1/auth/google/callback
`

**User Creation from OAuth:**

`
1. Extract: email, name, avatar, google_id
2. Check users table for email match
3. If found: link social_account, update avatar if null
4. If not found: create user (password=null, auth_provider=google, email_verified_at=now)
5. Create session
6. Redirect to frontend with session cookie
`

---

# 81. Auth API Endpoints Summary

| Method | Endpoint                            | Auth | Purpose              |
| ------ | ----------------------------------- | ---- | -------------------- |
| POST   | /api/v1/auth/register               | No   | User registration    |
| POST   | /api/v1/auth/login                  | No   | Email login          |
| POST   | /api/v1/auth/logout                 | Yes  | Logout               |
| GET    | /api/v1/auth/user                   | Yes  | Current user profile |
| POST   | /api/v1/auth/forgot-password        | No   | Request password reset |
| POST   | /api/v1/auth/reset-password         | No   | Reset password       |
| POST   | /api/v1/auth/email/resend           | Yes  | Resend verification  |
| GET    | /api/v1/auth/google/redirect        | No   | Google OAuth start   |
| GET    | /api/v1/auth/google/callback        | No   | Google OAuth callback |

---

# 82. User API Endpoints

| Method | Endpoint                            | Auth | Purpose              |
| ------ | ----------------------------------- | ---- | -------------------- |
| GET    | /api/v1/user/profile                | Yes  | Get profile          |
| PUT    | /api/v1/user/profile                | Yes  | Update profile       |
| PUT    | /api/v1/user/password               | Yes  | Change password      |
| GET    | /api/v1/user/notifications          | Yes  | List notifications   |
| PUT    | /api/v1/user/notifications/{id}/read | Yes  | Mark as read        |
| GET    | /api/v1/user/contracts              | Yes  | My contracts list    |
| GET    | /api/v1/user/dashboard              | Yes  | Dashboard summary    |

---

# 83. Contract API Endpoints

| Method | Endpoint                              | Auth | Purpose                  |
| ------ | ------------------------------------- | ---- | ------------------------ |
| GET    | /api/v1/contracts/templates           | No   | List available templates |
| GET    | /api/v1/contracts/templates/{slug}    | No   | Template detail + pricing|
| POST   | /api/v1/contracts                     | Yes  | Create draft             |
| GET    | /api/v1/contracts/{id}                | Yes  | Get contract detail      |
| GET    | /api/v1/contracts/{id}/steps          | Yes  | Get wizard steps/fields  |
| GET    | /api/v1/contracts/{id}/steps/{step}   | Yes  | Get specific step fields |
| PUT    | /api/v1/contracts/{id}/steps/{step}   | Yes  | Save step data           |
| DELETE | /api/v1/contracts/{id}                | Yes  | Delete draft             |

**Create Draft Request:**
`json
{
  "template_slug": "rental",
  "business_id": null
}
`

**Create Draft Response (201):**
`json
{
  "success": true,
  "data": {
    "contract": {
      "id": 150,
      "serial_number": null,
      "template": { "slug": "rental", "name": "Rental Contract" },
      "status": "draft",
      "current_step": 1,
      "total_steps": 6,
      "created_at": "2026-07-07T00:00:00Z"
    }
  }
}
`

---

# 84. Auto-Save API

**Endpoint:** PATCH /api/v1/contracts/{id}/auto-save

**Request:**
`json
{
  "step": 2,
  "fields": {
    "tenant_name": "علي حسن",
    "tenant_national_id": "29901011234567",
    "tenant_phone": "01112345678"
  },
  "updated_at": "2026-07-07T00:01:30Z"
}
`

**Response (200):**
`json
{
  "success": true,
  "message": "Draft saved.",
  "data": {
    "saved_at": "2026-07-07T00:01:31Z",
    "version": 12
  }
}
`

**Conflict Resolution:**
- Server compares updated_at with stored version
- If client timestamp < server timestamp → return 409 Conflict
- Frontend shows: "تم تحديث العقد من جهاز آخر. هل تريد تحميل النسخة الأحدث؟"

**Debounce:** Frontend debounces auto-save to 2 seconds after last field change.

---

# 85. Preview & Generation API

| Method | Endpoint                              | Auth | Purpose                  |
| ------ | ------------------------------------- | ---- | ------------------------ |
| POST   | /api/v1/contracts/{id}/preview        | Yes  | Generate preview         |
| GET    | /api/v1/contracts/{id}/preview/status | Yes  | Preview generation status|
| POST   | /api/v1/contracts/{id}/generate       | Yes  | Trigger PDF generation   |
| GET    | /api/v1/contracts/{id}/generate/status| Yes  | PDF generation status    |
| GET    | /api/v1/contracts/{id}/download       | Yes  | Download final PDF       |

**Preview Response:**
`json
{
  "success": true,
  "data": {
    "preview_url": "https://storage.../preview_150.pdf?signed=...",
    "expires_at": "2026-07-07T01:00:00Z",
    "has_watermark": true
  }
}
`

---

# 86. Payment API Endpoints

| Method | Endpoint                              | Auth | Purpose                  |
| ------ | ------------------------------------- | ---- | ------------------------ |
| POST   | /api/v1/payments/initiate             | Yes  | Start payment            |
| POST   | /api/v1/payments/callback             | No*  | Payment provider webhook |
| GET    | /api/v1/payments/{id}/verify          | Yes  | Verify payment status    |
| GET    | /api/v1/payments/history              | Yes  | Payment history          |

*Webhook endpoint authenticated via provider signature verification.

**Initiate Payment Request:**
`json
{
  "contract_id": 150,
  "include_lawyer_review": false
}
`

**Response:**
`json
{
  "success": true,
  "data": {
    "payment_id": 75,
    "amount": 59.00,
    "currency": "EGP",
    "redirect_url": "https://payment-provider.com/pay/...",
    "expires_at": "2026-07-07T00:30:00Z"
  }
}
`

---

# 87. Business API Endpoints

| Method | Endpoint                                  | Auth     | Purpose                  |
| ------ | ----------------------------------------- | -------- | ------------------------ |
| GET    | /api/v1/business/profile                  | Business | Company profile          |
| PUT    | /api/v1/business/profile                  | Business | Update profile           |
| GET    | /api/v1/business/subscription             | Business | Current subscription     |
| GET    | /api/v1/business/contracts                | Business | Business contracts       |
| GET    | /api/v1/business/statistics               | Business | Usage stats              |
| GET    | /api/v1/business/invoices                 | Business | Billing history          |

---

# 88. Lawyer API Endpoints

| Method | Endpoint                                  | Auth    | Purpose                  |
| ------ | ----------------------------------------- | ------- | ------------------------ |
| GET    | /api/v1/lawyer/queue                      | Lawyer  | Pending reviews          |
| GET    | /api/v1/lawyer/reviews/{id}               | Lawyer  | Review detail            |
| POST   | /api/v1/lawyer/reviews/{id}/approve       | Lawyer  | Approve contract         |
| POST   | /api/v1/lawyer/reviews/{id}/reject        | Lawyer  | Reject contract          |
| POST   | /api/v1/lawyer/reviews/{id}/revision      | Lawyer  | Request revision         |
| POST   | /api/v1/lawyer/reviews/{id}/comments      | Lawyer  | Add comment              |
| GET    | /api/v1/lawyer/history                    | Lawyer  | Completed reviews        |
| GET    | /api/v1/lawyer/statistics                 | Lawyer  | Performance stats        |

---

# 89. Admin API Endpoints

| Method | Endpoint                                  | Auth  | Purpose                  |
| ------ | ----------------------------------------- | ----- | ------------------------ |
| GET    | /api/v1/admin/users                       | Admin | List users (paginated)   |
| GET    | /api/v1/admin/users/{id}                  | Admin | User detail              |
| PUT    | /api/v1/admin/users/{id}/status           | Admin | Suspend/activate         |
| GET    | /api/v1/admin/businesses                  | Admin | List businesses          |
| GET    | /api/v1/admin/businesses/{id}             | Admin | Business detail          |
| PUT    | /api/v1/admin/businesses/{id}             | Admin | Edit business            |
| GET    | /api/v1/admin/lawyers                     | Admin | List lawyers             |
| PUT    | /api/v1/admin/lawyers/{id}/status         | Admin | Activate/suspend lawyer  |
| GET    | /api/v1/admin/contracts                   | Admin | List all contracts       |
| GET    | /api/v1/admin/contracts/{id}              | Admin | Contract detail          |
| PUT    | /api/v1/admin/contracts/{id}/status       | Admin | Update contract status   |

**Pagination Format:**
`json
{
  "success": true,
  "data": [...],
  "meta": {
    "current_page": 1,
    "last_page": 10,
    "per_page": 20,
    "total": 200,
    "from": 1,
    "to": 20
  }
}
`

---

# 90. Admin Contract Config API

| Method | Endpoint                                           | Auth  | Purpose                    |
| ------ | -------------------------------------------------- | ----- | -------------------------- |
| GET    | /api/v1/admin/templates                            | Admin | List templates             |
| GET    | /api/v1/admin/templates/{id}/sections              | Admin | Template sections          |
| GET    | /api/v1/admin/templates/{id}/fields                | Admin | All fields for template    |
| PUT    | /api/v1/admin/fields/{id}                          | Admin | Update field config        |
| PUT    | /api/v1/admin/fields/reorder                       | Admin | Reorder fields             |
| PUT    | /api/v1/admin/sections/reorder                     | Admin | Reorder sections           |

**Update Field Config Request:**
`json
{
  "label": "قيمة الإيجار الشهري",
  "placeholder": "مثال: 5000",
  "required": true,
  "help_description": "اكتب المبلغ المتفق عليه شهرياً بالأرقام فقط",
  "validation_rule": "required|numeric|min:1",
  "display_order": 3,
  "is_active": true,
  "video_url": null
}
`

---

# 91. Admin Pricing API

| Method | Endpoint                                      | Auth  | Purpose                   |
| ------ | --------------------------------------------- | ----- | ------------------------- |
| GET    | /api/v1/admin/pricing                         | Admin | List all prices           |
| PUT    | /api/v1/admin/pricing/{template_id}           | Admin | Update template price     |
| GET    | /api/v1/admin/subscription-plans              | Admin | List subscription plans   |
| POST   | /api/v1/admin/subscription-plans              | Admin | Create plan               |
| PUT    | /api/v1/admin/subscription-plans/{id}         | Admin | Update plan               |
| GET    | /api/v1/admin/subscriptions                   | Admin | List active subscriptions |

---

# 92. Admin Analytics API

**Endpoint:** GET /api/v1/admin/analytics/dashboard

**Query Parameters:** ?from=2026-07-01&to=2026-07-07

**Response:**
`json
{
  "success": true,
  "data": {
    "users": { "total": 1250, "new_today": 15, "active_30d": 450 },
    "businesses": { "total": 35, "active": 28 },
    "lawyers": { "total": 8, "active": 5 },
    "contracts": {
      "total": 3200,
      "created_today": 42,
      "awaiting_payment": 18,
      "awaiting_review": 7,
      "issued_today": 35,
      "by_type": { "rental": 1800, "apartment_sale": 900, "freelancer": 500 }
    },
    "revenue": { "today": 2450, "week": 15800, "month": 62000, "currency": "EGP" },
    "subscriptions": { "active": 22, "expiring_soon": 3 }
  }
}
`

---

# 93. Admin Audit Logs API

**Endpoint:** GET /api/v1/admin/audit-logs

**Query Parameters:** ?actor_id=5&action=contract.created&from=2026-07-01&page=1&per_page=50

**Response entry:**
`json
{
  "id": 5001,
  "actor": { "id": 5, "name": "أحمد محمد", "type": "user" },
  "action": "contract.created",
  "target": { "type": "Contract", "id": 150 },
  "metadata": { "template": "rental" },
  "ip_address": "41.xxx.xxx.xxx",
  "created_at": "2026-07-07T00:00:00Z"
}
`

---

# 94. QR Verification Public API

**Endpoint:** GET /api/v1/verify/{serial}

**No authentication required.**

**Response (200):**
`json
{
  "success": true,
  "data": {
    "verified": true,
    "serial": "SCP-2026-RNT-000042",
    "contract_type": "Rental Contract",
    "party_1": "أحمد م***",
    "party_2": "علي ح***",
    "issued_at": "2026-07-07",
    "status": "issued",
    "platform": "Smart Contracts Platform"
  }
}
`

**Response (404):**
`json
{
  "success": false,
  "message": "Contract not found or invalid serial number."
}
`

---

# 95. Rate Limiting Policy

| Route Group         | Limit              | Window    |
| ------------------- | ------------------ | --------- |
| Auth (login/register)| 5 requests         | 1 minute  |
| Password Reset      | 3 requests          | 15 minutes|
| Email Resend        | 3 requests          | 15 minutes|
| General API         | 60 requests         | 1 minute  |
| Auto-Save           | 30 requests         | 1 minute  |
| Payment             | 10 requests         | 1 minute  |
| Admin API           | 120 requests        | 1 minute  |
| Public (verify)     | 30 requests         | 1 minute  |

**Rate Limit Response Headers:**
`
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
Retry-After: 30 (on 429 status)
`


# Part 8 – Screen Specifications & Frontend Architecture {#part-8}

---

# 96. Next.js Project Structure

`
frontend/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                    # Landing page
│   │   ├── pricing/page.tsx
│   │   ├── contracts/[slug]/page.tsx   # Contract detail
│   │   ├── faq/page.tsx
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   └── verify/[serial]/page.tsx    # QR verification
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx
│   │   ├── contracts/page.tsx
│   │   ├── contracts/[id]/page.tsx
│   │   ├── contracts/[id]/wizard/page.tsx
│   │   ├── contracts/[id]/preview/page.tsx
│   │   ├── profile/page.tsx
│   │   └── settings/page.tsx
│   ├── (business)/
│   │   ├── business/page.tsx
│   │   ├── business/contracts/page.tsx
│   │   ├── business/subscription/page.tsx
│   │   ├── business/profile/page.tsx
│   │   └── business/invoices/page.tsx
│   ├── (lawyer)/
│   │   ├── lawyer/page.tsx
│   │   ├── lawyer/reviews/page.tsx
│   │   ├── lawyer/reviews/[id]/page.tsx
│   │   └── lawyer/history/page.tsx
│   ├── (admin)/
│   │   ├── admin/page.tsx              # Admin dashboard
│   │   ├── admin/users/page.tsx
│   │   ├── admin/users/[id]/page.tsx
│   │   ├── admin/businesses/page.tsx
│   │   ├── admin/lawyers/page.tsx
│   │   ├── admin/contracts/page.tsx
│   │   ├── admin/contracts/[id]/page.tsx
│   │   ├── admin/templates/page.tsx
│   │   ├── admin/templates/[id]/fields/page.tsx
│   │   ├── admin/pricing/page.tsx
│   │   ├── admin/subscriptions/page.tsx
│   │   ├── admin/analytics/page.tsx
│   │   ├── admin/audit-logs/page.tsx
│   │   └── admin/settings/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                   # Atoms: Button, Input, Select, Badge, Card, Modal, Tooltip
│   ├── forms/                # Form fields: TextField, NumberField, DateField, FileField
│   ├── wizard/               # WizardLayout, WizardStep, ProgressBar, AutoSaveIndicator
│   ├── layout/               # Header, Footer, Sidebar, DashboardLayout, AdminLayout
│   ├── contracts/            # ContractCard, ContractTable, ContractStatusBadge
│   └── shared/               # EmptyState, LoadingSpinner, ErrorBoundary, Pagination
├── hooks/
│   ├── useAuth.ts
│   ├── useContracts.ts
│   ├── useAutoSave.ts
│   ├── useWizard.ts
│   └── useDebounce.ts
├── lib/
│   ├── api.ts                # Axios instance + interceptors
│   ├── auth.ts               # Auth helpers
│   └── utils.ts              # General utilities
├── services/
│   ├── authService.ts
│   ├── contractService.ts
│   ├── paymentService.ts
│   ├── userService.ts
│   └── adminService.ts
├── stores/
│   ├── authStore.ts          # Zustand: user, isAuthenticated, login, logout
│   ├── wizardStore.ts        # Zustand: currentStep, fields, values, isDirty
│   └── uiStore.ts            # Zustand: sidebar, modals, toasts
├── types/
│   ├── auth.ts
│   ├── contract.ts
│   ├── user.ts
│   ├── payment.ts
│   └── api.ts                # ApiResponse<T>, PaginatedResponse<T>
├── middleware.ts              # Route protection
├── tailwind.config.ts
└── next.config.ts
`

---

# 97. Routing Architecture

**Route Groups and Their Layouts:**

| Group        | Layout           | Auth Required | Role Required |
| ------------ | ---------------- | ------------- | ------------- |
| (public)     | PublicLayout     | No            | None          |
| (auth)       | AuthLayout       | No (guest)    | None          |
| (dashboard)  | DashboardLayout  | Yes           | Any user      |
| (business)   | BusinessLayout   | Yes           | Business      |
| (lawyer)     | LawyerLayout     | Yes           | Lawyer        |
| (admin)      | AdminLayout      | Yes           | Admin         |

---

# 98. Component Architecture

**Naming Conventions:**
- Components: PascalCase (ContractCard.tsx)
- Hooks: camelCase with use prefix (useAutoSave.ts)
- Services: camelCase with Service suffix (contractService.ts)
- Stores: camelCase with Store suffix (uthStore.ts)
- Types: PascalCase interfaces (ContractTemplate, User)

**Component Structure:**
`
components/ui/Button/
├── Button.tsx
├── Button.test.tsx
└── index.ts
`

---

# 99. State Management

| Category       | Tool           | Purpose                                           |
| -------------- | -------------- | ------------------------------------------------- |
| Server State   | TanStack Query | API data fetching, caching, refetching            |
| Auth State     | Zustand        | User session, authentication status               |
| Wizard State   | Zustand        | Current step, field values, dirty tracking        |
| UI State       | Zustand        | Sidebar, modals, toasts, theme                    |
| Form State     | React Hook Form| Field values, validation, errors (per-form scope) |

**TanStack Query Keys Convention:**
`	ypescript
['contracts', 'list']
['contracts', 'detail', contractId]
['contracts', 'steps', contractId, stepNumber]
['admin', 'users', 'list', { page, filters }]
['admin', 'analytics', 'dashboard', { from, to }]
`

---

# 100. Dynamic Form Architecture

The wizard dynamically renders form fields based on API-provided field definitions.

**Field Type → Component Mapping:**

| API field_type | Frontend Component | Props                              |
| -------------- | ------------------ | ---------------------------------- |
| text           | TextField          | label, placeholder, help, required |
| number         | NumberField        | label, min, max, placeholder       |
| date           | DatePickerField    | label, minDate, maxDate            |
| select         | SelectField        | label, options, placeholder        |
| textarea       | TextAreaField      | label, rows, maxLength             |
| boolean        | ToggleField        | label, description                 |
| file           | FileUploadField    | label, accept, maxSize             |

**Dynamic Rendering Flow:**
`
1. Fetch step fields from API → GET /contracts/{id}/steps/{step}
2. Map each field to corresponding component
3. Build Zod schema from validation rules
4. Register fields with React Hook Form
5. Render fields in display_order
6. Show help_description in tooltip/dialog
`

---

# 101. API Client

`	ypescript
// lib/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,     // Send cookies
  headers: { 'Accept': 'application/json' }
});

// CSRF token interceptor
api.interceptors.request.use(async (config) => {
  if (['post','put','patch','delete'].includes(config.method)) {
    await api.get('/sanctum/csrf-cookie');
  }
  return config;
});

// Error interceptor
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) redirectToLogin();
    if (error.response?.status === 429) showRateLimitToast();
    return Promise.reject(error.response?.data);
  }
);
`

---

# 102. Design System

**Brand Colors:**

| Token         | Light Mode  | Dark Mode   | Usage                    |
| ------------- | ----------- | ----------- | ------------------------ |
| primary       | #2563EB     | #3B82F6     | CTA buttons, links       |
| primary-dark  | #1D4ED8     | #2563EB     | Hover states             |
| secondary     | #059669     | #10B981     | Success, confirmations   |
| accent        | #7C3AED     | #8B5CF6     | Highlights, badges       |
| danger        | #DC2626     | #EF4444     | Errors, destructive      |
| warning       | #D97706     | #F59E0B     | Warnings                 |
| surface       | #FFFFFF     | #1F2937     | Card backgrounds         |
| background    | #F9FAFB     | #111827     | Page background          |
| text-primary  | #111827     | #F9FAFB     | Main text                |
| text-secondary| #6B7280     | #9CA3AF     | Muted text               |
| border        | #E5E7EB     | #374151     | Borders, dividers        |

**Typography Scale (Inter / Cairo for Arabic):**

| Token | Size   | Weight | Usage        |
| ----- | ------ | ------ | ------------ |
| h1    | 36px   | 700    | Page titles  |
| h2    | 30px   | 600    | Sections     |
| h3    | 24px   | 600    | Subsections  |
| h4    | 20px   | 500    | Card titles  |
| body  | 16px   | 400    | Body text    |
| small | 14px   | 400    | Captions     |
| xs    | 12px   | 400    | Labels       |

**Breakpoints:**

| Name | Width   |
| ---- | ------- |
| sm   | 640px   |
| md   | 768px   |
| lg   | 1024px  |
| xl   | 1280px  |
| 2xl  | 1536px  |

**RTL Support:** dir="rtl" on <html>. Tailwind CSS 
tl: variant for directional styles.

---

# 103. Landing Page Specification

**Route:** /
**Auth:** None
**Layout:** PublicLayout (Header + Footer)

**Sections:**

1. **Hero:** Headline (اصنع عقودك القانونية بذكاء), subtitle, CTA button (ابدأ الآن), background illustration
2. **Contract Types Cards:** 3 cards (Rental, Sale, Freelancer) with icon, name, description, price, estimated time, "ابدأ إنشاء العقد" button
3. **How It Works:** 4-step visual (اختر العقد → أجب على الأسئلة → راجع العقد → حمّل PDF)
4. **Pricing Preview:** Simple price table for individuals + link to full pricing
5. **Business CTA:** Banner for business subscriptions
6. **Testimonials:** User quotes (placeholder for MVP)
7. **FAQ Section:** Expandable accordion with common questions
8. **Footer:** Links, copyright, social media placeholders

---

# 104. Pricing Page

**Route:** /pricing

**Sections:**
1. **Individual Pricing Table:** 3 contract types with prices
2. **Business Plans Comparison:** Starter / Medium / Enterprise with features matrix
3. **FAQ:** Pricing-specific questions

---

# 105. Contract Detail Page

**Route:** /contracts/{slug} (e.g. /contracts/rental)
**Auth:** None

**Content:** Contract description, key features list, suitable audience, estimated time, price, sample output preview, CTA: "ابدأ إنشاء العقد"

Clicking CTA → check auth → if not logged in redirect to login with ?redirect=/contracts/{slug}/create

---

# 106-108. Static & Auth Pages

**Static Pages:** About (/about), Contact (/contact), Privacy (/privacy), Terms (/terms)

**Login Page** (/login): Google OAuth button (top), divider, email + password form, forgot password link, register link

**Register Page** (/register): First name, Last name, Email, Phone, Password, Confirm password, Google sign up button, Terms checkbox

---

# 109. User Dashboard Home

**Route:** /dashboard
**Auth:** Individual/Business

**Components:**
- **Resume Banner:** If drafts exist: "لديك عقد غير مكتمل" + Continue / Delete / New buttons
- **Summary Cards:** Total contracts, Active drafts, Completed contracts, Total spent
- **Recent Contracts Table:** Last 5 contracts with status badges
- **Quick Actions:** Create Rental / Create Sale / Create Freelancer buttons

**Empty State:** "لم تقم بإنشاء أي عقود بعد. ابدأ أول عقد لك الآن!"

---

# 110. My Contracts Page

**Route:** /contracts
**Auth:** Required

**Features:**
- Filterable by: status, type, date range
- Sortable by: date, status, type
- Search by serial number
- Actions per row: View, Download (if paid), Continue (if draft), Delete (if draft)

---

# 111. Contract Detail View

**Route:** /contracts/{id}

**Components:**
- **Status Timeline:** Visual stepper showing contract lifecycle
- **Contract Info:** Type, serial, creation date, last update
- **PDF Preview:** Embedded PDF viewer (if generated)
- **Actions:** Download PDF, Edit (if within 24hr window), Request Lawyer Review
- **Lawyer Review Status:** Comments, status, reviewer name

---

# 112. Profile & Settings

**Route:** /profile

**Sections:**
- Personal info form (name, email, phone)
- Password change form
- Linked accounts (Google status)
- Notification preferences

---

# 113. Wizard Layout

**Route:** /contracts/{id}/wizard

**Structure:**
`
┌─────────────────────────────────────┐
│  Progress Bar (Step 3 of 6)         │
│  Step Name: معلومات العقار          │
├─────────────────────────────────────┤
│                                     │
│  [Dynamic Fields]                   │
│                                     │
│  ┌──────────┐    ┌──────────┐      │
│  │  السابق  │    │  التالي  │      │
│  └──────────┘    └──────────┘      │
├─────────────────────────────────────┤
│  Auto-save: تم الحفظ ✓  |  خروج    │
└─────────────────────────────────────┘
`

**Auto-Save Indicator States:**
- جاري الحفظ... (saving)
- تم الحفظ ✓ (saved)
- فشل الحفظ - جاري المحاولة... (retry)
- فشل الحفظ ✕ (failed — show retry button)

**Exit Confirmation:** "لديك تغييرات غير محفوظة. هل تريد الخروج؟" + حفظ والخروج / خروج بدون حفظ / إلغاء

---

# 114. Wizard Step Component

**Dynamic Field Rendering:**
`
For each field in step.fields (sorted by display_order):
  1. Determine component from field_type
  2. Render with: label, placeholder, required indicator
  3. If help_description exists → show (?) icon → opens help dialog
  4. If video_url exists (future) → show ▶ button
  5. Bind to React Hook Form
  6. Show inline validation errors
  7. On blur → trigger auto-save
`

**Conditional Fields Logic:**
`
1. Fetch conditions from API alongside fields
2. Watch trigger field value
3. Show/hide dependent fields based on condition
4. When hidden → remove from validation → clear value
`

---

# 115. Contract Preview Page

**Route:** /contracts/{id}/preview

**Components:**
- **PDF-like Container:** White A4-ratio container, scrollable
- **Watermark Overlay:** Diagonal "معاينة فقط" semi-transparent
- **Action Bar:** "ادفع وحمّل" button + "اطلب مراجعة محامي" button + "عدّل العقد" button
- **Price Display:** Shows total amount

---

# 116. Wizard Data Flow

`
Page Load
  → Fetch contract + current step       (GET /contracts/{id})
  → Fetch step fields                    (GET /contracts/{id}/steps/{step})
  → Build Zod schema from validation rules
  → Populate form with saved values
  → Enable auto-save watcher

User Interaction
  → Field change → mark dirty
  → Field blur → debounce 2s → PATCH /contracts/{id}/auto-save
  → "Next" click → validate all fields → if valid: save → increment step
  → "Back" click → save current → decrement step
  → Last step "Next" → redirect to Preview
`

---

# 117-118. Business Dashboard

**Business Home** (/business): Company card, subscription status + expiry, contracts this month vs quota, recent contracts chart

**Subscription Page** (/business/subscription): Current plan details, upgrade/downgrade buttons, billing history table, next renewal date

---

# 119-120. Admin Dashboard

**Admin Layout:** Fixed left sidebar (280px) with module icons + labels, collapsible on mobile. Top bar with admin name, avatar, notification bell, logout.

**Admin Home** (/admin): Analytics cards (users, contracts, revenue), charts (contracts per day, revenue per week), alerts (expiring subscriptions, pending reviews)

**Admin Key Pages:**

| Page                 | Features                                               |
| -------------------- | ------------------------------------------------------ |
| Users List           | Table with search, filters (status, type), pagination  |
| User Detail          | Profile, contracts, payments, actions (suspend/activate)|
| Businesses           | Table with subscription status filter                  |
| Lawyers              | Table with performance stats, activation toggle        |
| Contracts            | Table with status/type/date filters, detail view       |
| Contract Config      | Template sections list → field list with drag reorder  |
| Field Editor         | Modal: label, placeholder, help, required, validation  |
| Pricing              | Editable price cards per template type                 |
| Subscription Plans   | Plans CRUD with features editor                        |
| Analytics            | Date-range dashboard with charts                       |
| Audit Logs           | Searchable, filterable log table                       |
| Settings             | Platform name, contact email, payment config           |


# Part 9 – PDF Engine, QR Verification & Document System {#part-9}

---

# 121. PDF Engine Architecture

**Technology:** Laravel + DomPDF (primary) or Browsershot (for complex layouts).

**Flow:**
`
Contract Completed & Paid
  → Queue Job: GenerateContractPdf
  → Load contract data + field values from DB
  → Load Blade template for contract type
  → Inject data into template
  → Render HTML → Convert to PDF
  → Generate QR code image
  → Embed QR in PDF header
  → Generate serial number
  → Upload PDF to S3
  → Update contract record (pdf_path, qr_code_path, serial_number, status=issued)
  → Send notification to user
`

**Queue:** PDF generation MUST run asynchronously via Laravel Queue (Redis driver). Never generate PDFs in a synchronous request.

**Timeout:** 60 seconds max per PDF job. If exceeded → mark as failed → notify admin.

---

# 122. PDF Template Structure

**Page Size:** A4 (210mm × 297mm)

**Layout:**
`
┌──────────────────────────────────┐
│ [Logo]    CONTRACT TITLE   [QR] │  ← Header (25mm)
│           Serial: SCP-2026-...  │
├──────────────────────────────────┤
│                                  │
│  Section 1: Party Information    │  ← Body (230mm)
│  ─────────────────────────────   │
│  Field Label: Value              │
│  Field Label: Value              │
│                                  │
│  Section 2: Property Details     │
│  ─────────────────────────────   │
│  Field Label: Value              │
│                                  │
│  Section 3: Financial Terms      │
│  ─────────────────────────────   │
│                                  │
│  Section 4: Legal Clauses        │
│  ─────────────────────────────   │
│                                  │
│  ┌───────────┐  ┌───────────┐   │
│  │ Signature │  │ Signature │   │  ← Signatures (30mm)
│  │  Party 1  │  │  Party 2  │   │
│  └───────────┘  └───────────┘   │
├──────────────────────────────────┤
│ Page 1/2  |  Generated: Date     │  ← Footer (12mm)
│ Smart Contracts Platform         │
└──────────────────────────────────┘
`

**Fonts:** Cairo (Arabic support), Noto Sans (Latin fallback)
**Margins:** 20mm all sides
**Colors:** Headers: #1E3A5F, Body: #333333, Accents: #2563EB

---

# 123. PDF Templates Per Contract Type

**Blade Template Location:** 
esources/views/pdf/{template_slug}.blade.php

| Template      | Blade File           | Sections in PDF                                  |
| ------------- | -------------------- | ------------------------------------------------ |
| rental        | rental.blade.php     | Landlord, Tenant, Property, Financial, Legal     |
| apartment_sale| sale.blade.php       | Seller, Buyer, Property, Financial, Legal        |
| freelancer    | freelancer.blade.php | Client, Contractor, Project, Payment, Legal      |

**Data Injection:**
`php
 = ContractFieldValue::where('contract_id', ->id)
    ->with('field')
    ->get()
    ->mapWithKeys(fn() => [->field->field_name => ->value]);

return view('pdf.rental', ['data' => , 'contract' => ]);
`

---

# 124. Watermark System

**Preview PDF:** Diagonal text "معاينة فقط - PREVIEW ONLY" at 45° angle, #CCCCCC color, 50% opacity, font-size: 72pt, centered on every page.

**Final PDF:** No watermark.

**Implementation:** CSS-based watermark in Blade template controlled by $isPreview boolean.

`css
.watermark {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  font-size: 72pt;
  color: rgba(200, 200, 200, 0.3);
  z-index: 1000;
  pointer-events: none;
}
`

---

# 125. Serial Number Generation

**Format:** SCP-{YEAR}-{TYPE_CODE}-{SEQUENTIAL_6_DIGIT}

**Type Codes:**

| Template       | Code |
| -------------- | ---- |
| Rental         | RNT  |
| Apartment Sale | APS  |
| Freelancer     | FRL  |

**Examples:**
- SCP-2026-RNT-000001
- SCP-2026-APS-000042
- SCP-2026-FRL-000007

**Uniqueness:** Enforced by UNIQUE constraint on serial_number column. Generated inside a DB transaction with row-level locking to prevent duplicates.

**Sequence Reset:** Per year per type. Counter stored in settings table: key=serial_counter_{type}_{year}.

---

# 126. QR Code System

**Library:** simplesoftwareio/simple-qrcode (Laravel package)

**Content:** https://domain.com/verify/{serial_number}

**Size:** 150×150 pixels (PNG)

**Placement:** Top-right corner of first page, inside header area.

**Storage:** Alongside PDF: contracts/{user_id}/{contract_id}/qr.png

**Generation:**
`php
QrCode::format('png')
    ->size(150)
    ->margin(1)
    ->generate(route('verify', ));
`

---

# 127. Contract Verification Page

**Route:** /verify/{serial} (public, no auth)

**Displays:**
- Platform logo and branding
- Verification badge (✓ Verified / ✕ Not Found)
- Contract type
- Partial party names (first name + masked last name: "أحمد م***")
- Issue date
- Contract status

**Does NOT display:** Full names, financial details, contract content, addresses, phone numbers.

---

# 128. PDF Storage Strategy

**Provider:** S3-compatible (Cloudflare R2 recommended)

**Path Format:**
`
contracts/{user_id}/{contract_id}/{serial_number}.pdf
contracts/{user_id}/{contract_id}/qr.png
contracts/{user_id}/{contract_id}/preview.pdf
contracts/{user_id}/{contract_id}/attachments/{filename}
`

**Access Control:** All contract files are **private**. Downloads use pre-signed URLs with 1-hour expiry.

`php
Storage::disk('s3')->temporaryUrl(, now()->addHour());
`

---

# 129. PDF Regeneration

**Rules:**
- Allowed only within 24-hour edit window (edit_expires_at)
- Old PDF moved to: contracts/{user_id}/{contract_id}/archive/v{n}_{serial}.pdf
- Serial number does NOT change on regeneration
- Version counter incremented in contract_versions table
- New PDF overwrites current path
- Audit log entry created

---

# 130. Attachment Handling

**Constraints:**

| Rule           | Value                   |
| -------------- | ----------------------- |
| Max files       | 5 per contract          |
| Max size        | 5MB per file            |
| Accepted types  | jpg, jpeg, png, pdf     |
| Storage path    | contracts/{uid}/{cid}/attachments/ |

Attachments appear as an appendix in the generated PDF (images embedded, PDFs linked).

---

# Part 10 – Security & Error Handling {#part-10}

---

# 131. Security Architecture

**Defense Layers:**
1. **Network:** HTTPS enforced, firewall rules, DDoS protection (Cloudflare)
2. **Application:** Input validation, CSRF, XSS prevention, rate limiting, CORS
3. **Data:** Encryption at rest, hashed passwords, PII protection, audit logs

**OWASP Top 10 Compliance:**

| Risk                        | Mitigation                                    |
| --------------------------- | --------------------------------------------- |
| Injection                   | Eloquent ORM, parameterized queries           |
| Broken Authentication       | Sanctum, rate limiting, MFA (future)           |
| Sensitive Data Exposure     | HTTPS, encryption, minimal PII in responses   |
| XML External Entities       | Not applicable (JSON API)                     |
| Broken Access Control       | Policies, Gates, middleware                   |
| Security Misconfiguration   | Environment-based config, no debug in prod    |
| XSS                         | Input sanitization, Content Security Policy   |
| Insecure Deserialization    | Type-safe request validation                  |
| Components with Vulnerabilities | Regular dependency updates               |
| Insufficient Logging        | Comprehensive audit logs                      |

---

# 132. Input Validation

**Rules:**
- ALL inputs validated server-side, regardless of frontend validation
- Laravel Form Request classes for every endpoint
- Sanitize HTML from all text inputs (strip_tags())
- File uploads validated: MIME type check (not just extension), virus scan (future)
- Maximum request body: 10MB

---

# 133. Authorization

**Laravel Policies:**

`php
ContractPolicy:
  - view(, ): owner or admin
  - update(, ): owner AND status=draft AND within edit window
  - delete(, ): owner AND status=draft
  - download(, ): owner or admin AND status=issued

LawyerReviewPolicy:
  - view(, ): assigned lawyer or admin
  - decide(, ): assigned lawyer AND status=under_review
`

**Middleware Groups:**

| Middleware  | Applied To            |
| ----------- | --------------------- |
| auth        | All authenticated routes |
| admin       | /api/v1/admin/*       |
| lawyer      | /api/v1/lawyer/*      |
| business    | /api/v1/business/*    |
| verified    | Payment, PDF generation |

---

# 134. Data Protection

- **Passwords:** bcrypt (cost factor 12)
- **National ID:** Encrypted via Crypt::encryptString(), decrypted only when needed
- **Email/Phone:** Stored plain (needed for queries), but masked in public responses
- **HTTPS:** Enforced via ForceScheme middleware and APP_URL=https://...
- **PII in Logs:** Never log passwords, tokens, national IDs, or full credit card numbers

---

# 135. Rate Limiting

`php
// AppServiceProvider or RouteServiceProvider
RateLimiter::for('auth', fn() => Limit::perMinute(5)->by(->ip()));
RateLimiter::for('api', fn() => Limit::perMinute(60)->by(->user()?->id ?: ->ip()));
RateLimiter::for('payment', fn() => Limit::perMinute(10)->by(->user()->id));
RateLimiter::for('admin', fn() => Limit::perMinute(120)->by(->user()->id));
RateLimiter::for('auto-save', fn() => Limit::perMinute(30)->by(->user()->id));
`

---

# 136. CORS Configuration

`php
// config/cors.php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => [env('FRONTEND_URL')],
'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN'],
'supports_credentials' => true,
`

---

# 137. Error Handling

**Global Exception Handler:** Catches all exceptions, returns structured JSON.

**Production Rules:**
- Never expose stack traces
- Never expose internal error messages
- Always return user-friendly Arabic messages
- Log full error details server-side

**Response Format:**
`json
{
  "success": false,
  "message": "حدث خطأ في معالجة طلبك",
  "error_code": "CONTRACT_002",
  "errors": {}
}
`

---

# 138. Error Codes Catalog

| Code           | Message (Arabic)                                     | HTTP |
| -------------- | ---------------------------------------------------- | ---- |
| AUTH_001        | بيانات الدخول غير صحيحة                              | 401  |
| AUTH_002        | الحساب معلق. تواصل مع الدعم                          | 403  |
| AUTH_003        | يرجى تأكيد البريد الإلكتروني أولاً                    | 403  |
| AUTH_004        | انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً        | 401  |
| AUTH_005        | رابط إعادة تعيين كلمة المرور منتهي الصلاحية           | 422  |
| AUTH_006        | تم تجاوز عدد المحاولات المسموحة                       | 429  |
| USER_001        | المستخدم غير موجود                                    | 404  |
| USER_002        | البريد الإلكتروني مسجل مسبقاً                         | 422  |
| USER_003        | رقم الهاتف مسجل مسبقاً                                | 422  |
| CONTRACT_001    | العقد غير موجود                                       | 404  |
| CONTRACT_002    | انتهت فترة التعديل المسموحة (24 ساعة)                  | 403  |
| CONTRACT_003    | يجب إكمال جميع الخطوات قبل المعاينة                   | 422  |
| CONTRACT_004    | العقد مدفوع بالفعل                                    | 409  |
| CONTRACT_005    | لا يمكن حذف عقد مدفوع                                | 403  |
| CONTRACT_006    | حقول مطلوبة غير مكتملة                                | 422  |
| CONTRACT_007    | فشل في توليد ملف PDF                                  | 500  |
| PAYMENT_001     | فشلت عملية الدفع                                      | 402  |
| PAYMENT_002     | مبلغ الدفع غير متطابق                                 | 422  |
| PAYMENT_003     | انتهت صلاحية جلسة الدفع                               | 410  |
| BUSINESS_001    | الاشتراك منتهي الصلاحية                               | 403  |
| BUSINESS_002    | تم تجاوز حد العقود الشهرية                            | 403  |
| LAWYER_001      | العقد ليس في قائمة المراجعة الخاصة بك                 | 403  |
| LAWYER_002      | تم مراجعة العقد مسبقاً                                | 409  |
| ADMIN_001       | لا تملك صلاحية لهذا الإجراء                           | 403  |
| SYSTEM_001      | خطأ داخلي في النظام. يرجى المحاولة لاحقاً             | 500  |
| SYSTEM_002      | الخدمة غير متاحة حالياً                               | 503  |

---

# 139. Logging Strategy

**Channels:**

| Channel     | Driver    | Purpose                                 |
| ----------- | --------- | --------------------------------------- |
| daily       | Daily file| All application logs (30-day retention) |
| slack       | Slack     | Critical/Emergency alerts only          |
| audit       | Database  | Immutable audit trail                   |
| queue       | Daily file| Queue job logs                          |

**Correlation ID:** Every request gets a unique X-Request-ID header, attached to all log entries for that request.

---

# 140. Backup & Recovery

| Aspect          | Strategy                              |
| --------------- | ------------------------------------- |
| Database        | Daily automated pg_dump               |
| S3 Files        | Versioning enabled on bucket          |
| Backup Storage  | Separate S3 bucket                    |
| Retention       | 30 days                               |
| RPO             | 24 hours                              |
| RTO             | 4 hours                               |
| Testing         | Monthly restore drill                 |

---

# Part 11 – Deployment Architecture & DevOps {#part-11}

---

# 141. Environment Architecture

| Environment | Purpose             | Database          | Domain                    |
| ----------- | ------------------- | ----------------- | ------------------------- |
| Development | Local development   | Local PostgreSQL  | localhost:3000 / :8000    |
| Staging     | Testing & QA        | Staging DB        | staging.domain.com        |
| Production  | Live platform       | Production DB     | domain.com / api.domain.com|

**Laravel .env (key variables):**
`env
APP_NAME="Smart Contracts Platform"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.domain.com
FRONTEND_URL=https://domain.com
DB_CONNECTION=pgsql
DB_HOST=db.host.com
DB_DATABASE=smart_contracts
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
FILESYSTEM_DISK=s3
AWS_BUCKET=smart-contracts-files
`

**Next.js .env.local:**
`env
NEXT_PUBLIC_API_URL=https://api.domain.com
NEXT_PUBLIC_APP_NAME="Smart Contracts Platform"
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx
`

---

# 142. Laravel Deployment

**Server Stack:** Nginx + PHP-FPM 8.4 + Supervisor + Cron

**Deployment Checklist:**
`ash
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart
php artisan storage:link
sudo supervisorctl restart all
`

**Supervisor Config (Queue Worker):**
`ini
[program:smart-contracts-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/api/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
numprocs=2
user=www-data
`

**Cron (Scheduler):**
`
* * * * * cd /var/www/api && php artisan schedule:run >> /dev/null 2>&1
`

---

# 143. Next.js Deployment

**Recommended:** Vercel (zero-config, automatic deployments)

**Build:**
`ash
npm run build    # next build
npm run start    # next start (self-hosted)
`

**Vercel Config (vercel.json):**
`json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api.domain.com/api/:path*" }
  ]
}
`

**ISR:** Landing page, pricing page, FAQ → regenerated every 60 seconds.

---

# 144. Database Deployment

**Migration Strategy:** Always forward. Never use migrate:rollback in production. If a migration needs reversal, create a new migration.

**Seeder Run Order:**
`ash
php artisan db:seed --class=CountrySeeder
php artisan db:seed --class=SubscriptionPlanSeeder
php artisan db:seed --class=ContractTemplateSeeder    # Templates + Sections + Fields
php artisan db:seed --class=AdminUserSeeder
php artisan db:seed --class=SettingsSeeder
`

---

# 145. Redis Configuration

`env
REDIS_HOST=redis.host.com
REDIS_PORT=6379
REDIS_PASSWORD=xxx
REDIS_DB=0           # Cache
REDIS_QUEUE_DB=1     # Queue
REDIS_SESSION_DB=2   # Sessions
`

**Cache TTL Defaults:**

| Data              | TTL        |
| ----------------- | ---------- |
| Template list     | 1 hour     |
| Template fields   | 1 hour     |
| User session      | 120 min    |
| Analytics data    | 5 min      |
| Settings          | 24 hours   |

---

# 146. S3 Storage Setup

**Buckets:**
- smart-contracts-files — PDFs, QR codes, attachments (PRIVATE)
- smart-contracts-public — Logos, public assets (PUBLIC via CDN)

**CORS Policy (private bucket):**
`json
{
  "AllowedOrigins": ["https://domain.com", "https://api.domain.com"],
  "AllowedMethods": ["GET", "PUT"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
`

---

# 147. CI/CD Pipeline

**GitHub Actions Workflows:**

**Backend (.github/workflows/backend.yml):**
`
Trigger: push to main or develop
Steps:
  1. Checkout
  2. Setup PHP 8.4
  3. Install Composer dependencies
  4. Run PHPStan (static analysis)
  5. Run PHPUnit tests
  6. Deploy to staging (on develop) or production (on main)
`

**Frontend (.github/workflows/frontend.yml):**
`
Trigger: push to main or develop
Steps:
  1. Checkout
  2. Setup Node 20
  3. Install dependencies
  4. Run ESLint + TypeScript check
  5. Run tests
  6. Build
  7. Deploy (Vercel CLI or auto-deploy)
`

---

# 148. Monitoring

| Tool             | Purpose                    | Environment     |
| ---------------- | -------------------------- | --------------- |
| Laravel Telescope| Request/query debugging    | Staging only    |
| Sentry           | Error tracking             | All             |
| UptimeRobot      | Uptime monitoring          | Production      |
| Custom Dashboard | Business metrics           | Production      |

**Alert Channels:** Email + Slack

**Alert Rules:**
- 5xx error rate > 1% → Slack alert
- Queue failure > 3 consecutive → Slack + Email
- Disk usage > 80% → Email
- SSL certificate expiry < 14 days → Email


# Part 12 – Seeder Data, Roadmap & AI Agent Execution Guide {#part-12}

---

# 149. MVP Seeder Data Overview

The following data MUST be seeded before the platform can operate.

**Seeder Execution Order:**

`ash
1. CountrySeeder           → countries table
2. SubscriptionPlanSeeder  → subscription_plans table
3. ContractTemplateSeeder  → contract_templates + sections + fields
4. AdminUserSeeder         → users table (super admin)
5. SettingsSeeder          → settings table
`

**Default Admin User:**
`
Email:    admin@smartcontracts.com
Password: Admin@SCP2026!
Role:     super_admin
Name:     مدير النظام
`

**Countries (MVP):**
`
id: 1, name: مصر, code: EG, phone_code: +20
`

**Subscription Plans:**

| Name       | Slug       | Target   | Price/Month | Contract Quota |
| ---------- | ---------- | -------- | ----------- | -------------- |
| مجاني       | free       | individual| 0 EGP      | Pay per contract|
| ستارتر      | starter    | business | 299 EGP    | 10 contracts   |
| بيزنس       | medium     | business | 599 EGP    | 30 contracts   |
| إنتربرايز   | enterprise | business | 999 EGP    | Unlimited      |

**Platform Settings:**

| Key                    | Value                        |
| ---------------------- | ---------------------------- |
| platform_name          | Smart Contracts Platform     |
| platform_name_ar       | منصة العقود الذكية            |
| support_email          | support@smartcontracts.com   |
| currency               | EGP                          |
| edit_window_hours      | 24                           |
| max_attachments        | 5                            |
| max_attachment_size_mb | 5                            |
| auto_save_interval_sec | 30                           |

---

# 150. Rental Contract – Complete Field Definitions

**Template:** name=عقد إيجار, slug=rental, price=59 EGP

## Section 1: بيانات المؤجر (Landlord)
Order: 1, Icon: user

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | landlord_name       | اسم المؤجر          | مثال: أحمد محمد حسن  | text    | yes      | required\|string\|min:3\|max:100 | اكتب الاسم الكامل كما هو في بطاقة الرقم القومي |
| 2 | landlord_national_id| الرقم القومي         | 14 رقم              | text    | yes      | required\|digits:14      | الرقم القومي المكون من 14 رقم الموجود على بطاقة الهوية |
| 3 | landlord_phone      | رقم الهاتف          | 01XXXXXXXXX          | text    | yes      | required\|regex:/^01[0125][0-9]{8}$/ | رقم الهاتف المصري المكون من 11 رقم |
| 4 | landlord_address    | العنوان              | العنوان بالتفصيل     | textarea| yes      | required\|string\|min:10 | العنوان الكامل المثبت في بطاقة الرقم القومي |
| 5 | landlord_email      | البريد الإلكتروني    | example@email.com    | text    | no       | nullable\|email          | اختياري - لإرسال نسخة من العقد |

## Section 2: بيانات المستأجر (Tenant)
Order: 2, Icon: user

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | tenant_name         | اسم المستأجر        | مثال: علي حسن محمود  | text    | yes      | required\|string\|min:3\|max:100 | اكتب الاسم الكامل كما هو في بطاقة الرقم القومي |
| 2 | tenant_national_id  | الرقم القومي         | 14 رقم              | text    | yes      | required\|digits:14      | الرقم القومي المكون من 14 رقم |
| 3 | tenant_phone        | رقم الهاتف          | 01XXXXXXXXX          | text    | yes      | required\|regex:/^01[0125][0-9]{8}$/ | رقم هاتف المستأجر |
| 4 | tenant_address      | العنوان الحالي       | العنوان بالتفصيل     | textarea| yes      | required\|string\|min:10 | عنوان السكن الحالي للمستأجر |
| 5 | tenant_email        | البريد الإلكتروني    | example@email.com    | text    | no       | nullable\|email          | اختياري |

## Section 3: بيانات العقار (Property)
Order: 3, Icon: home

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | property_type       | نوع العقار          | --اختر--            | select  | yes      | required\|in:apartment,shop,warehouse | اختر نوع العقار المراد تأجيره |
| 2 | property_address    | عنوان العقار        | العنوان بالتفصيل     | textarea| yes      | required\|string\|min:10 | العنوان الكامل للعقار المؤجر |
| 3 | property_area       | المساحة (م²)        | مثال: 120           | number  | yes      | required\|numeric\|min:1 | مساحة العقار بالمتر المربع |
| 4 | property_floor      | الدور               | مثال: 3             | number  | no       | nullable\|numeric\|min:0 | رقم الدور (0 للأرضي) |
| 5 | property_rooms      | عدد الغرف           | مثال: 3             | number  | no       | nullable\|numeric\|min:0 | عدد الغرف إن وجد |
| 6 | property_furnished  | مفروش               | --                  | boolean | yes      | required\|boolean       | هل العقار مفروش بالأثاث؟ |
| 7 | property_description| وصف إضافي           | تفاصيل إضافية       | textarea| no       | nullable\|string\|max:500| أي تفاصيل إضافية عن العقار |

## Section 4: الشروط المالية (Financial)
Order: 4, Icon: dollar

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | monthly_rent        | قيمة الإيجار الشهري  | مثال: 5000          | number  | yes      | required\|numeric\|min:1 | المبلغ المتفق عليه شهرياً بالجنيه المصري |
| 2 | payment_method      | طريقة الدفع         | --اختر--            | select  | yes      | required\|in:cash,bank_transfer,check | كيف سيتم دفع الإيجار شهرياً |
| 3 | payment_day         | يوم الدفع           | مثال: 1             | number  | yes      | required\|numeric\|min:1\|max:28 | اليوم من كل شهر لدفع الإيجار |
| 4 | deposit_amount      | مبلغ التأمين         | مثال: 10000         | number  | yes      | required\|numeric\|min:0 | مبلغ التأمين المدفوع مقدماً (قابل للاسترداد) |
| 5 | contract_start_date | تاريخ بداية العقد    | YYYY-MM-DD          | date    | yes      | required\|date\|after_or_equal:today | تاريخ بداية فترة الإيجار |
| 6 | contract_duration   | مدة العقد (بالأشهر)  | مثال: 12            | number  | yes      | required\|numeric\|min:1\|max:120 | مدة العقد بالأشهر |
| 7 | auto_renewal        | تجديد تلقائي        | --                  | boolean | yes      | required\|boolean       | هل يتجدد العقد تلقائياً عند انتهاء المدة؟ |
| 8 | annual_increase     | نسبة الزيادة السنوية | مثال: 10            | number  | no       | nullable\|numeric\|min:0\|max:100 | النسبة المئوية للزيادة السنوية إن وجدت |

## Section 5: البنود القانونية (Legal)
Order: 5, Icon: scale

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | maintenance_party   | المسؤول عن الصيانة   | --اختر--            | select  | yes      | required\|in:landlord,tenant,shared | من يتحمل تكاليف الصيانة |
| 2 | utilities_party     | المسؤول عن المرافق   | --اختر--            | select  | yes      | required\|in:landlord,tenant | من يدفع فواتير الكهرباء والمياه والغاز |
| 3 | subleasing_allowed  | السماح بالتأجير من الباطن | --            | boolean | yes      | required\|boolean       | هل يحق للمستأجر تأجير العقار لشخص آخر؟ |
| 4 | early_termination   | الإنهاء المبكر       | --اختر--            | select  | yes      | required\|in:allowed_with_notice,not_allowed,penalty | شروط إنهاء العقد قبل انتهاء مدته |
| 5 | notice_period       | مدة الإشعار (بالأيام)| مثال: 30            | number  | no       | nullable\|numeric\|min:1\|max:180 | عدد أيام الإشعار المطلوبة قبل إخلاء العقار |
| 6 | dispute_resolution  | حل النزاعات          | --اختر--            | select  | yes      | required\|in:court,arbitration | آلية حل النزاعات بين الطرفين |
| 7 | additional_terms    | شروط إضافية          | أي بنود أخرى متفق عليها | textarea | no | nullable\|string\|max:1000 | أي شروط إضافية يتفق عليها الطرفان |

---

# 151. Apartment Sale Contract – Complete Field Definitions

**Template:** name=عقد بيع شقة, slug=apartment_sale, price=149 EGP

## Section 1: بيانات البائع (Seller)
Order: 1

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | seller_name         | اسم البائع          | الاسم الكامل         | text    | yes      | required\|string\|min:3\|max:100 | الاسم كما في الرقم القومي |
| 2 | seller_national_id  | الرقم القومي         | 14 رقم              | text    | yes      | required\|digits:14      | الرقم القومي |
| 3 | seller_phone        | رقم الهاتف          | 01XXXXXXXXX          | text    | yes      | required\|regex:/^01[0125][0-9]{8}$/ | رقم الهاتف |
| 4 | seller_address      | العنوان              | العنوان بالتفصيل     | textarea| yes      | required\|string\|min:10 | عنوان البائع |
| 5 | seller_marital_status| الحالة الاجتماعية    | --اختر--            | select  | yes      | required\|in:single,married,divorced,widowed | مطلوبة لبعض الإجراءات القانونية |

## Section 2: بيانات المشتري (Buyer)
Order: 2

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | buyer_name          | اسم المشتري         | الاسم الكامل         | text    | yes      | required\|string\|min:3\|max:100 | الاسم كما في الرقم القومي |
| 2 | buyer_national_id   | الرقم القومي         | 14 رقم              | text    | yes      | required\|digits:14      | الرقم القومي |
| 3 | buyer_phone         | رقم الهاتف          | 01XXXXXXXXX          | text    | yes      | required\|regex:/^01[0125][0-9]{8}$/ | رقم الهاتف |
| 4 | buyer_address       | العنوان              | العنوان بالتفصيل     | textarea| yes      | required\|string\|min:10 | عنوان المشتري |

## Section 3: بيانات العقار (Property)
Order: 3

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | property_address    | عنوان الشقة         | العنوان بالتفصيل     | textarea| yes      | required\|string\|min:10 | عنوان الشقة الكامل |
| 2 | property_area       | المساحة (م²)        | مثال: 150           | number  | yes      | required\|numeric\|min:1 | المساحة بالمتر المربع |
| 3 | property_floor      | الدور               | مثال: 5             | number  | yes      | required\|numeric\|min:0 | رقم الدور |
| 4 | property_rooms      | عدد الغرف           | مثال: 3             | number  | yes      | required\|numeric\|min:1 | عدد الغرف |
| 5 | property_bathrooms  | عدد الحمامات        | مثال: 2             | number  | yes      | required\|numeric\|min:1 | عدد الحمامات |
| 6 | property_description| وصف الشقة           | تفاصيل إضافية       | textarea| no       | nullable\|string\|max:500| وصف تفصيلي للشقة |
| 7 | has_garage          | جراج                | --                  | boolean | yes      | required\|boolean       | هل يوجد جراج مع الشقة؟ |
| 8 | has_elevator        | أسانسير              | --                  | boolean | yes      | required\|boolean       | هل يوجد مصعد في العمارة؟ |

## Section 4: الشروط المالية (Financial)
Order: 4

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | total_price         | إجمالي سعر البيع    | مثال: 1500000       | number  | yes      | required\|numeric\|min:1 | إجمالي المبلغ المتفق عليه بالجنيه المصري |
| 2 | payment_type        | طريقة السداد        | --اختر--            | select  | yes      | required\|in:cash,installments,mixed | كيف سيتم دفع المبلغ |
| 3 | down_payment        | المقدم              | مثال: 300000        | number  | no       | nullable\|numeric\|min:0 | المبلغ المدفوع مقدماً (مطلوب إذا كان السداد بالتقسيط) |
| 4 | installment_amount  | قيمة القسط الشهري   | مثال: 10000         | number  | no       | nullable\|numeric\|min:0 | قيمة القسط الشهري (مطلوب إذا كان السداد بالتقسيط) |
| 5 | installment_count   | عدد الأقساط         | مثال: 120           | number  | no       | nullable\|numeric\|min:1 | عدد الأقساط |
| 6 | has_mortgage        | رهن عقاري           | --                  | boolean | yes      | required\|boolean       | هل الشقة عليها رهن عقاري؟ |
| 7 | mortgage_bank       | البنك المرهون لديه   | اسم البنك           | text    | no       | nullable\|string\|max:100 | يظهر فقط إذا كان الرهن = نعم |
| 8 | mortgage_remaining  | المبلغ المتبقي       | مثال: 500000        | number  | no       | nullable\|numeric\|min:0 | المبلغ المتبقي من الرهن |

## Section 5: البنود القانونية (Legal)
Order: 5

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | delivery_date       | تاريخ التسليم       | YYYY-MM-DD          | date    | yes      | required\|date           | التاريخ المتوقع لتسليم الشقة |
| 2 | delivery_condition  | حالة التسليم        | --اختر--            | select  | yes      | required\|in:as_is,renovated,new | حالة الشقة عند التسليم |
| 3 | ownership_transfer  | نقل الملكية         | --اختر--            | select  | yes      | required\|in:immediate,after_full_payment | متى يتم نقل الملكية رسمياً |
| 4 | penalty_clause      | شرط جزائي           | مثال: 10            | number  | no       | nullable\|numeric\|min:0\|max:50 | نسبة الشرط الجزائي من قيمة العقد |
| 5 | dispute_resolution  | حل النزاعات          | --اختر--            | select  | yes      | required\|in:court,arbitration | آلية حل النزاعات |
| 6 | additional_terms    | شروط إضافية          | أي بنود أخرى        | textarea| no       | nullable\|string\|max:1000 | شروط إضافية متفق عليها |

---

# 152. Freelancer Agreement – Complete Field Definitions

**Template:** name=عقد عمل حر, slug=freelancer, price=59 EGP

## Section 1: بيانات العميل (Client)
Order: 1

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | client_name         | اسم العميل          | الاسم الكامل أو اسم الشركة | text | yes  | required\|string\|min:3\|max:100 | اسم الشخص أو الشركة التي تطلب الخدمة |
| 2 | client_type         | نوع العميل          | --اختر--            | select  | yes      | required\|in:individual,company | فرد أم شركة |
| 3 | client_national_id  | الرقم القومي / سجل تجاري | 14 رقم أو رقم السجل | text | yes | required\|string\|min:5\|max:20 | الرقم القومي للأفراد أو رقم السجل التجاري للشركات |
| 4 | client_phone        | رقم الهاتف          | 01XXXXXXXXX          | text    | yes      | required\|regex:/^01[0125][0-9]{8}$/ | رقم الهاتف |
| 5 | client_email        | البريد الإلكتروني    | example@email.com    | text    | yes      | required\|email          | بريد العميل الإلكتروني |
| 6 | client_address      | العنوان              | العنوان بالتفصيل     | textarea| yes      | required\|string\|min:10 | عنوان العميل |

## Section 2: بيانات مقدم الخدمة (Contractor)
Order: 2

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | contractor_name     | اسم مقدم الخدمة     | الاسم الكامل         | text    | yes      | required\|string\|min:3\|max:100 | اسم الشخص الذي سيقدم الخدمة |
| 2 | contractor_national_id | الرقم القومي      | 14 رقم              | text    | yes      | required\|digits:14      | الرقم القومي |
| 3 | contractor_phone    | رقم الهاتف          | 01XXXXXXXXX          | text    | yes      | required\|regex:/^01[0125][0-9]{8}$/ | رقم الهاتف |
| 4 | contractor_email    | البريد الإلكتروني    | example@email.com    | text    | yes      | required\|email          | البريد الإلكتروني |
| 5 | contractor_specialty| التخصص              | --اختر--            | select  | yes      | required\|in:design,programming,marketing,writing,translation,other | مجال التخصص |

## Section 3: تفاصيل المشروع (Project)
Order: 3

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | project_title       | عنوان المشروع       | مثال: تصميم موقع إلكتروني | text | yes   | required\|string\|min:5\|max:200 | وصف مختصر للمشروع |
| 2 | project_description | وصف المشروع التفصيلي | اشرح المطلوب بالتفصيل | textarea | yes  | required\|string\|min:20\|max:2000 | وصف تفصيلي لنطاق العمل والمطلوب |
| 3 | deliverables        | المخرجات المتوقعة    | المخرجات المحددة      | textarea| yes      | required\|string\|min:10\|max:1000 | قائمة واضحة بما سيتم تسليمه |
| 4 | start_date          | تاريخ البداية       | YYYY-MM-DD          | date    | yes      | required\|date\|after_or_equal:today | تاريخ بدء العمل |
| 5 | end_date            | تاريخ التسليم       | YYYY-MM-DD          | date    | yes      | required\|date\|after:start_date | تاريخ التسليم النهائي |
| 6 | milestones          | مراحل التسليم       | وصف المراحل          | textarea| no       | nullable\|string\|max:1000 | تقسيم المشروع لمراحل إن وجد |

## Section 4: الشروط المالية (Payment)
Order: 4

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | total_amount        | إجمالي المبلغ       | مثال: 15000         | number  | yes      | required\|numeric\|min:1 | المبلغ الإجمالي المتفق عليه |
| 2 | currency            | العملة              | --اختر--            | select  | yes      | required\|in:EGP,USD,EUR | العملة المستخدمة في الدفع |
| 3 | payment_schedule    | جدول الدفع          | --اختر--            | select  | yes      | required\|in:upfront,milestone,completion,monthly | طريقة الدفع |
| 4 | advance_payment     | دفعة مقدمة          | مثال: 5000          | number  | no       | nullable\|numeric\|min:0 | مبلغ الدفعة المقدمة (إن وجدت) |
| 5 | payment_method      | طريقة الدفع         | --اختر--            | select  | yes      | required\|in:bank_transfer,cash,online | وسيلة تحويل الأموال |

## Section 5: البنود القانونية (Legal)
Order: 5

| # | field_name          | label              | placeholder         | type    | required | validation              | help_description                           |
|---|--------------------|--------------------|---------------------|---------|----------|-------------------------|--------------------------------------------|
| 1 | ip_ownership        | ملكية حقوق الملكية الفكرية | --اختر--      | select  | yes      | required\|in:client,contractor,shared | من يملك حقوق العمل بعد التسليم |
| 2 | confidentiality     | بند السرية          | --                  | boolean | yes      | required\|boolean       | هل يوجد بند سرية يمنع الطرفين من مشاركة تفاصيل العقد؟ |
| 3 | non_compete         | بند عدم المنافسة    | --                  | boolean | yes      | required\|boolean       | هل يُمنع مقدم الخدمة من العمل مع منافسين؟ |
| 4 | non_compete_duration| مدة عدم المنافسة (بالأشهر) | مثال: 6      | number  | no       | nullable\|numeric\|min:1\|max:24 | يظهر فقط إذا كان بند عدم المنافسة مفعل |
| 5 | revision_rounds     | عدد جولات التعديل   | مثال: 3             | number  | no       | nullable\|numeric\|min:0\|max:10 | عدد التعديلات المجانية المسموحة |
| 6 | late_delivery_penalty| غرامة التأخير       | مثال: 100           | number  | no       | nullable\|numeric\|min:0 | مبلغ الغرامة اليومية عن كل يوم تأخير |
| 7 | termination_terms   | شروط إنهاء العقد     | --اختر--            | select  | yes      | required\|in:mutual,with_notice,with_penalty | كيف يمكن إنهاء العقد |
| 8 | dispute_resolution  | حل النزاعات          | --اختر--            | select  | yes      | required\|in:court,arbitration,mediation | آلية حل النزاعات |
| 9 | additional_terms    | شروط إضافية          | أي بنود أخرى        | textarea| no       | nullable\|string\|max:1000 | شروط إضافية متفق عليها |

---

# 153. MVP Development Phases

## Phase 1: Foundation (Weeks 1-2)
- [ ] Initialize Laravel project with PostgreSQL
- [x] Initialize Next.js project with TypeScript + Tailwind
- [x] Database migrations for all core tables (including Z draft pubg_id, legal_consultations, 30-attachment table, shared_collaborations)
- [x] Seeder for templates, fields, plans, admin user
- [ ] Authentication system (register, login, Google OAuth + auto-generate PUBG ID)
- [ ] Email verification
- [ ] User profile CRUD
- [ ] API response structure standardization
- [ ] CORS + Sanctum configuration

## Phase 2: Contract Engine, Sharing & Consultations (Weeks 3-4)
- [x] Contract template API (list, detail)
- [x] Draft creation API (self_service & lawyer_assisted modes)
- [x] Legal consultation request API (supports up to 30 attachments & case description)
- [x] Automatic client-side & server-side image/document compression pipeline (`browser-image-compression` + WebP)
- [x] Document sharing API via PUBG ID (`pubg_id` lookup & permission allocation)
- [x] Core Data Immutability enforcement (lock identity data after creation)
- [x] Wizard steps API (get fields, save step)
- [x] Auto-save API with conflict detection
- [x] Frontend wizard component (dynamic field rendering)
- [x] Progress tracking + navigation
- [x] Conditional fields logic
- [x] Draft management (list, continue, delete)
- [x] Contract validation (frontend + backend)

## Phase 3: PDF & Payments (Weeks 5-6)
- [x] PDF Blade templates for 3 contract types
- [x] PDF generation queue job
- [x] Preview generation (with watermark)
- [x] QR code generation
- [x] Serial number generation
- [x] S3 storage integration
- [x] Manual Vodafone Cash Transfer & Receipt Screenshot Upload System
- [x] Delayed Auth implementation (Register/Login enforced at Payment step only)
- [x] Pending Payment Verification screen + Direct WhatsApp Support link
- [x] Admin Payment Approval flow (approve receipt -> trigger paid status)
- [x] Download API with signed URLs

## Phase 4: Dashboards & User History Log (Weeks 7-9)
- [x] User History Dashboard (contracts log, consultations log, financial transactions ledger)
- [x] Admin Payment Verification Dashboard (inspect uploaded receipts & approve/reject)
- [ ] Business dashboard (profile, subscription, contracts)
- [x] Lawyer dashboard (queue, review, approve/reject, comments)
- [x] Admin dashboard (analytics, users, businesses, lawyers)
- [x] Admin contract configuration (field editing, reordering)
- [x] Admin pricing management
- [x] Audit logging
- [x] Role-based access control

## Phase 5: Polish & Launch (Weeks 10-11)
- [x] Landing page + public pages
- [x] Pricing page
- [x] Responsive design audit
- [x] RTL Arabic layout testing
- [x] Error handling + error pages
- [ ] Performance optimization (caching, lazy loading)
- [ ] Security audit (OWASP checklist)
- [ ] Deployment setup (CI/CD, monitoring)
- [ ] User acceptance testing
- [ ] Launch

**Total Estimated Timeline: 11 weeks**

---

# 154. Post-MVP Roadmap

| Version | Timeline    | Features                                              |
| ------- | ----------- | ----------------------------------------------------- |
| v1.1    | Month 3     | Vehicle Sale Contract, Employment Contract            |
| v1.2    | Month 5     | React Native mobile app                               |
| v1.3    | Month 7     | Dynamic Contract Engine (admin creates new templates) |
| v1.4    | Month 9     | E-signature integration, SMS notifications            |
| v2.0    | Month 12    | Multi-country (Saudi Arabia, UAE), multi-language      |
| v2.1    | Month 15    | AI-assisted contract review, API marketplace          |
| v3.0    | Month 18    | White-label solution, government integrations          |

---

# 155. AI Agent Implementation Instructions

This section provides step-by-step instructions for any AI Agent building this platform.

## Step 1: Environment Setup
`ash
# Backend
composer create-project laravel/laravel backend
cd backend
# Install packages: sanctum, socialite, dompdf, simple-qrcode
composer require laravel/sanctum laravel/socialite barryvdh/laravel-dompdf simplesoftwareio/simple-qrcode

# Frontend
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir
cd frontend
npm install @tanstack/react-query zustand react-hook-form @hookform/resolvers zod axios
`

## Step 2: Database First
Create ALL migrations in this order:
1. countries
2. users (extend default)
3. social_accounts
4. businesses
5. business_users
6. subscription_plans
7. subscriptions
8. contract_templates
9. contract_template_sections
10. contract_fields
11. contracts
12. contract_field_values
13. contract_versions
14. contract_attachments
15. lawyers
16. lawyer_reviews
17. lawyer_comments
18. payments
19. invoices
20. notifications
21. audit_logs
22. settings

Then run seeders in the order specified in §149.

## Step 3: Backend Architecture
`
app/
├── Http/
│   ├── Controllers/
│   │   ├── Auth/
│   │   ├── Api/V1/
│   │   │   ├── ContractController.php
│   │   │   ├── UserController.php
│   │   │   ├── PaymentController.php
│   │   │   ├── BusinessController.php
│   │   │   ├── LawyerController.php
│   │   │   └── Admin/
│   │   │       ├── UserManagementController.php
│   │   │       ├── ContractConfigController.php
│   │   │       ├── PricingController.php
│   │   │       └── AnalyticsController.php
│   │   ├── Requests/         # Form Request validation classes
│   │   ├── Resources/        # API Resource transformers
│   │   └── Middleware/
│   ├── Services/
│   │   ├── ContractService.php
│   │   ├── PdfGenerationService.php
│   │   ├── QrCodeService.php
│   │   ├── SerialNumberService.php
│   │   ├── PaymentService.php
│   │   ├── AutoSaveService.php
│   │   └── AuditLogService.php
│   ├── Models/               # Eloquent models
│   ├── Policies/             # Authorization policies
│   ├── Jobs/
│   │   ├── GenerateContractPdf.php
│   │   └── SendNotification.php
│   └── Enums/
│       ├── ContractStatus.php
│       ├── PaymentStatus.php
│       └── UserRole.php
├── routes/
│   ├── api.php               # All API routes
│   └── web.php               # OAuth callbacks only
└── resources/
    └── views/pdf/            # Blade PDF templates
        ├── rental.blade.php
        ├── sale.blade.php
        └── freelancer.blade.php
`

## Step 4: Critical Rules
- **NEVER** put business logic in Controllers
- **ALWAYS** use Services for business logic
- **ALWAYS** use Form Requests for validation
- **ALWAYS** use API Resources for response formatting
- **ALWAYS** wrap multi-table writes in DB transactions
- **ALWAYS** log critical actions to audit_logs
- **ALWAYS** run heavy tasks (PDF, email) in queue jobs
- **NEVER** hardcode configuration values
- **NEVER** expose stack traces in API responses
- **ALWAYS** test with Arabic content

## Step 5: Testing Checklist Per Feature
- [ ] API endpoint returns correct response structure
- [ ] Validation rejects invalid data
- [ ] Authorization prevents unauthorized access
- [ ] Arabic text renders correctly in PDF
- [ ] Auto-save works with concurrent tabs
- [ ] Payment flow completes end-to-end
- [ ] QR code scans and verifies correctly
- [ ] Mobile responsive layouts work
- [ ] RTL layout is correct

## Naming Conventions

| Entity          | Convention         | Example                       |
| --------------- | ------------------ | ----------------------------- |
| DB Table        | plural_snake_case  | contract_fields               |
| DB Column       | snake_case         | field_name                    |
| Model           | PascalCase         | ContractField                 |
| Controller      | PascalCase+Ctrl    | ContractController            |
| Service         | PascalCase+Service | PdfGenerationService          |
| Form Request    | PascalCase+Request | CreateContractRequest         |
| API Resource    | PascalCase+Resource| ContractResource              |
| Job             | PascalCase         | GenerateContractPdf           |
| Policy          | PascalCase+Policy  | ContractPolicy                |
| Migration       | timestamp_verb_table| 2026_01_01_create_contracts   |
| Route           | kebab-case         | /api/v1/contract-templates    |
| Component (FE)  | PascalCase         | WizardStep.tsx                |
| Hook (FE)       | camelCase          | useAutoSave.ts                |
| Store (FE)      | camelCase          | wizardStore.ts                |
| Type (FE)       | PascalCase         | ContractTemplate              |

---

# Part 13 – Architectural Addendum: Z draft Core Features & Rules {#part-13}

---

# 156. Platform Branding & Official Identity (Z draft)

The platform is officially branded as **Z draft (منصة Z draft للعقود والاستشارات الذكية)**.

| Identity Attribute | Official Specification                                                |
| ------------------ | --------------------------------------------------------------------- |
| Platform Name (EN) | **Z draft**                                                           |
| Platform Name (AR) | **منصة Z draft**                                                      |
| Brand Promise      | صياغة ومراجعة العقود القانونية والاستشارات الذكية بسهولة وموثوقية       |
| Primary Domain     | `zdraft.com` / `api.zdraft.com`                                       |

All system emails, PDF headers, QR verification pages, and UI titles must display **Z draft** as the system identity.

---

# 157. Homepage Contract Creation Modes & Flow Architecture

When browsing **Z draft** from the Homepage, visitors can freely inspect the 3 primary contract templates (**Rental Contract**, **Apartment Sale Contract**, and **Freelancer Agreement**) or initiate a **Legal Consultation Request**.

When selecting any contract template, the user is presented with a **Creation Mode Modal/Selector**:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    اختر طريقة إنشاء العقد (Z draft)                    │
├──────────────────────────────────────────────────┬───────────────────┤
│ 1. عمل بنفسي (Self-Service Wizard)               │  سعر القالب الأساسي │
│    • الإجابة على أسئلة سريعة وذكية                  │  (مثلاً 59 ج.م)     │
│    • توليد فوري للعقد بصيغة PDF معتمدة            │                   │
├──────────────────────────────────────────────────┼───────────────────┤
│ 2. عمل عن طريق المحامي (Lawyer-Assisted Creation) │  سعر العقد + مراجعة │
│    • إدخال البيانات الأساسية ويتولى المحامي الصياغة     │  (تسليم خلال 24 ساعة)│
│    • مراجعة قانونية متخصصة ومضمونة                 │                   │
└──────────────────────────────────────────────────┴───────────────────┘
```

## 1. Self-Service Mode (`creation_mode = self_service`)
- User completes the interactive Q&A wizard.
- Real-time validation across all fields.
- Instant PDF draft generation and checkout.

## 2. Lawyer-Assisted Mode (`creation_mode = lawyer_assisted`)
- User fills initial transaction context and attaches relevant documents.
- Draft enters the **Lawyer Review Queue** (`status = pending_lawyer_drafting`).
- Assigned lawyer reviews, refines legal wording, and approves the contract within a **24-hour SLA**.

---

# 158. Legal Consultation & Document Review Service (طلب مراجعة واستشارة قانونية)

A primary, standalone service module configured directly on the **Z draft** Homepage alongside standard contract templates.

## 1. Overview & Purpose
Designed for users who need expert legal review of an existing external contract, case diagnosis, or professional legal advice before committing to a transaction.

## 2. Technical Capabilities & Constraints
- **Extended Multi-File Upload:** Up to **30 images/documents** (`max_attachments = 30`) per consultation request (supporting JPG, PNG, PDF formats).
- **Mandatory Automatic Compression (ضغط الملفات والصور تلقائياً):** All uploaded images and documents MUST be compressed automatically both client-side (`browser-image-compression` library to reduce image size by up to 80% before network upload) and server-side (converted to WebP / optimized) to conserve bandwidth, storage, and accelerate upload speeds.
- **Case Description Textarea:** Comprehensive explanation field (`case_description`, up to 5,000 characters) for the user to describe the problem, legal context, or questions.
- **Dynamic & Variable Pricing:** The consultation fee (`consultation_fee`) is dynamic. It can be set by administrative pricing rules or adjusted based on the complexity/type of legal consultation requested.
- **24-Hour Lawyer SLA:** Dedicated turnaround window (`review_sla_hours = 24`) where the assigned lawyer delivers formal feedback, annotated documents, or legal advice.

```
┌──────────────────────────────────────────────────────────────────────┐
│                  طلب مراجعة واستشارة قانونية (Z draft)                │
├──────────────────────────────────────────────────────────────────────┤
│ • وصف المشكلة أو القضية بالتفصيل (Case / Problem Description)         │
│ • إرفاق المستندات والصور (حتى 30 صورة/ملف مستند قانوني)              │
│ • قيمة الاستشارة: ديناميكية تتغير حسب نوع الاستشارة أو التسعير المعتمد │
│ • مدة التنفيذ والرد القانوني: خلال 24 ساعة                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

# 159. PUBG-Like User ID (`user_code`) & Collaborative Sharing System

To enable frictionless collaboration between business partners, co-signers, or advisors without exposing sensitive email addresses or phone numbers during sharing lookup, **Z draft** implements a **PUBG-Style Unique Numeric User ID**.

## 1. PUBG-Like User ID (`pubg_id` / `user_code`)
- Every registered user is assigned a unique **8-digit numeric identifier** upon registration (e.g., `ID: 58291047`).
- Displayed prominently on the user profile badge and dashboard header with a one-click copy button (`ID: 58291047 📋`).

## 2. Document & Consultation Sharing via PUBG ID
Users can share any draft contract or legal consultation request with another user on **Z draft** by entering their **8-digit PUBG ID**.

```
┌──────────────────────────────────────────────────────────────────────┐
│               مشاركة العقد / الاستشارة مع مستخدم آخر                 │
├──────────────────────────────────────────────────────────────────────┤
│ أدخل معرف المستخدم (PUBG-like ID): [ 58291047 ]                      │
│                                                                      │
│ صلاحيات المشاركة:                                                    │
│ (•) مشاهدة وتحميل فقط (View & Download Only)                         │
│ ( ) إمكانية التعديل في البنود والشروط (Edit Access - شريطة عدم تعديل  │
│     البيانات الأساسية والهوية)                                         │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Permission Levels (`permission_level`)
- `view_download`: The collaborator can view the contract/consultation summary, track review status, and download preview/final PDF documents.
- `edit`: The collaborator can modify editable clauses, financial arrangements, and additional terms (strictly governed by Section 160).

---

# 160. Core Data Immutability Rule (عدم تعديل البيانات الأساسية بعد الإنشاء)

A foundational architectural security rule in **Z draft** to prevent identity fraud, bait-and-switch modifications, or legal invalidation.

## 1. Core Identity Immutability Policy
Once a contract draft or legal consultation request is initialized and saved, all **Core Personal Identity Fields** are **LOCKED (Immutable)** for both the creator and any shared collaborators:
- Party Full Names (`landlord_name`, `tenant_name`, `seller_name`, `buyer_name`, `client_name`, `contractor_name`)
- National ID Numbers (`national_id`, `commercial_registration`)
- Primary Identity Phone Numbers & Email Addresses associated with the parties

## 2. Permitted Editable Fields (During 24h Window)
Modifications permitted during the 24-hour edit window or by authorized collaborators (`edit` access) are restricted strictly to:
- Secondary transaction terms (rent amount, installments, delivery dates, payment schedules)
- Optional legal toggles (subleasing, dispute resolution mechanism, penalty clauses)
- Additional custom terms and notes (`additional_terms`)

## 3. Enforcement Layer
- **Backend API Layer:** Laravel Form Requests and Policies explicitly strip or reject any payload attempting to mutate locked core fields (`422 Unprocessable Entity - CORE_DATA_IMMUTABLE`).
- **Frontend UI Layer:** Core identity fields render as disabled badges with a lock icon (`🔒 بيانات أساسية غير قابلة للتعديل`) once the initial creation step completes.

---

# 161. Database & API Schema Extensions for Z draft

## 1. Database Schema Extensions

```sql
-- Add PUBG-like unique ID to users table
ALTER TABLE users ADD COLUMN pubg_id VARCHAR(10) UNIQUE NOT NULL;
CREATE INDEX idx_users_pubg_id ON users(pubg_id);

-- Table for Legal Consultations & Review Requests
CREATE TABLE legal_consultations (
    id BIGSERIAL PRIMARY KEY,
    serial_number VARCHAR(32) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_lawyer_id BIGINT NULL REFERENCES lawyers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    case_description TEXT NOT NULL,
    consultation_fee DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP',
    status VARCHAR(50) DEFAULT 'pending_payment', -- pending_payment, pending_lawyer_review, answered, closed
    review_sla_hours INT DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for Consultation/Contract Attachments (supporting up to 30 files)
CREATE TABLE document_attachments (
    id BIGSERIAL PRIMARY KEY,
    attachable_type VARCHAR(100) NOT NULL, -- Contract or LegalConsultation
    attachable_id BIGINT NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    display_order INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for PUBG ID Sharing & Collaboration
CREATE TABLE shared_collaborations (
    id BIGSERIAL PRIMARY KEY,
    shareable_type VARCHAR(100) NOT NULL, -- Contract or LegalConsultation
    shareable_id BIGINT NOT NULL,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(30) NOT NULL DEFAULT 'view_download', -- view_download, edit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shareable_type, shareable_id, target_user_id)
);
```

## 2. Z draft API Endpoints Summary

| Method | Endpoint                                        | Auth | Purpose                                                      |
| ------ | ----------------------------------------------- | ---- | ------------------------------------------------------------ |
| POST   | `/api/v1/contracts/initiate`                    | Yes  | Create contract with `creation_mode` (self_service / lawyer) |
| POST   | `/api/v1/consultations`                         | Yes  | Create Legal Consultation Request (supports 30 attachments)  |
| GET    | `/api/v1/consultations/{id}`                    | Yes  | View consultation status, files, and lawyer response         |
| POST   | `/api/v1/share`                                 | Yes  | Share contract/consultation by target user's `pubg_id`       |
| DELETE | `/api/v1/share/{id}`                            | Yes  | Revoke shared collaboration access                           |
| GET    | `/api/v1/users/lookup-pubg/{pubg_id}`           | Yes  | Lookup public username badge by PUBG ID for sharing safety   |

---

# 162. Manual Vodafone Cash Payment Flow, Delayed Auth & User History Log

## 1. Delayed Authentication Strategy (Frictionless Browsing & Creation)
To maximize user conversion on **Z draft**, visitors can browse all templates, test wizard questions, draft contracts, and prepare legal consultation requests **without creating an account or logging in**.

Authentication (Registration / Login) is strictly enforced **only at the Checkout / Payment Step**:
```
[Browse Homepage] → [Select Template/Mode or Consultation] → [Complete Draft Q&A]
                                                                        ↓
[Reach Payment/Checkout Step] ← Auth Gate Triggered (Register / Login / Google OAuth)
                                                                        ↓
                                                           [Proceed to Payment]
```

## 2. MVP Payment Gateway: Manual Vodafone Cash Transfer
For the MVP launch, **Z draft** replaces automated payment gateways with an audited **Manual Vodafone Cash Receipt Upload Flow**:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    الدفع عبر فودافون كاش (Vodafone Cash)               │
├──────────────────────────────────────────────────────────────────────┤
│ 1. قم بتحويل مبلغ [ 59 ج.م ] إلى رقم فودافون كاش الرسمي:             │
│    رقم التحويل: 010XXXXXXXX (نسخ سريع 📋)                           │
├──────────────────────────────────────────────────────────────────────┤
│ 2. ارفع صورة إيصال التحويل (Screenshot / Receipt):                   │
│    [ ارفع صورة إيصال فودافون كاش (JPG / PNG) ]                       │
├──────────────────────────────────────────────────────────────────────┤
│ 3. رقم الهاتف المحول منه (اختياري للمطابقة السريعة): 01XXXXXXXXX       │
└──────────────────────────────────────────────────────────────────────┘
```

### Flow Architecture:
1. User uploads the Vodafone Cash transfer receipt screenshot (`receipt_image_path`).
2. Order status transitions to `pending_payment_verification` (قيد مراجعة التحويل).
3. **Waiting Screen with WhatsApp Escalation Button:**
   - Displays: *"تم استلام إيصال التحويل وهو قيد المراجعة الفورية من الإدارة. يرجى الانتظار لحين اعتماد التحويل وفتح التحميل."*
   - Includes a direct **WhatsApp Support Button**:
     - Label: `"تأخرت الموافقة؟ تواصل معنا فوراً عبر واتساب لتفعيل طلبك 💬"`
     - Action: Opens WhatsApp chat with pre-filled message containing User ID (`pubg_id`) and Order Serial Number.
4. **Admin Dashboard Approval:**
   - Admin inspects the uploaded receipt screenshot in the Admin Dashboard.
   - Upon clicking **Approve Payment (تأكيد التحويل)**:
     - Order status automatically updates to `paid`.
     - Final PDF download opens immediately / Consultation request enters lawyer review queue.
     - User receives instant notification.

## 3. User History & Financial Transactions Dashboard (سجل العقود وتاريخ العمليات)
Every authenticated user has a dedicated **User Activity & Financial Log Dashboard**:
- **Contracts & Drafts Log (`contracts`):** Complete list of all created contracts, current status (`draft`, `pending_payment_verification`, `paid`, `issued`), serial numbers, and download links.
- **Legal Consultations Log (`legal_consultations`):** List of consultation requests, uploaded files count, lawyer responses, and status.
- **Financial Transactions Log (`payments`):** Audited ledger showing every transaction attempt, payment method (`vodafone_cash`), uploaded receipt preview, amount paid, transaction timestamp, and verification status (`pending`, `approved`, `rejected`).

---

# Document Footer

> **Document:** Z draft – Smart Contracts & Consultations Platform SPRD v1.1  
> **Total Sections:** 162 (§1–§162)  
> **Total Parts:** 13 (Including Z draft Core Addendum)  
> **Scope:** Full MVP Architecture, Implementation Blueprint, Vodafone Cash Payment Flow & Consultation Engine  
> **Usage:** This document is the SOLE reference for all AI Agents, developers, and architects working on **Z draft**. Every implementation decision MUST be traceable to a section in this document.  
> **Last Updated:** 2026-07-11

