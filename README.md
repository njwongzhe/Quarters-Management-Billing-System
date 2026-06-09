<div align="center">

# "Pemantauan Potongan Gaji Kuarters" System
Quarters Management & Billing System (QMBS)


[![Platform - Web](https://img.shields.io/badge/platform-Web-blue?logo=html5)](#)
[![Next.js - 16.2](https://img.shields.io/badge/Next.js-16.2.4-black?logo=nextdotjs&logoColor=white)](#)
[![React - 19.2](https://img.shields.io/badge/React-19.2.4-20232a?logo=react&logoColor=61dafb)](#)
[![Prisma - 7.8](https://img.shields.io/badge/Prisma-7.8.0-2D3748?logo=prisma&logoColor=white)](#)
[![Database - PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql&logoColor=white)](#)
[![Auth - Supabase](https://img.shields.io/badge/Auth-Supabase-3ECF8E?logo=supabase&logoColor=white)](#)
[![AI Service - FastAPI](https://img.shields.io/badge/AI%20Service-FastAPI-009688?logo=fastapi&logoColor=white)](#)
[![CSS - Tailwind CSS v4](https://img.shields.io/badge/Tailwind-CSS%20v4-38bdf8?logo=tailwindcss&logoColor=white)](#)
[![License - Proprietary](https://img.shields.io/badge/license-Proprietary-orange)](#)

---
</div>

**"Pemantauan Potongan Gaji Kuarters" System (Quarters Management & Billing System - QMBS)** is an enterprise-grade housing allocation, resident tracking, and financial billing automation platform designed for administrators managing government quarters (such as Johor state civil service quarters).

It integrates a high-performance **Next.js Web Client** with a standalone **Python AI Extraction Service** to parse unstructured billing and residential spreadsheets directly into a staging/verification interface before committing records to the live relational database.

---

<br />

## 📌 Table of Contents
1. [Core Features](#-core-features)
2. [Project Architecture](#-project-architecture)
3. [Technology Stack](#-technology-stack)
4. [Database Schema Overview](#-database-schema-overview)
5. [Setup & Local Deployment](#-setup--local-deployment)
6. [AI Staging & Import Workflow](#-ai-staging--import-workflow)
7. [Audit Trails & Security](#-audit-trails--security)

<br />

---

<br />

## 🌟 Core Features

*   **Laman Utama (Home / Dashboard)**: Live collection tracking graphs (Monthly collections, Year-To-Date (YTD) cumulative amounts) and comparison widgets indicating performance against target metrics.
*   **Muat Naik & Semakan (Upload & Review)**: Spreadsheet (`.xlsx`) and PDF document processing staging pipeline. System parsing works in two modes:
    *   *Strict Mode*: Code-based deterministic structural parsing.
    *   *Assisted Mode*: Employs Google Gemini AI models to map dynamic, messy excel templates onto the database schema.
*   **Bayaran (Payments)**: View detailed, search-friendly resident payment receipts, issue manual reversals, and process custom adjustments.
*   **Tunggakan (Arrears)**: Summary tracking of outstanding balances for each active resident, updating automatically as new bills or payments are processed.
*   **Transaksi (Transactions)**: Financial double-entry ledger detailing specific debit/credit history (monthly rental charges, maintenance fees, rebates, penalty charges, and payments).
*   **Penghuni (Residents)**: Management database containing service levels, position titles, department groups, and contact details with dash-insensitive Identification Card (IC) search queries.
*   **Kuarters (Quarters)**: Configure quarter building categories (address, base rental, maintenance fees, and penalty rates) and track live occupancy statuses (`VACANT` / `OCCUPIED`) and historical unit stays.
*   **Jejak Audit (Audit Trails)**: Secure log capture capturing all administrative writes (Create, Update, Delete, Verify, Login, Logout, Export, Import) for corporate compliance.

<br />

---

<br />

## 🏗 Project Architecture

The application is structured as a decoupled web application and microservice:

```mermaid
graph TD
    A[Next.js 16 Web UI client] -->|API Calls & Auth| B[Supabase Authentication]
    A -->|Prisma Client| C[Supabase PostgreSQL Database]
    A -->|File Uploads| D[Python AI Extraction Service]
    D -->|Gemini API| E[Google Gemini LLM Models]
    D -->|Parsed Staging Drafts JSON| A
    A -->|Commit Staging Drafts| C
```

*   **Frontend / Web Client**: Single-page application router layout implemented in React 19 and Next.js 16, using Tailwind CSS v4 for layouts. 
*   **Database Access Layer**: Managed via Prisma ORM connecting directly to the PostgreSQL database hosted on Supabase.
*   **AI Extraction Microservice**: A standalone FastAPI Python REST service that handles spreadsheet/PDF document ingestion and parsing.

<br />

---

<br />

## 🛠 Technology Stack

### Web Client & Backend API
*   **Framework**: Next.js 16.2.4 (App Router)
*   **Library**: React 19.2.4
*   **Styling**: Tailwind CSS v4 (native CSS components, no Tailwind utility compilation bugs)
*   **ORM**: Prisma ORM v7.8.0
*   **Database**: Supabase PostgreSQL
*   **Authentication**: Supabase SSR Auth (`@supabase/ssr`)
*   **Typography**: Google Manrope (headings) & Material Symbols Outlined (UI icons)

### AI Microservice
*   **Framework**: FastAPI (Python 3.10+)
*   **Server**: Uvicorn
*   **Parsing Engines**: Openpyxl (spreadsheet processing), PDFMiner/PyPDF
*   **AI Engine**: Google Gemini API SDK

<br />

---

<br />

## 📊 Database Schema Overview

The Supabase PostgreSQL database contains exactly **19 tables** organized to cleanly separate production database state from temporary staging drafts:

| Category | Model Name | Description |
| :--- | :--- | :--- |
| **Authentication** | `AdminProfile` | Admin credentials matching Supabase auth table. |
| **Housing Core** | `Resident` | Quarters occupants service profiles. |
| | `QuarterCategory` | Quarters location, standard rental, and maintenance price templates. |
| | `Unit` | Specific housing codes mapped to a `QuarterCategory`. |
| | `UnitOccupancy` | Logs of who occupies what unit (Start date, End date). |
| **Financial Ledger**| `MonthlyCharge` | Consolidated monthly billing (Base Rent + Maintenance + Penalties). |
| | `AdditionalCharge` | One-off additional administrative or penalty charges linked to a monthly bill. |
| | `Rebate` | Monthly rent rebates or adjustment credits linked to a monthly bill. |
| | `Payment` | Received transactions matching a resident. |
| | `Transaction` | Double-entry ledger (debits/credits) for transparent financial audits. |
| | `ArrearsSummary` | Cumulative outstanding balance for individual residents. |
| | `BillingCycle` | Tracks automated bulk monthly billing runs. |
| **Staging Drafts** | `UploadedDocument` | Records of excel/pdf documents uploaded. |
| | `ResidentDraft` | Temporary staging table for resident data imports. |
| | `QuarterCategoryDraft`| Temporary staging table for location/pricing configs. |
| | `UnitDraft` | Temporary staging table for housing units. |
| | `PaymentDraft` | Temporary staging table for payment receipts. |
| | `ArrearsSummaryDraft` | Temporary staging table for arrears audits. |
| **Governance** | `AuditLog` | Automated administrative write actions logging. |

<br />

---

<br />

## ⚡ Supabase Automation: Triggers & Scheduled Jobs

The Supabase database leverages built-in automation features to run background utilities and ensure data integrity in real-time. These are configured directly within the PostgreSQL database via Prisma migrations:

### 1. Scheduled Cron Jobs (`pg_cron`)
These jobs run at scheduled times and can be monitored under **Supabase Dashboard > Integrations > Cron > Jobs**:
*   **`daily-age-status-update`** (Runs daily at `00:01` UTC): Traverses the `Resident` table and calculates their current age based on the first 6 digits of their Identification Card (IC) number. Residents reaching 59 years of age are updated to `PENCEN_MENDATANG` (future pensioner), and those reaching 60+ are marked as `TIDAK_LAYAK` (ineligible).
*   **`daily-quarter-unit-occupancy-status-sync`** (Runs daily at `16:05` UTC / `00:05` Malaysia Time): Evaluates occupancies based on current date timestamps. It syncs the `Unit` status (`VACANT` / `OCCUPIED`) and `UnitOccupancy` status (`CURRENT` / `PAST`) to handle check-ins and check-outs automatically.
*   **`monthly-billing-generation`** (Runs at `16:05` UTC / `00:05` Malaysia Time on the 1st day of every month): Invokes the `run_monthly_billing()` stored SQL function. It aggregates rental charges, computes penalty amounts for ineligible occupants, generates transactions in the double-entry ledger, and initializes the `BillingCycle` lock record.

### 2. Real-Time Database Triggers
Triggers are registered on the database to instantly sync and calculate resident profiles between scheduled cron checks:
*   **`check_status_on_resident_update`** (on the `Resident` table): Triggers evaluation immediately when any profile values are modified.
*   **`check_status_on_occupancy`** (on the `UnitOccupancy` table): Re-runs calculations if a resident's check-in/checkout assignments are modified.
*   **`check_status_on_transaction`** (on the `Transaction` table): Triggers recalculation if transaction ledgers or payment events are posted or deleted.

<br />

---

<br />

## 🚀 Setup & Local Deployment

### 1. Prerequisites
Make sure the following are installed locally:
*   **Node.js** (v18.x or v20.x recommended)
*   **Python** (v3.10+)
*   **Supabase Database** (or any remote Supabase PostgreSQL connection URI)

---

### 2. Environment Configurations
Create a `.env` file in the project root:

```ini
# Database (Supabase PostgreSQL via Prisma)
DATABASE_URL="postgresql://username:password@host:port/database?pgbouncer=true"
DIRECT_URL="postgresql://username:password@host:port/database"

# Supabase Auth Settings
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# AI Gateway Configurations
AI_SERVICE_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# Gemini API Keys (For AI extraction)
GEMINI_API_KEY_1="AIzaSyYourKeyHere"
```

Configure `ai_service/.env` as well:

```ini
AI_SERVICE_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

---

### 3. Supabase Project Configuration & Provisioning

Since the database and authentication layers are hosted on **Supabase**, follow these steps to configure your project correctly:

#### A. Auth & Schema Setup
1. Create a new project in the [Supabase Dashboard](https://supabase.com).
2. Retrieve the Postgres connection pooling URI (port `6543`) for `DATABASE_URL` and the direct connection URI (port `5432`) for `DIRECT_URL`.
3. Retrieve your project API URL, Anon Key, and Service Role Key under **Project Settings > API**. Put these in your `.env` file.

#### B. Supabase Email Template Setup
1. Navigate to **Supabase Dashboard > Authentication > Email Templates**.
2. Customize the templates (Invite user, Confirmation, Reset Password) to use your agency language context (e.g., Malay/English), and set the redirection links matching your deployed frontend URL.

#### C. Supabase Extensions, Triggers & Scheduled Jobs (pg_cron) Configuration
1. **Activate pg_cron Extension**:
   - Navigate to the **Supabase Dashboard > Database > Extensions** (or **Integrations > Cron**).
   - Locate and **enable** the `pg_cron` extension. This must be done **before** executing schema migrations.
2. **Deploy Automations & Migrations**:
   - Once `pg_cron` is enabled, running the Prisma migration deploy command (see the client setup steps below) will automatically configure the database objects:
     ```bash
     npx prisma migrate dev
     ```
     This executes the database migration SQL scripts, provisioning:
     *   Stored database functions (`run_monthly_billing()`, `sync_quarter_unit_occupancy_statuses()`, `calculate_and_update_resident_status()`).
     *   The scheduled cron jobs (`monthly-billing-generation`, `daily-quarter-unit-occupancy-status-sync`, `daily-age-status-update`).
     *   The table triggers (`check_status_on_resident_update`, `check_status_on_occupancy`, `check_status_on_transaction`).
3. **Verify Deployment**:
   - Check **Supabase Sidebar > Integrations > Cron > Jobs** to confirm the three scheduled jobs are active.
   - Check **Supabase Sidebar > Database > Triggers** to confirm the three status synchronization triggers are listed.

#### D. Prisma Migrations Helper Commands (Optional)

1. **Generate Initial Migration**: To create and apply the initial tables to the database:
   ```bash
   npx prisma migrate dev --name init
   ``` 
2. **Create Custom Draft Migrations**: To generate new migration folders and SQL draft files *without* executing them directly on the database (critical when you need to write or customize SQL triggers, helper procedures, or scheduled `pg_cron` jobs prior to execution). Then, replace the migration file inside with corresponding migration file in backup directory.
   ```bash
   npx prisma migrate dev --create-only --name pg_cron_add_billing
   npx prisma migrate dev --create-only --name pg_cron_add_quarter_unit_occupancy_status
   npx prisma migrate dev --create-only --name pg_cron_add_resident_status_automation
   ```
   
3. **Reset Database**: To drop all tables, wipe out the schema, re-run all migrations from scratch, and clear the database:
   ```bash
   npx prisma migrate reset
   ```

---

### 4. Setting Up the Web Client & Database Schema
In the project root directory, run the following commands **in order** to configure the database schema and launch the application:

```bash
# 1. Install project node dependencies
npm install

# 2. Generate Prisma Client local type definitions
npx prisma generate

# 3. Start Next.js development server
npm run dev
```

The app will start running on [http://localhost:3000](http://localhost:3000).

---

### 5. Setting Up the Python AI Service
In another terminal instance, navigate to the `ai_service` folder and activate the Python virtual environment:

```powershell
# 1. Navigate to the folder
cd ai_service

# 2. Create the virtual environment
python -m venv .venv

# 3. Activate the environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# 4. Install requirements
pip install -r requirements.txt

# 5. Start the FastAPI microservice
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Verify that the service is running by visiting [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health). You should see `{"status":"ok"}`.

<br />

---

<br />

## 🔄 AI Staging & Import Workflow

QMBS employs a safe draft-and-commit data ingestion pipeline to prevent spreadsheet errors from corrupting the production database:

```mermaid
sequenceDiagram
    autonumber
    Admin->>Next.js Web UI: Upload XLSX / PDF (Penghuni / Bayaran)
    Next.js Web UI->>FastAPI AI Service: POST /extract
    FastAPI AI Service->>Google Gemini API: Structural Mapping (if Assisted mode)
    Google Gemini API-->>FastAPI AI Service: Formatted Data JSON
    FastAPI AI Service-->>Next.js Web UI: Extracted Records JSON
    Next.js Web UI->>PostgreSQL: Save as Draft Tables (e.g. ResidentDraft)
    Admin->>Next.js Web UI: Review Errors & Conflicts in Semakan View
    Admin->>Next.js Web UI: Click "Verify and Commit"
    Next.js Web UI->>PostgreSQL: Write to Production Tables & Log Audit
```

1.  **File Selection**: Admin chooses a category (e.g. Payments - *Bayaran*) and uploads the raw document.
2.  **FastAPI Extraction**: The FastAPI microservice reads the document. Under **Assisted Mode**, it uses a Gemini prompt template to normalize names, align dates, resolve IC formatting, and group currencies.
3.  **Staging View**: The spreadsheet rows load into Next.js as editable draft cards. If an IC number is missing, or a unit code is invalid, the review table highlights the cells in red.
4.  **Database Commit**: Once the administrator edits or verifies all validations, clicking the verify action transfers all draft records to the `Resident` or `Payment` production tables, automatically clearing the drafts and refreshing the dashboard view.

<br />

---

<br />

## 🔒 Audit Trails & Security

Administrative write operations are automatically recorded. The `AuditLog` captures:
*   **Time & Date**: Clock-timestamp of the event.
*   **Administrator**: Username and Profile ID of the admin.
*   **Target Domain**: The module target (`RESIDENT`, `UNIT`, `PAYMENT`, `TRANSACTION`).
*   **Action Type**: E.g., `CREATE`, `UPDATE`, `DELETE`, `VERIFY`, `LOGIN`, `LOGOUT`.
*   **Payload Description**: Detailed text explaining the action (e.g. *"Updated IC Number for Resident John Doe"*).

This log is accessible on the **Jejak Audit** (Audit Trails) panel for oversight and review.