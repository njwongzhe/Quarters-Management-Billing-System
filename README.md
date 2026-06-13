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
4. [Directory Structure](#-directory-structure)
5. [Database Schema Overview](#-database-schema-overview)
6. [AI Staging & Import Workflow](#-ai-staging--import-workflow)
7. [Audit Trails & Security](#-audit-trails--security)
8. [Setup & Local Deployment](#-setup--local-deployment)
9. [Production Deployment](#-production-deployment)
 
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

The application is structured as a decoupled web application and microservice deployed across multiple cloud providers:

```mermaid
graph TD
    A["Next.js Web UI Client (Vercel)"] -->|API Calls & Auth| B["Supabase Authentication (Supabase)"]
    A -->|Prisma Client| C["PostgreSQL Database (Supabase)"]
    A -->|Route Handler HTTP Proxy| D["Python AI Extraction Service (Render)"]
    D -->|Gemini API| E[Google Gemini LLM Models]
    D -->|Parsed Staging Drafts JSON| A
    A -->|Commit Staging Drafts| C
```

*   **Frontend / Web Client (Vercel)**: Next.js 16 (App Router) client-side application implemented in React 19, styled with Tailwind CSS v4.
*   **Database Access Layer (Supabase)**: Managed via Prisma ORM connecting to a high-availability PostgreSQL instance hosted on Supabase.
*   **AI Extraction Microservice (Render)**: A standalone Python FastAPI REST service running on a Render Web Service container, responsible for document ingestion and parsing.

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

## 📂 Directory Structure

Below is an overview of the primary directories and files within this project:

```txt
/
├── .env                  # Local environment variable configuration. (Not Tracked by Git)
├── .gitignore            # Git exclusion patterns.
├── eslint.config.mjs     # ESLint static code analysis settings.
├── next-env.d.ts         # TypeScript Next.js environment declarations.
├── next.config.ts        # Next.js framework configuration.
├── package-lock.json     # Node modules dependency lockfile.
├── package.json          # Node project dependencies and script setups.
├── postcss.config.mjs    # PostCSS tool settings for Tailwind.
├── prisma.config.ts      # Prisma initialization config.
├── proxy.ts              # Custom development proxy handling API routes.
├── README.md             # System documentation guide.
├── tsconfig.json         # TypeScript compilation compiler settings.
├── ai_service/           # Standalone Python FastAPI microservice for document parsing.
│   ├── extractors/       # Logic files handling specific XLSX and PDF structures.
│   ├── main.py           # FastAPI entry point, CORS settings, and route handlers.
│   └── requirements.txt  # Python package dependencies
├── app/                  # Next.js 16 Web Client source code. (App Router)
│   ├── favicon.ico       # Web client browser tab icon asset.
│   ├── globals.css       # Global stylesheet & Tailwind CSS declarations.
│   ├── layout.tsx        # Base root layout template.
│   ├── not-found.tsx     # Custom 404 page handler.
│   ├── page.tsx          # Root page forwarding route.
│   ├── api/              # Backend server route handlers for Supabase auth & proxying.
│   ├── components/       # Reusable global dashboard UI component blocks.
│   ├── constants/          # Global constant values and config maps.
│   │   ├── auth-server.ts  # Server-side authentication configurations.
│   │   ├── auth.ts         # Authentication configuration templates.
│   │   └── routes.ts       # Sidebar navigation routes and route accessibility rules.
│   └── pages/                # Multi-page dashboard modules.
│       ├── layout.tsx        # Dashboard UI shell framework.
│       ├── page.tsx          # Main portal fallback landing router.
│       ├── 0_authentication/ # Admin credentials and login views.
│       ├── 1_laman_utama/    # Dashboard widgets & charts (Laman Utama).
│       ├── 2_muat_naik/      # Excel & PDF draft uploader tools (Muat Naik).
│       ├── 3_bayaran/        # Payment receipts browser & adjustment modules (Bayaran).
│       ├── 4_tunggakan/      # Arrears listings & summary tracking panels (Tunggakan).
│       ├── 5_transaksi/      # Double-entry ledger transactional auditing table (Transaksi).
│       ├── 6_penghuni/       # Resident account profiles manager (Penghuni).
│       ├── 7_kuarters/       # Housing categories & unit state configurations (Kuarters).
│       ├── 8_jejak_audit/    # Database administration transaction trail tracker (Jejak Audit).
│       └── 9_profile/        # Active administrator settings configuration.
├── backup/                                 # Critical backup copies of system SQL scripts & templates.
│   ├── PRISMA_SUPABASE_BACKUP_DONT_DELETE/ # Backups of custom pg_cron triggers & jobs.
│   └── SUPABASE_BACKUP_DONT_DELETE/        # HTML code backups for custom email templates.
├── lib/     # Core utilities, database queries, and Supabase client helpers.
├── prisma/  # Database schema models and SQL migration definitions.
└── public/  # Static assets. (fonts, icons, graphics)
```

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

## 🔄 AI Staging & Import Workflow

QMBS employs a safe draft-and-commit data ingestion pipeline to prevent spreadsheet errors from corrupting the production database:

```mermaid
sequenceDiagram
    autonumber
    Admin->>Next.js Web UI (Vercel): Upload XLSX / PDF (Penghuni / Bayaran)
    Next.js Web UI (Vercel)->>Next.js Route Handler: POST /api/extract/[kind]
    Next.js Route Handler->>FastAPI AI Service (Render): POST /extract/[kind] (with parsing_mode)
    FastAPI AI Service (Render)->>Google Gemini API: Structural Mapping (if Assisted mode)
    Google Gemini API-->>FastAPI AI Service (Render): Formatted Data JSON
    FastAPI AI Service (Render)-->>Next.js Route Handler: Extracted Records JSON
    Next.js Route Handler-->>Next.js Web UI (Vercel): Extracted Records JSON
    Next.js Web UI (Vercel)->>PostgreSQL (Supabase): Save as Draft Tables (e.g. ResidentDraft)
    Admin->>Next.js Web UI (Vercel): Review Errors & Conflicts in Semakan View
    Admin->>Next.js Web UI (Vercel): Click "Verify and Commit"
    Next.js Web UI (Vercel)->>PostgreSQL (Supabase): Write to Production Tables & Log Audit
```

1.  **File Selection**: Admin chooses a category (e.g. Payments - *Bayaran*) and uploads the raw document.
2.  **Next.js API Handler Proxying**: The Next.js client uploads the file to the Next.js API Route Handler (`/api/extract/[kind]`) on Vercel, which forwards the request to the standalone FastAPI microservice (`/extract/[kind]`) running on Render.
3.  **FastAPI Extraction**: The FastAPI microservice reads the document. Under **Assisted Mode**, it uses a Gemini prompt template to normalize names, align dates, resolve IC formatting, and group currencies.
4.  **Staging View**: The spreadsheet rows load into Next.js as editable draft cards. If an IC number is missing, or a unit code is invalid, the review table highlights the cells in red.
5.  **Database Commit**: Once the administrator edits or verifies all validations, clicking the verify action transfers all draft records to the `Resident` or `Payment` production tables in Supabase, automatically clearing the drafts and refreshing the dashboard view.

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
# Database (Supabase PostgreSQL via Prisma connection pooling)
DATABASE_URL="postgresql://username:password@host:port/database?pgbouncer=true"

# Direct connection to the database (used for running migrations)
DIRECT_URL="postgresql://username:password@host:port/database"

# Supabase Authentication Settings
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"

# Critical System Reset Key
SYSTEM_RESET_CRITICAL_KEY="your-critical-system-reset-key"

# FastAPI (Python) AI Service API Endpoint (Local default)
AI_SERVICE_URL="http://127.0.0.1:8000"
NEXT_PUBLIC_AI_SERVICE_URL="http://127.0.0.1:8000"
```

Configure `ai_service/.env` as well:

```ini
# Allowed origins for CORS (comma-separated list of origins, e.g. local development frontend)
AI_SERVICE_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# Google Gemini API Keys (Configure multiple keys for automatic failover rotation)
GEMINI_API_KEY_1="AIzaSyYourGeminiKeyHere"
GEMINI_API_KEY_2=""
...
GEMINI_API_KEY_50=""
```

---

### 3. Supabase Project Configuration & Provisioning

Since the database and authentication layers are hosted on **Supabase**, follow these steps to configure your project correctly:

#### A. Auth & Schema Setup
1. Create a new project in the [Supabase Dashboard](https://supabase.com).
2. Retrieve the Postgres connection pooling URI (port `6543`) for `DATABASE_URL` and the direct connection URI (port `5432`) for `DIRECT_URL`.
3. Retrieve your project API URL, Anon Key, and Service Role Key under **Project Settings > API**. Put these in your `.env` file.

#### B. Custom SMTP (Resend) Setup (Optional)
Since Supabase free projects have strict hourly limits on outgoing emails, configure a custom SMTP server using [Resend](https://resend.com) to ensure reliable delivery of admin invitation and password reset emails:

1. **Get Resend SMTP Credentials**:
   - Register or log in at [Resend](https://resend.com).
   - Go to **API Keys** and generate a new API Key (starts with `re_`).
2. **Configure SMTP on Supabase**:
   - In the **Supabase Dashboard**, navigate to **Project Settings > Authentication**.
   - Scroll down to the **SMTP Settings** section and enable the toggle for **Enable Custom SMTP**.
   - Fill in the credentials:
     *   **Sender Email**: `noreply@yourdomain.com` *(Ensure the domain is verified in Resend)*
     *   **Sender Name**: `Quarters Management System`
     *   **SMTP Host**: `smtp.resend.com`
     *   **Port**: `587`
     *   **Username**: `resend`
     *   **Password**: *[Your Resend API Key]*
   - Save the changes.

#### C. Customize Email Templates
*(Note: Prepared HTML templates are stored inside the "backup/SUPABASE_BACKUP_DONT_DELETE/" directory, including templates for Confirm Sign Up, Change Email Address, and Reset Password.)*

1. Navigate to **Supabase Dashboard > Authentication > Email Templates**.
2. Customize the following templates:
   *   **Confirm Signup** (For admin confirmation.)
   *   **Invite User** (For inviting new administrators.)
   *   **Reset Password** (For administrator password resets.)

#### D. Supabase Database, Extensions, Triggers & Scheduled Jobs (pg_cron) Configuration
*(Note: The corresponding SQL scripts for triggers, stored procedures and cron schedules are stored inside the "backup/PRISMA_SUPABASE_BACKUP_DONT_DELETE/")*

1. **Activate pg_cron Extension**:
   - Navigate to the **Supabase Dashboard > Database > Extensions** (or **Integrations > Cron**).
   - Locate and **enable** the `pg_cron` extension. This must be done **before** executing schema migrations.
2. **Deploy Schema, Automations & Migrations**:
   - Once `pg_cron` is enabled, running the Prisma migration command will automatically provision all required database tables, relationships, and automations:
     ```bash
     npx prisma migrate dev
     ```
     This executes the database migration SQL scripts, provisioning:
     *   **All Required Tables**: The 19 database tables (e.g. Resident, MonthlyCharge, UploadedDocument, AuditLog, etc.) representing the core schema.
     *   **Stored Database Functions**: `run_monthly_billing()`, `sync_quarter_unit_occupancy_statuses()`, `calculate_and_update_resident_status()`.
     *   **Scheduled Cron Jobs**: `monthly-billing-generation`, `daily-quarter-unit-occupancy-status-sync`, `daily-age-status-update`.
     *   **Database Triggers**: `check_status_on_resident_update`, `check_status_on_occupancy`, `check_status_on_transaction`.
3. **Verify Deployment**:
   - Check **Supabase Sidebar > Database > Tables** to confirm that all 19 relational tables (e.g. `Resident`, `Unit`, `Transaction`, `Payment`, etc.) are listed.
   - Check **Supabase Sidebar > Integrations > Cron > Jobs** to confirm the three scheduled jobs are active.
   - Check **Supabase Sidebar > Database > Triggers** to confirm the three status synchronization triggers are listed.

#### E. Prisma Migrations Helper Commands (Optional)

1. **Generate Initial Migration**: To create and apply the initial tables to the database:
   ```bash
   npx prisma migrate dev --name init
   ``` 
2. **Create Custom Draft Migrations**: To generate new migration folders and SQL draft files *without* executing them directly on the database (critical when you need to write or customize SQL triggers, helper procedures, or scheduled `pg_cron` jobs prior to execution). Then, replace the migration file inside with corresponding migration file in the [backup/PRISMA_SUPABASE_BACKUP_DONT_DELETE/](file:///e:/GitHub/Application_Development_Project_I/backup/PRISMA_SUPABASE_BACKUP_DONT_DELETE) directory.
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

## 🚀 Production Deployment

### 1. Render Server (FastAPI AI Service)

To deploy the standalone **FastAPI AI Service** microservice to production using [Render](https://render.com), follow these instructions:

#### A. Create a New Web Service on Render
1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** (top-right) and select **Web Service**.
3. Connect the GitHub repository containing this project.

#### B. Service Configuration
During the setup of the Web Service, apply the following configuration parameters:
*   **Name**: `Quarters-Management-Billing-System-FastAPI` (Or your preferred name.)
*   **Environment**: `Python`
*   **Region**: Select a region closest to your Supabase PostgreSQL instance (e.g., `Singapore` for Southeast Asia)
*   **Branch**: `master` (Or your preferred deployment branch.)
*   **Root Directory**: `ai_service` *(This is critical since the FastAPI project sits in the `ai_service/` subdirectory)*
*   **Build Command**: `pip install -r requirements.txt`
*   **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT` *(Must bind to host `0.0.0.0` and Render's dynamic `$PORT` variable)*

#### C. Environment Variables Configuration
Navigate to the **Environment** tab of the newly created Render service and add the following variables:
*   **`AI_SERVICE_ALLOWED_ORIGINS`**: Comma-separated list of origins permitted to call the AI service. Add the URL of your deployed Next.js frontend (e.g., `https://quarters-managment-billing-system.app`).
*   **`GEMINI_API_KEY_1`**: Your Google Gemini API Key. For automatic failover, you can configure additional keys under `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, etc.

#### D. Connect Next.js Frontend
Once Render completes building and running the service, copy the deployed URL (e.g., `https://qmbs-ai-service.onrender.com`).

Add this URL to your Next.js deployment environment variables (e.g., on Vercel, Netlify, or Render):
```ini
AI_SERVICE_URL="https://qmbs-ai-service.onrender.com"
```
Or:
```ini
NEXT_PUBLIC_AI_SERVICE_URL="https://qmbs-ai-service.onrender.com"
```

---

### 2. cron-job.org (Optional for Render Free Plan)

If you deploy the FastAPI AI service on a **Render Free Plan**, Render automatically spins down the web service container after 15 minutes of inactivity. The next incoming request will experience a "cold start" delay of 50 seconds or more while the instance spins back up.

To keep the FastAPI container active and prevent it from sleeping, you can set up a free pinging service on [cron-job.org](https://cron-job.org/):

#### Steps to Configure:
1. Register a free account or log in at [cron-job.org](https://cron-job.org/).
2. Navigate to the **Cronjobs** tab and click **Create Cronjob**.
3. Set the following details:
   - **Title**: `RENDER SERVER KEEP ACTIVE CRON` (Or your preferred name.)
   - **Address (URL)**: `https://Your-Render-Service-Domain.onrender.com/health` *(Replace the "https://Your-Render-Service-Domain.onrender.com" with your actual Render service domain.)*
   - **Request Method**: `GET`
   - **Schedule**: Choose **Every 10 minutes** (this runs frequently enough to beat Render's 15-minute inactivity limit).
4. Save the cron job. It will ping the `/health` endpoint every 10 minutes to ensure the server remains active.

---

### 3. Vercel Server (Next.js)

To deploy the **Next.js Web Client** frontend to production using [Vercel](https://vercel.com), follow these instructions:

#### A. Import your project to Vercel
1. Sign in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** and select **Project**.
3. Import the GitHub repository containing this project.

#### B. Project Settings
Configure the following project details during creation:
*   **Framework Preset**: `Next.js`
*   **Root Directory**: Leave as the root directory (`./` or empty) since the Next.js codebase is in the repository root.
*   **Build Command**: `prisma generate && next build` *(No need to setup in Vercel dashboard, edit the "build" section under "scripts" in "package.json" of this project if not already configured to do so. However, if you completely use these project source code directly, it should already be configured.)*

#### C. Environment Variables Configuration
Navigate to the **Environment Variables** section of the Vercel project and add the following variables:
*   **`DATABASE_URL`**: Your Supabase connection pooling database URL (using port `6543`).
*   **`DIRECT_URL`**: Your Supabase direct connection database URL (using port `5432`).
*   **`NEXT_PUBLIC_SUPABASE_URL`**: Your Supabase project API URL.
*   **`SUPABASE_SERVICE_ROLE_KEY`**: Your Supabase project service role key.
*   **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Your Supabase project anon key.
*   **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`**: Your Supabase publishable key.
*   **`SYSTEM_RESET_CRITICAL_KEY`**: Password token used for critical system resets.
*   **`AI_SERVICE_URL`**: The URL of your deployed FastAPI AI service on Render (e.g. `https://Quarters-Management-Billing-System-FastAPI.onrender.com`).
*   **`NEXT_PUBLIC_AI_SERVICE_URL`**: The same URL as above, exposed to the client side.

#### D. Deploy
Click the **Deploy** button. Vercel will provision the environment, run the database schema types generation, compile the production bundles, and launch the application.