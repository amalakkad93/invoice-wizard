"use client";

import { useState } from "react";
import Papa from "papaparse";
import { parseCtcCsv } from "@/lib/csv";
import { mapCtcToInvoice } from "@/lib/mapping/ctcToInvoice";
import { CTCTripRecord, InvoiceRow } from "@/lib/types";
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [records, setRecords] = useState<CTCTripRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; message: string }>({ type: "", message: "" });

  const [filenamePrefix, setFilenamePrefix] = useState("MEDICARETRANSITINC");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const text = await selectedFile.text();
      const parsedRecords = await parseCtcCsv(text);
      setRecords(parsedRecords);
      setFile(selectedFile);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Failed to parse CSV file." });
      setFile(null);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!file) return;

    setGenerating(true);
    setStatus({ type: "", message: "" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filenamePrefix", filenamePrefix);

      // Construct date range string if provided
      let dateRange = "";
      if (startDate && endDate) {
        // Format YYYYMMDD-YYYYMMDD
        const start = startDate.replace(/-/g, "");
        const end = endDate.replace(/-/g, "");
        dateRange = `${start}-${end}`;
      }
      formData.append("dateRange", dateRange);

      const res = await fetch("/api/generate-invoice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to generate invoice");
      }

      // Handle download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Content-Disposition usually handles filename, but we can hint it.
      // Let's rely on browser or header.
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `${filenamePrefix}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setStatus({ type: "success", message: "Invoice generated successfully!" });
    } catch (err: any) {
      console.error(err);
      setStatus({ type: "error", message: err.message || "An unexpected error occurred." });
    } finally {
      setGenerating(false);
    }
  };

  const previewRows = records.slice(0, 5).map((r, i) => mapCtcToInvoice(r, i));

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Invoice Wizard</h1>
          <p className="text-gray-500">Convert CTC CSV exports into Medicare Transit invoices.</p>
        </div>

        {/* Status Toast/Banner */}
        {status.message && (
          <div className={clsx("p-4 rounded-md flex items-center gap-2", {
            "bg-green-100 text-green-800 border border-green-200": status.type === "success",
            "bg-red-100 text-red-800 border border-red-200": status.type === "error",
          })}>
            {status.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{status.message}</span>
          </div>
        )}

        {/* Upload Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center transition-all hover:border-blue-400">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
              <UploadCloud size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Upload CSV File</h3>
              <p className="text-sm text-gray-500">Drag and drop or click to select your CTC export file</p>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading || generating}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
        </div>

        {/* Controls & Generate */}
        {records.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-end gap-6">
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Filename Prefix</label>
                <input
                  type="text"
                  value={filenamePrefix}
                  onChange={(e) => setFilenamePrefix(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Start Date (For Filename)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">End Date (For Filename)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Generating...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={18} /> Generate Invoice XLS
                </>
              )}
            </button>
          </div>
        )}

        {/* Preview Table */}
        {records.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Data Preview ({records.length} rows detected)</h3>
              <span className="text-xs text-gray-500">Showing first 5 mapped rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Trip ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Member</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Pickup</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Dropoff</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Miles</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-mono text-xs">{row.ctcTripId}</td>
                      <td className="px-4 py-3 text-gray-500">{row.dateOfService instanceof Date ? row.dateOfService.toLocaleDateString() : row.dateOfService}</td>
                      <td className="px-4 py-3 text-gray-900">{row.memberFirstName} {row.memberLastName}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={row.pickUpAddress}>{row.pickUpAddress}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={row.dropOffAddress}>{row.dropOffAddress}</td>
                      <td className="px-4 py-3 text-gray-500">
                        <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", {
                          "bg-green-100 text-green-800": row.tripStatus === "Complete",
                          "bg-red-100 text-red-800": row.tripStatus === "Cancelled",
                          "bg-yellow-100 text-yellow-800": row.tripStatus === "Dry Run",
                        })}>
                          {row.tripStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{row.miles}</td>
                      <td className="px-4 py-3 text-gray-500">{row.totalCostFormula}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
