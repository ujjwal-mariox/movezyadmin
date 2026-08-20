import React, { useCallback, useEffect, useState } from "react";
import { Banknote, Coins, RefreshCw } from "lucide-react";
import {
  SmartPayoutsSection,
  CoinPayoutsSection,
  exportFinanceCsv,
} from "./FinanceModule";
import { fetchPayouts, type PayoutItem } from "../services/api";
import { useDialog } from "../components/Layout/Dialog";

/**
 * Payout Approvals — a real page, not a redirect.
 *
 * This used to be `<Navigate to="/admin/finance?tab=payouts" />`. Clicking
 * "Payout Approvals" therefore threw you onto the Finance route: the URL and
 * the sidebar highlight both said "Finance", and the queues only appeared
 * after the *entire* finance dataset (overview + expenses + DSO + enterprise
 * credit + COD) had loaded, because that page gates every tab behind one
 * `loading` flag. If any of those calls was slow or failed, the approval
 * queues never rendered at all — the page looked like it simply didn't open.
 *
 * Now the queues own their route and load only what they need: the driver
 * payout queue and the customer coin-payout queue. `/admin/finance?tab=payouts`
 * still works for anyone with that link bookmarked.
 */
const PayoutApprovals: React.FC = () => {
  const dialog = useDialog();
  const [tab, setTab] = useState<"drivers" | "coins">("drivers");
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  // Mirrors FinanceModule.loadPayouts: pendingAmount is Σ of PENDING +
  // APPROVED payouts, i.e. what the platform still owes drivers.
  const loadPayouts = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetchPayouts();
      if (!res?.success) {
        setPendingAmount(null);
        setLoadFailed(true);
        return false;
      }
      setPayouts(res.data?.payouts || []);
      setPendingAmount(Number(res.data?.pendingAmount ?? 0));
      setLoadFailed(false);
      return true;
    } catch {
      setPendingAmount(null);
      setLoadFailed(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const handleExport = useCallback(async () => {
    try {
      if (!(await exportFinanceCsv("payouts"))) {
        await dialog.alert({
          title: "No data",
          message: "There are no payouts to export.",
          tone: "info",
        });
      }
    } catch {
      await dialog.alert({
        title: "Export failed",
        message: "We couldn't generate the export. Please try again.",
        tone: "danger",
      });
    }
  }, [dialog]);

  const pendingCount = payouts.filter((p) => p.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payout Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">
            Money leaving the platform. Approving clears a payout for payment —
            it does not send funds; an operator pays and records the reference.
          </p>
        </div>
        <button
          onClick={loadPayouts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loadFailed && (
        <div className="px-4 py-3 text-sm text-red-800 border border-red-200 rounded-lg bg-red-50">
          Couldn't load the driver payout queue. The figures below are unknown,
          not zero — retry before acting on them.
        </div>
      )}

      <div className="flex w-fit p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setTab("drivers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
            tab === "drivers"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Banknote className="w-4 h-4" />
          Driver Payouts
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 bg-amber-100 rounded">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("coins")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
            tab === "coins"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Coins className="w-4 h-4" />
          Coin Payouts
        </button>
      </div>

      {tab === "drivers" ? (
        <SmartPayoutsSection
          onExport={handleExport}
          payouts={payouts}
          pendingAmount={pendingAmount}
          reloadPayouts={loadPayouts}
        />
      ) : (
        <CoinPayoutsSection />
      )}
    </div>
  );
};

export default PayoutApprovals;
