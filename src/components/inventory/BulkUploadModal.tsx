"use client";

import React, { useState, useRef } from "react";
import { useStore } from "@/context/StoreContext";
import { Product } from "@/types";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Table as TableIcon,
  RefreshCw,
} from "lucide-react";
import { formatBDT } from "@/utils/formatters";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkUploadModal({ isOpen, onClose }: BulkUploadModalProps) {
  const { bulkAddProducts } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parseError, setParseError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  // Download Sample CSV template
  const handleDownloadTemplate = () => {
    const csvContent =
      "name,bengaliName,category,barcode,sku,publisher,bookClass,subject,editionYear,buyPrice,mrp,stockQty,minStockAlert,unit,imageUrl\n" +
      '"Panjeree SSC Physics Guide 2026","পাঞ্জেরী এসএসসি পদার্থবিজ্ঞান গাইড","book","8942001","PAN-SSC-PHY","Panjeree","Class 10 (SSC)","Physics","2026",310,480,25,5,"Piece","https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200"\n' +
      '"Lecture HSC Bangla 1st Paper","লেকচার এইচএসসি বাংলা ১ম পত্র","book","8942002","LEC-HSC-BAN","Lecture","HSC 1st Year","Bangla","2026",280,440,30,5,"Piece",""\n' +
      '"Matador Ball Pen 0.5 Black Box (20 pcs)","ম্যাটাডোর অল-টাইম বলপেন বক্স","stationery","8943001","PEN-MAT-05","","","General","2026",110,140,50,10,"Box",""\n' +
      '"Standard Practical Notebook (Physics)","ব্যবহারিক নোটবুক পদার্থবিজ্ঞান","stationery","8943002","KHT-PRAC-01","","Class 10 (SSC)","Practical","2026",45,75,40,10,"Piece",""';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sr_books_bulk_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV string into array of objects
  const parseCSV = (text: string) => {
    setParseError("");
    setSuccessCount(null);
    try {
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        setParseError("CSV must contain at least a header row and 1 data row.");
        setParsedRows([]);
        return;
      }

      // Helper to parse line accounting for quotes
      const parseLine = (line: string) => {
        const result: string[] = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(cur.trim());
            cur = "";
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result.map((col) => col.replace(/^"(.*)"$/, "$1"));
      };

      const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        if (values.length === 0 || (values.length === 1 && !values[0])) continue;

        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || "";
        });

        // Map into standard Product shape
        const name = rowObj.name || rowObj["book name"] || rowObj.title;
        if (!name) continue;

        const barcode =
          rowObj.barcode || `894${Math.floor(100000 + Math.random() * 900000)}`;
        const sku = rowObj.sku || `SKU-${Date.now().toString().slice(-4)}-${i}`;
        const buyPrice = Number(rowObj.buyprice || rowObj["buy price"] || rowObj.cost || 0);
        const mrp = Number(rowObj.mrp || rowObj["sale price"] || rowObj.price || 0);
        const stockQty = Number(rowObj.stockqty || rowObj.stock || rowObj.quantity || 10);
        const minStockAlert = Number(rowObj.minstockalert || rowObj.minstock || 5);
        const category =
          (rowObj.category?.toLowerCase() === "stationery" ? "stationery" : "book") as "book" | "stationery";

        rows.push({
          name,
          bengaliName: rowObj.bengaliname || rowObj["bengali name"] || "",
          category,
          barcode,
          sku,
          publisher: rowObj.publisher || "Panjeree",
          bookClass: rowObj.bookclass || rowObj.class || "General",
          subject: rowObj.subject || "General",
          editionYear: rowObj.editionyear || "2026",
          buyPrice,
          mrp,
          stockQty,
          minStockAlert,
          unit: rowObj.unit || "Piece",
          imageUrl: rowObj.imageurl || rowObj.image || undefined,
        });
      }

      if (rows.length === 0) {
        setParseError("No valid rows could be extracted from this CSV.");
      } else {
        setParsedRows(rows);
      }
    } catch (e: any) {
      console.error(e);
      setParseError(`CSV Parsing error: ${e.message || "Invalid formatting"}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseCSV(content);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setParseError("");

    try {
      const count = await bulkAddProducts(parsedRows);
      setSuccessCount(count);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setParseError(`Failed to import to database: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-white">
                বাল্ক আপলোড সিস্টেম (Bulk Import Books &amp; Stationery)
              </h3>
              <p className="text-[11px] text-slate-400">
                Upload CSV file to add or update hundreds of books directly into Supabase DB.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title="Download CSV sample file"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Template</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Status Alerts */}
          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs sm:text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">
                  সফলভাবে {successCount} টি বই/পণ্য ডাটাবেজে সংরক্ষণ করা হয়েছে!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Products synced with live Supabase PostgreSQL database.
                </p>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 border-2 border-dashed border-slate-300 rounded-xl p-5 text-center flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/70 transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700">Click to Select CSV File</p>
              <p className="text-[11px] text-slate-500 mt-1">.csv format supported</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="md:col-span-2 flex flex-col">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Or Paste CSV Content Directly / সরাসরি CSV পেস্ট করুন:
              </label>
              <textarea
                rows={5}
                placeholder="name,bengaliName,category,barcode,sku,publisher,buyPrice,mrp,stockQty..."
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parseCSV(e.target.value);
                }}
                className="w-full flex-1 p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <TableIcon className="w-4 h-4 text-slate-600" />
                  <span>Preview ({parsedRows.length} Products to Import)</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Duplicates by barcode will update existing stock &amp; price.
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Title</th>
                      <th className="p-2">Class / Type</th>
                      <th className="p-2">Publisher</th>
                      <th className="p-2">Cost (ক্রয়)</th>
                      <th className="p-2">MRP (বিক্রয়)</th>
                      <th className="p-2">Stock</th>
                      <th className="p-2">Barcode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2">
                          <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                            {row.name}
                          </p>
                          {row.bengaliName && (
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                              {row.bengaliName}
                            </p>
                          )}
                        </td>
                        <td className="p-2 text-slate-600">{row.bookClass || row.category}</td>
                        <td className="p-2 text-slate-600">{row.publisher || "-"}</td>
                        <td className="p-2 font-mono text-slate-700">{formatBDT(row.buyPrice)}</td>
                        <td className="p-2 font-mono font-bold text-slate-900">{formatBDT(row.mrp)}</td>
                        <td className="p-2 font-mono text-slate-800">{row.stockQty} {row.unit}</td>
                        <td className="p-2 font-mono text-[11px] text-slate-500">{row.barcode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <p className="text-[11px] text-slate-400 text-right">
                  Showing first 50 of {parsedRows.length} rows. All rows will be imported.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {parsedRows.length > 0 ? `${parsedRows.length} items ready to import` : "No file loaded"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0 || isImporting}
              onClick={handleImportSubmit}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50 transition shadow-xs"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing into Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Import {parsedRows.length} Items to Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
