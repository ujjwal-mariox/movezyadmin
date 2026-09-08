import React, { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, Calendar, Landmark, ClipboardList } from "lucide-react";
import { exportsApi, type ExportDatasetInfo } from "../services/admin-api";

/**
 * Exports — every dataset the auditors need, as Excel or PDF, generated on
 * the server from live records and audit-logged.
 *
 * The "Ledger" entry is the combined money-movement export: one row per
 * customer payment, driver settlement, payout, wallet movement, refund,
 * expense, coin cash-out and enterprise credit event, with debit/credit from
 * the platform's point of view and the source record id on every line.
 */
const ExportsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<ExportDatasetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await exportsApi.list();
        setDatasets(res?.data?.datasets || []);
      } catch (e: any) {
        setError(e?.message || "Could not load the export catalogue");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const run = async (key: string, format: "xlsx" | "pdf") => {
    setBusy(`${key}:${format}`);
    setError(null);
    try {
      await exportsApi.download(key, format, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
    } catch (e: any) {
      setError(e?.message || "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const group = (scope: "finance" | "ops") => datasets.filter((d) => d.scope === scope);

  const card = (d: ExportDatasetInfo) => (
    <div key={d.key} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-gray-800">{d.title}</h3>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{d.columns.join(" · ")}</p>
      </div>
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => run(d.key, "xlsx")}
          disabled={busy !== null}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {busy === `${d.key}:xlsx` ? "Preparing…" : "Excel"}
        </button>
        <button
          onClick={() => run(d.key, "pdf")}
          disabled={busy !== null}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          {busy === `${d.key}:pdf` ? "Preparing…" : "PDF"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Download className="w-6 h-6 text-blue-600" />
            Exports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Excel and PDF, generated on the server from live records. Every export is
            recorded in the audit log with who pulled it and the range covered.
          </p>
        </div>
        <div className="flex items-end gap-3 bg-white border border-gray-200 rounded-xl p-3">
          <Calendar className="w-4 h-4 text-gray-400 mb-2.5" />
          <label className="text-xs text-gray-500">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
            />
          </label>
          <label className="text-xs text-gray-500">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="block mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
            />
          </label>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs text-gray-500 hover:text-gray-700 mb-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-400 py-10 text-center">Loading…</p>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-600" /> Finance &amp; ledger
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {group("finance").map(card)}
            </div>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" /> Operations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {group("ops").map(card)}
            </div>
          </section>
          <p className="text-xs text-gray-400">
            No date range = all records. Dates are inclusive and applied to each dataset's own
            timestamp (created / completed / paid, as appropriate). Excel files carry an “About”
            sheet with the range and row count; PDFs total every money column on the last page.
          </p>
        </>
      )}
    </div>
  );
};

export default ExportsPage;
