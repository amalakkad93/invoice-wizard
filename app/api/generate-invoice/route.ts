import { NextRequest, NextResponse } from "next/server";
import path from "path";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { mapCtcToInvoice } from "@/lib/mapping/ctcToInvoice";
import { CTCTripRecord, InvoiceRow } from "@/lib/types";
import { parseCtcCsv } from "@/lib/csv";

// Maximum rows to process just in case
// const MAX_ROWS = 2000;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const filenamePrefix = (formData.get("filenamePrefix") as string) || "MEDICARETRANSITINC";
        const dateRange = (formData.get("dateRange") as string) || ""; // Format: YYYYMMDD-YYYYMMDD

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Read file text
        const csvText = await file.text();

        // Parse CSV
        const records = await parseCtcCsv(csvText);
        if (records.length === 0) {
            return NextResponse.json({ error: "No records found in CSV" }, { status: 400 });
        }

        // Load Template
        const templatePath = path.join(process.cwd(), "assets", "templates", "MEDICARETRANSITINC_20251201-20260131.xlsx");
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);

        const worksheet = workbook.getWorksheet("Invoice (2)");
        if (!worksheet) {
            return NextResponse.json({ error: "Template sheet 'Invoice (2)' not found" }, { status: 500 });
        }

        // Template row to copy styles from is Row 2
        const templateRow = worksheet.getRow(2);

        // Iterate and fill
        records.forEach((record, index) => {
            const invoiceRow = mapCtcToInvoice(record, index);
            const rowId = index + 2; // Rows start at 2 (1 is header)
            const currentRow = worksheet.getRow(rowId);

            // Copy styles from template row
            // Note: ExcelJS acts weird if we just copy the row object. 
            // Better to iterate columns or copy specific style properties.
            // Or simply assume the template has enough pre-styled rows? No spec says "Copy styles from template row 2 across A-X".

            // We will perform a cell-by-cell copy of style from row 2 to current row
            // Iterate columns A (1) to X (24)
            for (let col = 1; col <= 24; col++) {
                const templateCell = templateRow.getCell(col);
                const targetCell = currentRow.getCell(col);

                targetCell.style = templateCell.style;
                targetCell.numFmt = templateCell.numFmt; // Explicitly ensure number format is copied

                // Also copy borders, fonts, fills specifically if style object isn't enough (usually style includes them)
            }

            // Fill data
            currentRow.getCell(1).value = invoiceRow.vendorName;
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
            currentRow.getCell(23).value = { formula: invoiceRow.totalCostFormula.substring(1) }; // ExcelJS formulas exclude leading = usually? No, value = { formula: ... }
            currentRow.getCell(24).value = invoiceRow.comment;

            currentRow.commit();
        });

        // Generate output filename
        const outFilename = `${filenamePrefix}_${dateRange}.xlsx`;

        // Write to buffer
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${outFilename}"`,
            },
        });

    } catch (error) {
        console.error("Error generating invoice:", error);
        return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
    }
}
