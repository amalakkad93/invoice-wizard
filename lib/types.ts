export interface CTCTripRecord {
    Date: string;
    Pickup: string; // Time (1st column named "Pickup")
    Appt: string;
    First: string;
    Last: string;
    "Pickup_Address"?: string; // Renamed from 2nd "Pickup"
    Dropoff: string;
    "Pickup Arrive": string;
    "Dropoff Arrive": string;
    Comments: string;
    Authorization: string;
    Distance: string; // "78.25"
    Space: string; // "WCH"
    Driver: string;
    Canceled: string; // "False" or "True" or ""
    "Dry Run": string;
    "Trip Id": string;
    [key: string]: string | undefined; // Allow loose access
}

export interface InvoiceRow {
    vendorName: string; // A
    vendorTaxId: string | number; // B
    ctcTripId: string; // C
    dateOfService: Date | string; // D
    memberLastName: string; // E
    memberFirstName: string; // F
    pickUpAddress: string; // G
    dropOffAddress: string; // H
    requestedArrivalTime: string; // I (Keep as string "HH:MM AM/PM" or let Excel handle it?)
    appointmentTime: string; // J
    actualPickupArrivalDate: Date | string; // K
    actualPickupArrivalTime: string; // L
    actualDropOffArrivalDate: Date | string; // M
    actualDropOffArrivalTime: string; // N
    levelOfService: string; // O
    driverName: string; // P
    driverLicenseNumber: string; // Q
    vehicleVin: string; // R
    tripStatus: string; // S
    miles: number; // T
    waitTimeMinutes: number; // U
    oxygenProvided: boolean | string; // V
    totalCostFormula: string; // W (Formula)
    comment: string; // X
}
