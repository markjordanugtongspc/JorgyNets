# JorgyNets Fleet Systems

A high-performance, modern Pisonet Fleet Telemetry and Financial Ledger Management Platform built with **Tailwind CSS v4.3+**, **Flowbite UI**, **Vite**, **Vanilla JavaScript (OOP coordinators)**, and **Supabase Database**, pre-configured for zero-serverless cloud deployment on **Vercel**.

---

## 1. System Overview & Technology Stack

- **CSS & Framework**: Pure **Tailwind CSS v4.3+** utility architecture natively inside markup (`src/style.css` reserved solely for core `@theme` font tokens, system colors, datepicker fixes, and print media rules).
- **Core Architecture**: Vite bundler, pure Vanilla JavaScript with Object-Oriented Programming (coordinator classes, subchild controllers, reactive event dispatchers), Flowbite UI component engine.
- **Strict UI Policy**: SweetAlert2 is strictly deprecated; all modals, toasts, tooltips, and interactive drawers are powered by Flowbite.
- **Drawer-First UX**: Flowbite Off-Canvas Drawers act as primary overlays for create, view, edit, and configuration workflows across the platform.
- **Dual-Theme Design**: Native dark and light mode variations across every view, card, table, and print preview (`dark:bg-slate-950`, `bg-dirty-white`).
- **Typography & Brand Design System**:
  - `font-averta`: Brand marks, page titles, and table headers.
  - `font-poppins`: Base user interface, form inputs, tooltips, and drawer typography.
  - `font-money` (`Space Grotesk`, `JetBrains Mono`): Numeric telemetry, currency formatting, counters, and tabular statistics.
  - Curated Solid Color Tokens: Solid Emerald (`bg-emerald-600`), Solid Rose (`bg-rose-600`), Solid Amber (`bg-amber-500`), Solid Blue (`bg-blue-600`), and Dirty White (`#FBFBFB`).
- **Identifier Rule**: Concise 1–2 word descriptive `id` attributes on all buttons, inputs, dropdowns, and interactive widgets.
- **Automated Version Control**: `npm run build` runs `scripts/bump-version.js` to automatically increment package version numbers before building.

---

## 2. Platform Modules & Key Features

### 1. Dashboard (`/frontend/pages/dashboard/`)
- Dynamic 4-pillar Financial KPI Grid (Gross Revenue, Total Expenses, Net Profit, Fleet Status).
- Real-time interactive charts (Revenue vs Expenses weekly trend, Terminal utilization breakdown).
- Recent telemetry ledger preview and quick-action shortcuts.

### 2. Habwa Coin Harvest Ledger (`/frontend/pages/habwa/`)
- Comprehensive collection logs for coin drop harvests across all pisonet terminals.
- Alternating column tints (`bg-slate-200/50` / `dark:bg-slate-800/40`) matching Flowbite stripped-column continuous design.
- Search filter, owner dropdown filters, sortable columns, and batch action selection bar.
- Flowbite Off-Canvas Drawer for registering new harvests or editing past collections.

### 3. Operational Bills & Deductions (`/frontend/pages/bills/`)
- Expense tracking for electricity bills, fiber internet subscriptions, spare parts, and technician repairs.
- Automated ledger deductions tagged by owner and terminal unit numbers.
- Filterable status states (Audited, Pending, Paid, Recurring).

### 4. Owner Expense Requests & Advances (`/frontend/pages/requests/`)
- Dedicated portal for managing owner cash advances, maintenance requests, and attendant meal allowances.
- Approval workflow with multi-level status states (Pending, Approved, Declined).
- Quick approval and audit verification drawers.

### 5. Registered Unit Owners & Credentials (`/frontend/pages/owners/`)
- Centralized partner management tracking owner contacts, pisonet units assigned, and credentials.
- Profile view drawers with live approval triggers and status badges.
- Default credentials management and reset capabilities.

### 6. Data Exports & Print Preview (`/frontend/pages/exports/` & `src/components/exports.html`)
- **Live Document Print Preview Engine**:
  - Upper-left aligned canvas matching standard enterprise layout.
  - Header block featuring JN logo gradient badge, brand typography, official audit tags, and dynamic timestamp (12-hour GMT +08 Manila time).
  - Compact telemetry parameter grid (Report Scope, Target Fleet, Pisonet Units, Audit Period) with auto text-wrapping for long labels.
  - 4 Solid-colored Summary Ribbon Cards (Gross Coin Harvest in Emerald, Deductions in Rose, Net Payout in Amber, Audited Entries in Blue) retaining original solid fills when printed.
  - Flowbite stripped-column continuous table with doomscrolling on screen and clean 10-item pagination on print (`page-break-after: always`).
  - Centered Date & Auditor columns and compact developer credit footer.
  - `@media print` rules with `@page { margin: 0; }` and `-webkit-print-color-adjust: exact` suppressing browser URLs and keeping graphics vibrant.
- **Export Configuration Off-Canvas Drawer**:
  - Filter by Scope (All System Data, Coin Revenue, Bills, Requests, Terminals, Owners).
  - Searchable dropdown controllers with live typing and keyboard navigation.
  - Quick date presets (All Time, This Month, Last Month, This Year) + Flowbite Datepicker inputs.
  - Direct actions for Client-side CSV generation, JSON dataset export, and window print.

---

## 3. Step-by-Step Evolution & Recent Enhancements

Below is the step-by-step breakdown of how the architecture was updated and polished:

1. **Exports Layout Alignment**:
   - Replaced outdated KPI cards with the standardized upper-left layout structure matching the Owners module.
   - Decoupled the filter bar and shifted all controls into a Flowbite Off-Canvas Drawer (`id="drawer-export"`).
2. **Dynamic Reusable Component Injection**:
   - Extracted document preview markup into `src/components/exports.html` dynamically loaded via `ExportsManager.mountPrintComponent()`.
3. **Refined Preview Table UX**:
   - Converted the preview table into a continuous Flowbite stripped-column table with subtle scrollbars (`.scrollbar-subtle`).
   - Centered column 5 (Date & Auditor) for visual balance across both screen and print media.
   - Removed obsolete `id="system-badge"` and removed footer dismiss button `id="dismiss-drawer"` in favor of the clean top-right SVG button.
4. **Print Media Engine Optimization**:
   - Configured `@media print` in `src/style.css` using `@page { margin: 0; }` and `body { padding: 10mm; }` to suppress browser URL/date headers and footers.
   - Enforced `-webkit-print-color-adjust: exact !important;` so solid KPI cards and striped columns retain full color contrast on paper or PDF.
   - Replaced truncations on telemetry badges with `break-words leading-tight` to wrap lengthy names seamlessly.
   - Compacted header, KPI cards, and developer credits so the first 10 rows, summary cards, and header fit neatly without triggering accidental early page breaks.
5. **Numerical Precision & Animations**:
   - Fixed decimal representation to two places (`.00`, `.73`, `.86`) across all summaries.
   - Enhanced `MoneyCounter` in `src/scripts/modules/animations.js` for decimal rolls.

---

## 4. Quick Start & Development Guide

### 1. Prerequisites
- **Node.js** (v18.0.0 or later recommended)
- **Git**

### 2. Environment Configuration
Copy the `.env.example` file to create your local `.env`:
```bash
# Windows (PowerShell)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```
Ensure your Supabase keys are configured in `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Development Mode (Instant Hot-Reload)
```bash
npm run dev
```
- Local URL: `http://localhost:5173`
- Network URL: Displayed in terminal for live testing on mobile devices and tablets on the same Wi-Fi.

### 5. Production Build & Version Increment
```bash
npm run build
```
- Automatically triggers `scripts/bump-version.js` to bump version numbers.
- Compiles optimized and minified distribution assets into `/dist`.

### 6. Preview Production Build Locally
```bash
npm run preview
```
- Serves the compiled `/dist` bundle locally at `http://localhost:4173`.

---

## 5. Directory & File Structure

```
JorgyNets/
├── index.html                           # Root Login Entry Page (Pure HTML & JS)
├── vercel.json                          # Vercel deployment routes and clean URL rewrites
├── vite.config.js                       # Vite multi-page Rollup config + host & polling watch
├── package.json                         # Scripts & dependencies
├── .env                                 # Supabase credentials (git-ignored)
├── .env.example                         # Sanitized credentials template
│
├── frontend/
│   └── pages/
│       ├── bills/                       # Operational bills & expenses ledger
│       ├── dashboard/                   # Main financial telemetry dashboard
│       ├── exports/                     # Data exports & print preview engine
│       ├── habwa/                       # Habwa coin harvest collection logs
│       ├── owners/                      # Pisonet unit owners & access management
│       └── requests/                    # Owner expense requests & advances
│
├── src/
│   ├── components/                      # Reusable HTML Component Partials
│   │   ├── exports.html                 # Custom print / export document template
│   │   ├── settings.html                # System settings modal
│   │   └── sidebar.html                 # Navigation sidebar with collapse support
│   │
│   ├── scripts/
│   │   ├── main.js                      # Central script loader & component injector
│   │   └── modules/                     # Modular OOP / Functional JavaScript
│   │       ├── animations.js            # Money counter roll & UI transitions
│   │       ├── auth.js                  # User authentication & session management
│   │       ├── charts.js                # Chart rendering controllers
│   │       ├── dashboard.js             # Dashboard controller & Supabase queries
│   │       ├── drawer.js                # Flowbite Off-Canvas drawer controllers
│   │       ├── exports.js               # Exports manager, CSV/JSON downloads & print
│   │       ├── injector.js              # Dynamic HTML component injector
│   │       ├── supabase.js              # Direct Supabase browser client
│   │       ├── tables.js                # Table sorting, search & pagination
│   │       └── theme.js                 # Dark & Light mode controller
│   │
│   └── style.css                        # Tailwind CSS v4 & Flowbite imports & print rules
│
├── public/                              # Static media assets (logos, icons, audio)
└── scripts/
    └── bump-version.js                  # Production pipeline version bump script
```

---

## 6. Helpful NPM Scripts Reference

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts dev server with instant hot-reload and network hosting |
| `npm run dev -- --host` | Explicitly exposes dev server to all network interfaces |
| `npm run build` | Auto-increments version and compiles production bundles |
| `npm run preview` | Spins up a local web server to test the compiled `/dist` build |
| `npm run server` | (Optional) Starts Node.js backend server for direct TCP socket testing |

---

## 7. Connecting Your Remote Git Repository

When you create your remote repository on GitHub, GitLab, or Bitbucket:

```bash
# 1. Add your remote repository URL
git remote add origin https://github.com/<your-username>/JorgyNets.git

# 2. Push all code to main branch
git push -u origin main
```

---

## 8. Author & Developer Credits

- **System Architect & Developer**: Mark Jordan Ugtong
- **Copyright**: &copy; 2026 JorgyNets Fleet Systems. All Rights Reserved.
