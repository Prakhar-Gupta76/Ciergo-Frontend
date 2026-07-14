import { ArrowDownLeftFromCircle, ArrowUpRightFromCircle, Calculator } from "lucide-react";
import type { FinanceSummary } from "../types";

const format = (amount: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(amount) / 100);

export function SummaryPills({ summary }: { summary?: FinanceSummary }) {
  const currency = summary?.currency === "INR" ? "₹" : summary?.currency ?? "₹";
  return (
    <div className="summary-pills">
      <div className="summary-pill"><Calculator size={14} /><span>Net</span><strong className={summary?.netDirection === "NEGATIVE" ? "red" : "green"}>{currency} {format(summary?.net ?? 0)}</strong></div>
      <div className="summary-pill"><ArrowUpRightFromCircle size={14} /><span>You Give</span><strong className="red">{currency} {format(summary?.youGive ?? 0)}</strong></div>
      <div className="summary-pill"><ArrowDownLeftFromCircle size={14} /><span>You Get</span><strong className="green">{currency} {format(summary?.youGet ?? 0)}</strong></div>
    </div>
  );
}
