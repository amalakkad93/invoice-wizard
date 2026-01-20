# Invoice Wizard

A Next.js application to convert CTC trip CSV exports into Medicare Transit Inc. formatted Excel invoices.

## Features
- **CSV Parsing**: robust parsing of CTC export CSVs using `papaparse`.
- **Excel Generation**: exact replication of the "Invoice (2)" template layout, styles, and formulas using `exceljs`.
- **Preview**: Client-side preview of the first 5 mapped rows before generation.
- **Secure**: All processing happens in logic, no external database required.

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Generating an Invoice
1. Open the app.
2. Upload a CTC trips CSV file (e.g., from `fixtures/`).
3. Verify the preview data in the table.
4. Click "Generate Invoice XLS".
5. The file will download with the default prefix.

## Verification
To verify that the generated output strictly matches the required template format:
```bash
# Verify the core generation logic
npx tsx scripts/verify-template-match.ts
```
This script generates a test invoice from `fixtures/ctc_trips12_29-to-1_18.csv` and compares it against `assets/templates/MEDICARETRANSITINC_20251201-20260131.xlsx`.
