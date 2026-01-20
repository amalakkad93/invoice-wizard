import Papa from "papaparse";
import { CTCTripRecord } from "./types";

export function parseCtcCsv(csvText: string): Promise<CTCTripRecord[]> {
    return new Promise((resolve, reject) => {
        const headerCounts: Record<string, number> = {};

        Papa.parse<CTCTripRecord>(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => {
                const h = header.trim();
                if (headerCounts[h] !== undefined) {
                    headerCounts[h]++;
                    // Specific renaming for known duplicates
                    if (h === "Pickup") return "Pickup_Address";
                    return `${h}_${headerCounts[h]}`;
                }
                headerCounts[h] = 0;
                return h;
            },
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn("CSV Parse Errors:", results.errors);
                }
                resolve(results.data);
            },
            error: (error: Error) => { // Type definition for error callback might differ in types, but Error is safe
                reject(error);
            },
        });
    });
}
