import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { parseCtcCsv } from "../lib/csv";
import { mapCtcToInvoice } from "../lib/mapping/ctcToInvoice";

async function runVerification() {
    console.log("Starting verification...");

    const fixturesDir = path.join(process.cwd(), "fixtures");
    const templatesDir = path.join(process.cwd(), "assets", "templates");

    const csvPath = path.join(fixturesDir, "ctc_trips12_29-to-1_18.csv");
    const templatePath = path.join(templatesDir, "MEDICARETRANSITINC_20251201-20260131.xlsx");
    const outputPath = path.join(process.cwd(), "verification_output.xlsx");

    // 1. Generate Invoice (Duplicate logic from route.ts for testing core logic)
    console.log("Generating invoice from fixture...");
    const csvText = fs.readFileSync(csvPath, "utf-8");
    const records = await parseCtcCsv(csvText);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet("Invoice (2)");

    if (!worksheet) throw new Error("Template sheet missing");

    records.forEach((record, index) => {
        const invoiceRow = mapCtcToInvoice(record, index);
        const rowId = index + 2;
        const currentRow = worksheet.getRow(rowId);
        // Minimal fill for verification (we trust route.ts does styling copy, here we verify logic & structure)
        // To strictly verify template match, we should ideally use the EXACT code from route.
        // But since we can't easily import the route handler, we rely on mapCtcToInvoice being the source of truth.

        currentRow.getCell(1).value = invoiceRow.vendorName;
        currentRow.getCell(23).value = { formula: invoiceRow.totalCostFormula.substring(1) };
        // ... fill others ...
        // For specific checks (Goal 143: Total Cost formula pattern), filling just cost is enough?
        // Let's fill all to be safe.
        currentRow.getCell(2).value = invoiceRow.vendorTaxId;
        currentRow.getCell(3).value = invoiceRow.ctcTripId;
        currentRow.getCell(4).value = invoiceRow.dateOfService;
        currentRow.getCell(5).value = invoiceRow.memberLastName;
        currentRow.getCell(6).value = invoiceRow.memberFirstName;
        currentRow.getCell(7).value = invoiceRow.pickUpAddress;
        currentRow.getCell(8).value = invoiceRow.dropOffAddress;
        currentRow.getCell(9).value = invoiceRow.requestedArrivalTime;
        currentRow.getCell(10).value = invoiceRow.appointmentTime;
        currentRow.getCell(11).value = invoiceRow.actualPickupArrivalDate;
        currentRow.getCell(12).value = invoiceRow.actualPickupArrivalTime;
        currentRow.getCell(13).value = invoiceRow.actualDropOffArrivalDate;
        currentRow.getCell(14).value = invoiceRow.actualDropOffArrivalTime;
        currentRow.getCell(15).value = invoiceRow.levelOfService;
        currentRow.getCell(16).value = invoiceRow.driverName;
        currentRow.getCell(17).value = invoiceRow.driverLicenseNumber;
        currentRow.getCell(18).value = invoiceRow.vehicleVin;
        currentRow.getCell(19).value = invoiceRow.tripStatus;
        currentRow.getCell(20).value = invoiceRow.miles;
        currentRow.getCell(21).value = invoiceRow.waitTimeMinutes;
        currentRow.getCell(22).value = invoiceRow.oxygenProvided;
        currentRow.getCell(24).value = invoiceRow.comment;
        currentRow.commit();
    });

    await workbook.xlsx.writeFile(outputPath);
    console.log(`Generated: ${outputPath}`);

    // 2. Load and Verify
    console.log("Verifying generated file...");
    const checkWb = new ExcelJS.Workbook();
    await checkWb.xlsx.readFile(outputPath);
    const checkWs = checkWb.getWorksheet("Invoice (2)");

    if (!checkWs) throw new Error("FAIL: Sheet 'Invoice (2)' missing in output");
    console.log("PASS: Sheet Name");

    // Verify Headers (Row 1)
    const templateWb = new ExcelJS.Workbook();
    await templateWb.xlsx.readFile(templatePath);
    const templateWs = templateWb.getWorksheet("Invoice (2)");
    if (!templateWs) throw new Error("Template sheet missing (sanity check)");

    const headerRow = checkWs.getRow(1);
    const templateHeaderRow = templateWs.getRow(1);

    if (checkWs.columnCount !== 24 && checkWs.actualColumnCount !== 24) {
        // ExcelJS columnCount can be tricky, check distinct cells
        // But spec says 24 columns A-X.
        // We'll traverse 1 to 24.
    }

    for (let i = 1; i <= 24; i++) {
        const actual = headerRow.getCell(i).text; // Text value
        const expected = templateHeaderRow.getCell(i).text;
        if (actual !== expected) {
            throw new Error(`FAIL: Header mismatch at col ${i}. Expected '${expected}', got '${actual}'`);
        }

        // Width check
        const actualWidth = checkWs.getColumn(i).width;
        const expectedWidth = templateWs.getColumn(i).width;
        // ExcelJS preserves width if not touched.
        if (Math.abs((actualWidth || 0) - (expectedWidth || 0)) > 0.1) {
            console.warn(`WARN: Width mismatch at col ${i}. Exp ${expectedWidth} Got ${actualWidth}`);
        }
    }
    console.log("PASS: Headers A-X match");

    // Verify Formula Pattern (Row 2 to N)
    // W{row} = 18.5 + (T{row} * 1.75)
    const dataRowCount = records.length;
    for (let i = 0; i < dataRowCount; i++) {
        const rowNum = i + 2;
        const cell = checkWs.getCell(rowNum, 23); // W is 23
        const formula = cell.model.formula;
        const expected = `18.5+(T${rowNum}*1.75)`;

        if (formula !== expected) {
            throw new Error(`FAIL: Formula mismatch at row ${rowNum}. Expected '${expected}', got '${formula}'`);
        }
    }

    console.log(`PASS: Formula verified for ${dataRowCount} rows.`);
    console.log("VERIFICATION SUCCESSFUL");
}

runVerification().catch(e => {
    console.error(e);
    process.exit(1);
});
