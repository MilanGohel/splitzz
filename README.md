<div align="center">

# 💸 Splitzz

**Smart, effortless group expense sharing and debt simplification.**

Splitzz is a modern, full-stack expense sharing application built for roommates, trips, dinners, and group projects. Say goodbye to messy spreadsheets, complicated debt webs, and awkward money talks.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-green?logo=drizzle)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-336791?logo=postgresql)](https://neon.tech/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-CSS_v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Jest-120%20passed-brightgreen?logo=jest)](https://jestjs.io/)

[Features](#-feature-showcase) • [Tech Stack](#-tech-stack) • [Database Architecture](#-database-architecture) • [Getting Started](#-getting-started) • [API Documentation](#-api-documentation) • [Testing](#-testing)

</div>

---

## 🌟 Feature Showcase

### 1. Flexible Split Options
Splitzz accommodates any sharing scenario:
- **Equal Split**: Divide expenses evenly across selected group members with remainder cent distribution.
- **Exact / Unequal Split**: Manually allocate exact rupee or cent amounts per member with real-time validation.
- **Percentage Split**: Split costs by percentage (e.g. 60% / 40%) with live total validation.
- **Shares / Ratio Split**: Allocate by relative weights or shares (e.g. 2 parts for a couple, 1 part for a single guest).

### 2. Debt Simplification Algorithm
Without simplification, a group of 5 friends can generate up to 10 overlapping debt relationships. Splitzz implements a greedy net-balance graph simplification algorithm that reduces total transactions to the mathematical minimum ($N - 1$), minimizing unnecessary back-and-forth payments. Toggleable per-group at any time.

### 3. Smart Receipt Scanning (AI Vision & OCR)
- Upload receipt photos directly in the **Add Expense** modal.
- Automatically extracts **Merchant**, **Total Amount**, **Date**, **Category**, and individual **Line Items**.
- Uses resilient heuristic OCR extraction with optional Google Gemini Vision fallback.
- Auto-populates the expense form and recalculates member splits in one click.

### 4. UPI & Digital Payment Deep Links
- Settle debts instantly via Unified Payments Interface (UPI).
- One-click launch into UPI apps: **Google Pay**, **PhonePe**, **Paytm**, **CRED**, or **BHIM**.
- Deep-link format: `upi://pay?pa={upiId}&pn={name}&am={amount}&cu=INR`.
- Dynamic on-screen **QR code preview** for settling up on desktop or in-person.
- **Copy Payment Link** button for sharing over messaging apps.

### 5. Settlement Nudges & Reminders
- Friendly reminders for members who owe you money (`RECEIVABLE`).
- One-click **Remind** button copies a polite, formatted settlement message ready to paste into WhatsApp, SMS, or Slack:
  > *"Hey Alex, just a friendly reminder to settle ₹450.00 on Splitzz for Goa Trip!"*

### 6. Role-Based Group Management
- **Owner & Member Roles**: Group creators retain ownership controls.
- **Member Management**: Add members by searching email or copying invite links.
- **Safe Group Leave**: Members can leave anytime once their balance is settled to ₹0.00.
- **Ownership Transfer**: If the owner leaves, ownership is safely transferred to another active member.

### 7. Real-Time Balances & Activity Audit Feed
- View net balances (*You are owed ₹X* or *You owe ₹Y*) updated instantly.
- Comprehensive activity history logging expense creations, updates, settlements, member changes, and debt simplification toggles.

### 8. Export to CSV
- One-click export of group expense data into formatted CSV files.
- Includes Date, Description, Category, Paid By, Total Amount, and Member Shares for accounting or archiving.

### 9. Modern UI with Dark / Light Mode
- Built with **Tailwind CSS v4** and **Radix UI** primitives.
- Native system, light, and dark theme support via `next-themes`.

---

## 🛠️ Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | [Next.js (App Router)](https://nextjs.org/) | `16.0.10` | Full-stack React framework with Turbopack |
| **UI Library** | [React](https://react.dev/) | `19.2.1` | Declarative UI rendering & Server/Client components |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `v4` | Utility-first styling with modern CSS variables |
| **Component Kit** | [Radix UI](https://www.radix-ui.com/) | Latest | Accessible, unstyled headless UI primitives |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) | `0.41.0` | Type-safe SQL query builder and schema management |
| **Database** | [Neon PostgreSQL](https://neon.tech/) | Serverless | Serverless PostgreSQL with connection pooling |
| **Authentication** | [Better-Auth](https://better-auth.com/) | `1.4.7` | Secure cookie/session authentication & OAuth |
| **State Management**| [Zustand](https://zustand-demo.pmnd.rs/) | `5.0.9` | Lightweight reactive client store |
| **Validation** | [Zod](https://zod.dev/) | `4.2.1` | End-to-end schema validation |
| **Icons & Alerts** | [Lucide React](https://lucide.dev/) & [Sonner](https://sonner.emilkowal.ski/) | Latest | Modern icons & toast notification system |
| **Testing** | [Jest](https://jestjs.io/) & [ts-jest](https://kulshekhar.github.io/ts-jest/) | `30.2.0` | Comprehensive unit and integration test suite |

---

## 🗄️ Database Architecture

Splitzz utilizes a relational schema optimized for high concurrency, financial precision (storing cents as integers), and idempotent settlements.

```
┌────────────────┐       ┌─────────────────┐       ┌────────────────┐
│      user      │◀─────▶│  group_members  │◀─────▶│     groups     │
└────────────────┘       └─────────────────┘       └────────────────┘
        │                                                  │
        │ paid_by                                          │ group_id
        ▼                                                  ▼
┌────────────────┐       ┌─────────────────┐       ┌────────────────┐
│    expenses    │◀─────▶│  expense_shares │       │  settlements   │
└────────────────┘       └─────────────────┘       └────────────────┘
        │                                                  │
        └────────────────────────┬─────────────────────────┘
                                 ▼
                     ┌───────────────────────┐
                     │      activities       │
                     └───────────────────────┘
```

### Table Schema Summary

- **`user`**: User accounts with Google OAuth & credential support (`id`, `name`, `email`, `image`).
- **`groups`**: Expense groups (`id`, `name`, `description`, `owner_id`, `currency`, `simplify_debts`).
- **`group_members`**: Membership join table (`id`, `group_id`, `user_id`, unique composite key).
- **`expenses`**: Group expenses (`id`, `group_id`, `paid_by`, `total_amount` in cents, `description`, `category`).
- **`expense_shares`**: Split shares per member (`id`, `expense_id`, `user_id`, `share_amount` in cents).
- **`settlements`**: Direct debt settlement records (`id`, `group_id`, `from_user_id`, `to_user_id`, `amount` in cents).
- **`activities`**: Audit event stream (`id`, `group_id`, `user_id`, `type`, `metadata`).
- **`idempotency_keys`**: Prevents duplicate settlement and expense charge execution on unstable connections.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.18 or higher (v20+ recommended)
- **PostgreSQL**: Local Postgres instance or a free [Neon](https://neon.tech/) serverless database
- **Package Manager**: `npm`, `pnpm`, or `bun`

### 1. Clone & Install
```bash
git clone https://github.com/MilanGohel/splitzz.git
cd splitzz
npm install
```

### 2. Environment Variables Setup
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://user:password@ep-cool-db.region.neon.tech/splitzz?sslmode=require"

# Better Auth
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-super-secret-random-32-char-key"

# Google OAuth (Optional for Google Sign-In)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Receipt Scanner (Optional - uses smart heuristic parser if not provided)
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Push Database Schema
Push the Drizzle ORM schema to your PostgreSQL database:
```bash
npx drizzle-kit push
```
Or generate and run migrations:
```bash
npx drizzle-kit generate
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Documentation

### Groups
- `GET /api/groups` — List all groups for the authenticated user.
- `POST /api/groups` — Create a new group.
- `GET /api/groups/[groupId]` — Retrieve group details and members.
- `GET /api/groups/[groupId]/balances` — Calculate net balances across all members.
- `GET /api/groups/[groupId]/debts` — Retrieve simplified or direct settlement recommendations.
- `PATCH /api/groups/[groupId]/simplify-debts` — Toggle debt simplification on or off.

### Group Members
- `GET /api/groups/[groupId]/members` — List members in a group.
- `POST /api/groups/[groupId]/members` — Add a member by email or user ID.
- `DELETE /api/groups/[groupId]/members/[memberId]` — Remove a member or leave group (requires zero balance).

### Expenses
- `GET /api/groups/[groupId]/expenses` — Paginated list of expenses with optional category and date filters.
- `POST /api/groups/[groupId]/expenses` — Create a new expense with custom split shares.
- `GET /api/expenses/[expenseId]` — Retrieve single expense details.
- `PUT /api/expenses/[expenseId]` — Update an expense and adjust split shares.
- `DELETE /api/expenses/[expenseId]` — Delete an expense and restore balances.

### Settlements
- `GET /api/groups/[groupId]/settlements` — List past settlements for a group.
- `POST /api/groups/[groupId]/settlements` — Record a debt settlement between two members (idempotent).

### Receipt Scanner
- `POST /api/receipts/scan` — Accepts `image` via `multipart/form-data` or JSON base64. Returns extracted merchant, total amount, category, date, and line items.

### Activities & Search
- `GET /api/activities` — Fetch recent activity events across user groups.
- `GET /api/users/search?q={query}` — Search users by name or email for group invitations.
- `GET /api/dashboard` — Summary metrics for the user's dashboard.

---

## 🧪 Testing

Splitzz includes a comprehensive test suite covering schemas, API routes, calculation logic, and end-to-end flows.

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run E2E flow tests
npm run test:e2e

# Run with test coverage report
npm run test:coverage
```

Current test status: **10 test suites, 120 tests passing**.

---

## 📄 License
This project is licensed under the MIT License.
