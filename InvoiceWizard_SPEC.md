what is the name of this AI instructions md file:


You are Antigravity. Build a production-ready Next.js (App Router) + TypeScript web app that converts a CTC trips export into our exact invoice spreadsheet format.

GOAL
- User uploads an input file that matches the columns/structure of: "ctc_trips12_29-to-1_18" (CSV).
- App generates and downloads a new .xlsx that matches the invoice template EXACTLY: "MEDICARETRANSITINC_20251201-20260131.xlsx" (same sheet name, same headers, same column order, same formatting/widths, same formulas).

FIXTURES (already available in the workspace)
- Input CSV: /mnt/data/ctc_trips12_29-to-1_18.csv
- Template XLSX: /mnt/data/MEDICARETRANSITINC_20251201-20260131.xlsx
Copy these into the repo under /fixtures and /assets/templates so the app works after deploy.

HARD REQUIREMENTS
1) Output spreadsheet MUST be created by loading the template XLSX and filling rows under the header (row 1).
   - Do NOT “rebuild” the workbook from scratch. Use the template as the canonical source of formatting.
2) Keep the sheet name exactly as the template: "Invoice (2)".
3) The output must have the exact same 24 columns A–X with these headers (row 1):
   A Vendor Name
   B Vendor Tax ID
   C CTC Trip ID #
   D Date of Service
   E Member Last Name
   F Member First Name
   G Pick Up Address
   H Drop Off Address
   I Requested Arrival Time
   J Appointment Time
   K Actual Pickup Arrival Date
   L Actual Pickup Arrival Time
   M Actual Drop off Arrival Date
   N Actual Drop off Arrival Time
   O Level of Service
   P Driver Name
   Q Driver License Number
   R Vehicle VIN
   S Trip Status
   T Miles
   U Wait Time Minutes
   V Oxygen Provided
   W Total Cost
   X Comment

4) Preserve styles (fonts, fills, borders), column widths, row heights, and number/date/time formats from the template.
5) Preserve the Total Cost formula pattern exactly like template row 2:
   W{row} = 18.5 + (T{row} * 1.75)
   (i.e., formula string exactly "=18.5+(T{row}*1.75)")

INPUT CSV NOTES (ctc_trips12_29-to-1_18.csv headers)
The input CSV has 58 columns; key ones you will use:
- Date
- Pickup (time)  [this is requested arrival time]
- Appt (time)
- First
- Last
- Pickup (address)  [there are two “Pickup” columns; the address one is later in the file]
- Dropoff (address)
- Pickup Arrive (time)
- Dropoff Arrive (time)
- Comments
- Authorization (contains values like "CTC-22730242-B" and is the best source for "CTC Trip ID #")
- Distance (miles)
- Space (ex: "WCH")
- Driver (if present)
- Canceled / Dry Run (if present) for Trip Status
- Trip Id (numeric fallback if Authorization missing)

MAPPING LOGIC (CSV -> Template columns)
Populate each output row (starting at row 2) from each CSV record:
A Vendor Name: constant "MediCare Transit Inc"
B Vendor Tax ID: constant 332165083
C CTC Trip ID #: prefer Authorization IF it starts with "CTC-" else fallback to Trip Id (string)
D Date of Service: Date (as Excel date)
E Member Last Name: Last
F Member First Name: First
G Pick Up Address: Pickup ADDRESS column (not the Pickup time column)
H Drop Off Address: Dropoff address
I Requested Arrival Time: Pickup TIME column
J Appointment Time: Appt (time)
K Actual Pickup Arrival Date: same as Date of Service (Date)
L Actual Pickup Arrival Time: Pickup Arrive (time)
M Actual Drop off Arrival Date: same as Date of Service (Date)
N Actual Drop off Arrival Time: Dropoff Arrive (time)
O Level of Service: map from Space:
   - "WCH" -> "Wheel Chair Van"
   - else leave blank (but keep cell formatting)
P Driver Name: Driver (string)
Q Driver License Number: leave blank
R Vehicle VIN: leave blank
S Trip Status:
   - if Canceled has a truthy value -> "Cancelled"
   - else if Dry Run truthy -> "Dry Run"
   - else "Complete"
T Miles: Distance (number)
U Wait Time Minutes: default 15 (number) unless the CSV has a clear wait-time field (if found, use it)
V Oxygen Provided: default FALSE (boolean/string consistent with template)
W Total Cost: formula "=18.5+(T{row}*1.75)"
X Comment: Comments (string)

CSV PARSING REQUIREMENTS
- The CSV may have odd quoting/commas; do NOT use a fragile parser.
- Use PapaParse (server-side) or a robust Node CSV parser that can handle quoted fields and skip blank lines.

XLSX GENERATION REQUIREMENTS
- Use exceljs (preferred) on the server to load the template and write a new workbook while preserving styles.
- For each generated row:
  - Copy styles from template row 2 across A–X, then overwrite values/formulas.
  - Ensure date/time cells match template formatting.
- The API must return a downloadable .xlsx blob with the correct MIME type.

APP UX
- Single page: Upload input file + “Generate Invoice” button.
- Show:
  - file name, detected rows count, and a small preview of the first 5 mapped rows (rendered in a table UI).
  - loading state: disable inputs while generating.
  - clear success/failure toast messages with error detail if parsing fails.
- Allow user to set output filename prefix (default: MEDICARETRANSITINC) and invoice period (start/end) used ONLY for filename:
  default output filename: MEDICARETRANSITINC_YYYYMMDD-YYYYMMDD.xlsx
  (format identical to the example naming convention)

TECH STACK
- Next.js App Router + TypeScript
- Tailwind + shadcn/ui for UI
- Route handler: app/api/generate-invoice/route.ts (runtime: nodejs)
- No database needed

PROJECT STRUCTURE
- /app/page.tsx (upload UI)
- /app/api/generate-invoice/route.ts (server generation)
- /lib/mapping/ctcToInvoice.ts (pure mapping logic + type guards)
- /assets/templates/MEDICARETRANSITINC_20251201-20260131.xlsx
- /fixtures/ctc_trips12_29-to-1_18.csv (dev fixture)

VERIFICATION (MANDATORY)
Add a script: /scripts/verify-template-match.ts that:
- loads the template and a newly generated output
- verifies:
  - same sheet name
  - header row values A1–X1 exactly match
  - column count is 24
  - column widths match template
  - Total Cost formula in W2..Wn matches pattern
Run it after generation in dev (or at least provide instructions).

DELIVERABLE
- Implement the full app, wired end-to-end, with clean typing and error handling.
- Include README.md with:
  - dev run commands
  - how to generate using the fixture files
  - how to run verification script
