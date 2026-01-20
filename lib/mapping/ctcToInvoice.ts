import { CTCTripRecord, InvoiceRow } from "../types";

// Helper to parse "MM/DD/YYYY" to Date object
function parseDate(dateStr: string): Date | string {
    if (!dateStr) return "";
    const [m, d, y] = dateStr.split("/");
    if (!m || !d || !y) return dateStr;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

// Helper to parse numeric miles
function parseMiles(dist: string): number {
    const parsed = parseFloat(dist);
    return isNaN(parsed) ? 0 : parsed;
}

export function mapCtcToInvoice(record: CTCTripRecord, rowIndex: number): InvoiceRow {
    // Determine Trip ID
    // "prefer Authorization IF it starts with 'CTC-' else fallback to Trip Id"
    let ctcTripId = record.Authorization || "";
    if (!ctcTripId.startsWith("CTC-")) {
        ctcTripId = record["Trip Id"] || ctcTripId; // Fallback
    }

    // Determine Level of Service
    // "WCH" -> "Wheel Chair Van", else blank
    const space = record.Space?.trim().toUpperCase();
    const levelOfService = space === "WCH" ? "Wheel Chair Van" : "";

    // Determine Trip Status
    // if Canceled truthy -> "Cancelled" (Note: input is "False" string likely)
    // else if Dry Run truthy -> "Dry Run"
    // else "Complete"
    const isCanceled = isTruthy(record.Canceled);
    const isDryRun = isTruthy(record["Dry Run"]);

    let tripStatus = "Complete";
    if (isCanceled) {
        tripStatus = "Cancelled";
    } else if (isDryRun) {
        tripStatus = "Dry Run";
    }

    // Wait time default 15
    const waitTimeMinutes = 15;

    // Oxygen default FALSE
    const oxygenProvided = "FALSE";

    // Total Cost Formula
    // W{row} = 18.5 + (T{row} * 1.75)
    // Row in Excel is 1-based. Data start at row 2. passed rowIndex is 0-based index of data?
    // If rowIndex is 0 (the first data row), it goes to Excel Row 2.
    // So Excel Row = rowIndex + 2
    const excelRow = rowIndex + 2;
    const totalCostFormula = `=18.5+(T${excelRow}*1.75)`;

    // Dates
    const dateService = parseDate(record.Date);

    // Address: Prefer the renamed "Pickup_Address" if available, else fallback to standard "Pickup" if logic fails elsewhere
    // But we rely on the parser to rename the 2nd Pickup (address) to "Pickup_Address"
    const pickupAddress = record["Pickup_Address"] || record.Pickup || "";
    // Wait, if parser doesn't rename, record.Pickup is TIME. Logic must overlap.
    // We assume parser handles it. If not, this might put Time in Address. 
    // For now, trusting the parser logic we will write.

    return {
        vendorName: "MediCare Transit Inc",
        vendorTaxId: 332165083,
        ctcTripId: ctcTripId,
        dateOfService: dateService,
        memberLastName: record.Last || "",
        memberFirstName: record.First || "",
        pickUpAddress: pickupAddress,
        dropOffAddress: record.Dropoff || "",
        requestedArrivalTime: record.Pickup || "", // The first "Pickup" column (Time)
        appointmentTime: record.Appt || "",
        actualPickupArrivalDate: dateService, // "same as Date of Service"
        actualPickupArrivalTime: record["Pickup Arrive"] || "",
        actualDropOffArrivalDate: dateService, // "same as Date of Service"
        actualDropOffArrivalTime: record["Dropoff Arrive"] || "",
        levelOfService: levelOfService,
        driverName: record.Driver || "",
        driverLicenseNumber: "",
        vehicleVin: "",
        tripStatus: tripStatus,
        miles: parseMiles(record.Distance),
        waitTimeMinutes: waitTimeMinutes,
        oxygenProvided: oxygenProvided,
        totalCostFormula: totalCostFormula,
        comment: record.Comments || "",
    };
}

function isTruthy(val: string | undefined): boolean {
    if (!val) return false;
    const v = val.trim().toLowerCase();
    return v === "true" || v === "yes" || v === "1";
}
