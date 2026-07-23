import { useState } from "react";
import {
  ArrowDownToLine, ArrowRightLeft, ArrowUpDown, Check, ChevronDown, ClipboardList, Copy,
  CircleDollarSign, ExternalLink, Filter, Link2, List, MoreHorizontal, Pencil, Plus, ReceiptText,
  RefreshCcw, RotateCcw, Send, Trash2, X
} from "lucide-react";
import type { ApprovalStatus, Booking, FiltersState, LookupType, Pagination, TabView } from "../types";
import { Modal } from "./Modal";
import { ServiceIcon } from "./ServiceIcon";

const money = (amount: number) => `₹ ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount / 100)}`;
const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).format(parsed);
};
const nameOf = (owner: Booking["owners"][number]) => owner.userId.name || `${owner.userId.firstName || ""} ${owner.userId.lastName || ""}`.trim();
const initialsOf = (owner: Booking["owners"][number]) => owner.userId.initials || nameOf(owner).split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

function ServiceFilter({ types, selected, onApply, onClose }: { types: LookupType[]; selected: string[]; onApply: (ids: string[]) => void; onClose: () => void }) {
  const [values, setValues] = useState(selected);
  const toggle = (id: string) => setValues(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  return (
    <Modal onClose={onClose} className="service-modal">
      <h3>Filter Services</h3>
      <label className="service-group"><span className={`check-box ${values.length === types.length ? "checked" : ""}`}>{values.length === types.length && <Check size={12} />}</span><strong>OTHER SERVICES</strong></label>
      <div className="service-options">{types.map((type) => <label key={type._id}><input type="checkbox" checked={values.includes(type._id)} onChange={() => toggle(type._id)} /><span className={`check-box ${values.includes(type._id) ? "checked" : ""}`}>{values.includes(type._id) && <Check size={12} />}</span><span className="service-symbol"><ServiceIcon code={type.code} size={16} /></span>{type.name}</label>)}</div>
      <div className="service-group limit"><span className="check-box" /><strong>LIMITLESS</strong></div>
      <div className="modal-footer"><button className="btn secondary" onClick={() => setValues(values.length ? [] : types.map((item) => item._id))}>{values.length ? "Deselect All" : "Select All"}</button><button className="square-btn" onClick={() => setValues([])}><RefreshCcw size={15} /></button><button className="btn purple" onClick={() => { onApply(values); onClose(); }}>Apply</button></div>
    </Modal>
  );
}

function VoucherMenu({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  const options = [["bookingVoucher", "Booking Voucher(s)"], ["customerInvoice", "Customer Invoice(s)"], ["vendorVoucher", "Vendor Voucher(s)"], ["vendorInvoice", "Vendor Invoice(s)"]] as const;
  return <div className="relative"><button className="voucher-btn" onClick={() => setOpen(!open)}><ReceiptText size={16} /><span /><ChevronDown size={14} /></button>{open && <div className="dropdown-menu voucher-menu">{options.map(([key, label]) => <button disabled={!booking.voucherAvailability?.[key]} key={key}><ArrowDownToLine size={17} />{label}</button>)}</div>}</div>;
}

function RowMenu({ booking, onAction }: { booking: Booking; onAction: (action: string, booking: Booking) => void }) {
  const [open, setOpen] = useState(false);
  const icon: Record<string, React.ReactNode> = {
    EDIT: <Pencil size={17} />, DELETE: <Trash2 size={17} />, LINK: <Link2 size={17} />,
    DUPLICATE: <Copy size={17} />, RESTORE: <RotateCcw size={17} />, SUBMIT_FOR_APPROVAL: <Send size={17} />
  };
  const label: Record<string, string> = { EDIT: "Edit", DELETE: "Delete", LINK: "Link", DUPLICATE: "Duplicate", RESTORE: "Restore", SUBMIT_FOR_APPROVAL: "Send for Approval" };
  const available = booking.allowedActions.filter((action) => label[action]);
  return <div className="relative"><button className="tiny-action" onClick={() => setOpen(!open)}><MoreHorizontal size={17} /></button>{open && <div className="dropdown-menu row-menu">{available.map((action) => <button key={action} className={action === "DELETE" ? "danger" : action === "EDIT" ? "blue" : ""} onClick={() => { setOpen(false); onAction(action, booking); }}>{icon[action]}{label[action]}</button>)}</div>}</div>;
}

function Owners({ booking }: { booking: Booking }) {
  return <div className="owner-stack">{booking.owners.slice(0, 4).map((owner, index) => <div key={owner.userId.id || owner.userId._id || index} style={{ zIndex: 5 - index }} className={`owner-avatar owner-${index}`} title={nameOf(owner)}>{initialsOf(owner)}</div>)}</div>;
}

export function BookingsTable({
  bookings, pagination, view, approvalStatus, filters, serviceTypes, selected, loading, error, sourceEmpty, canViewApprovals,
  onViewChange, onApprovalStatusChange, onToggleIncomplete, onFiltersChange, onSelectionChange,
  onPageChange, onLimitChange, onAction, onRetry
}: {
  bookings: Booking[];
  pagination: Pagination;
  view: TabView;
  approvalStatus: ApprovalStatus | "ALL";
  filters: FiltersState;
  serviceTypes: LookupType[];
  selected: string[];
  loading: boolean;
  error: string;
  sourceEmpty: boolean;
  canViewApprovals: boolean;
  onViewChange: (view: TabView) => void;
  onApprovalStatusChange: (status: ApprovalStatus | "ALL") => void;
  onToggleIncomplete: () => void;
  onFiltersChange: (filters: FiltersState) => void;
  onSelectionChange: (ids: string[]) => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onAction: (action: string, booking: Booking) => void;
  onRetry: () => void;
}) {
  const [servicesOpen, setServicesOpen] = useState(false);
  const allSelected = bookings.length > 0 && bookings.every((booking) => selected.includes(booking._id));
  const select = (id: string) => onSelectionChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  const selectAll = () => onSelectionChange(allSelected ? selected.filter((id) => !bookings.some((booking) => booking._id === id)) : [...new Set([...selected, ...bookings.map((booking) => booking._id)])]);
  const setSort = (sortBy: FiltersState["sortBy"]) => onFiltersChange({ ...filters, sortBy, sortOrder: filters.sortBy === sortBy && filters.sortOrder === "asc" ? "desc" : "asc" });
  return (
    <section className="bookings-card">
      <div className="tabs-row">
        <div className="tabs">
          <button className={view === "ACTIVE" ? "active" : ""} onClick={() => onViewChange("ACTIVE")}>Bookings</button>
          <button className={view === "DELETED" ? "active" : ""} onClick={() => onViewChange("DELETED")}>Deleted</button>
          {canViewApprovals && <button className={view === "APPROVALS" ? "active" : ""} onClick={() => onViewChange("APPROVALS")}>Waiting for Approval</button>}
          {view === "APPROVALS" && <div className="select-wrap approval-select"><select value={approvalStatus} onChange={(event) => onApprovalStatusChange(event.target.value as ApprovalStatus | "ALL")}><option value="ALL">All</option><option value="APPROVED">Approved</option><option value="PENDING">Pending</option><option value="REJECTED">Rejected</option></select><ChevronDown size={14} /></div>}
        </div>
        <div className="table-tools"><label className="toggle-label"><button className={`toggle ${filters.includeIncomplete ? "on" : ""}`} onClick={onToggleIncomplete}><i /></button>Show Incomplete Bookings</label><span className="total-pill">Total&nbsp;&nbsp; {pagination.total}</span></div>
      </div>
      <div className={`table-wrap ${loading ? "loading" : ""}`}>
        <table>
          <thead><tr>
            {selected.length > 0 && <th className="select-cell"><button className={`check-box ${allSelected ? "checked" : ""}`} onClick={selectAll}>{allSelected && <Check size={12} />}</button></th>}
            <th>Booking ID</th><th><span className="heading-with-icons">Lead Pax <ArrowRightLeft size={12} /></span></th><th><button onClick={() => setSort("travelStartDate")}><span className="heading-with-icons">Travel Date <Filter size={12} /><ArrowUpDown size={12} /></span></button></th>
            <th><button onClick={() => setServicesOpen(true)}><span className="heading-with-icons">Service <Filter size={12} /></span></button></th><th><span className="heading-with-icons">Payment Status <ArrowRightLeft size={12} /></span></th>
            <th><button onClick={() => setSort("amount")}><span className="heading-with-icons">Amount <ArrowUpDown size={12} /></span></button></th><th>Owner</th><th>Voucher</th><th>Tasks</th><th>Actions</th>
          </tr></thead>
          <tbody>{bookings.map((booking) => {
            const service = booking.serviceTypeIds?.[0];
            return <tr key={booking._id} className={booking.approval.status.toLowerCase()}>
              {selected.length > 0 && <td className="select-cell"><button className={`check-box ${selected.includes(booking._id) ? "checked" : ""}`} onClick={() => select(booking._id)}>{selected.includes(booking._id) && <Check size={12} />}</button></td>}
              <td><button className="booking-link">{booking.bookingId}</button></td><td>{booking.leadPax.name}</td><td>{date(booking.travelStartDate)}</td>
              <td><div className="service-cell"><span><ServiceIcon code={service?.code} size={16} /></span>{booking.bookingTypeId?.code === "LI" && <small>{booking.bookingTypeId.name}</small>}<em>{service?.name || "—"}</em></div></td>
              <td><div className="payment-status-wrap has-payment-tooltip" tabIndex={0}><span className={`status-badge ${booking.paymentStatus.toLowerCase().replaceAll("_", "-")}`}>{booking.paymentStatus.replaceAll("_", " ").replace(/\b\w/g, (value) => value.toUpperCase())}</span><div className="pending-hover-card payment-summary-tooltip" role="tooltip"><u>PAYMENT SUMMARY</u><span>Customer: {money(booking.paymentBreakdown.customer.paid)} paid / {money(booking.paymentBreakdown.customer.pending)} pending</span><span>Vendor: {money(booking.paymentBreakdown.vendor.paid)} paid / {money(booking.paymentBreakdown.vendor.pending)} pending</span></div></div></td>
              <td>{money(booking.totals.customerAmount)}</td><td><Owners booking={booking} /></td>
              <td>{booking.approval.status === "REJECTED" ? "—" : <VoucherMenu booking={booking} />}</td>
              <td>{booking.approval.status === "REJECTED" ? "—" : <button className="task-btn"><ClipboardList size={16} />{booking.openTaskCount > 0 && <span>{booking.openTaskCount}</span>}{booking.openTaskCount === 0 && <Plus size={15} />}</button>}</td>
              <td><div className="actions-cell">
                {booking.allowedActions.includes("APPROVE") && <button className="approval-action approve" onClick={() => onAction("APPROVE", booking)}><Check size={18} /></button>}
                {booking.allowedActions.includes("REJECT") && <button className="approval-action reject" onClick={() => onAction("REJECT", booking)}><X size={18} /></button>}
                {booking.allowedActions.includes("RECORD_PAYMENT") && <button className="payment-row-action record" onClick={() => onAction("RECORD_PAYMENT", booking)}><CircleDollarSign size={15} /><span>Record Payment</span></button>}
                <button className="payment-row-action" onClick={() => onAction("VIEW_PAYMENTS", booking)}><List size={15} /><span>View Payments</span></button>
                <RowMenu booking={booking} onAction={onAction} />
              </div></td>
            </tr>;
          })}</tbody>
        </table>
        {!loading && error && <div className="empty-state error-state"><ExternalLink size={28} /><strong>Unable to load bookings</strong><span>{error}</span><button className="btn purple" onClick={onRetry}>Retry</button></div>}
        {!loading && !error && bookings.length === 0 && <div className="empty-state"><ExternalLink size={28} /><strong>{sourceEmpty ? "No bookings are available" : "No bookings match this view"}</strong><span>{sourceEmpty ? "Create a booking to get started." : "Try changing the filters or tab."}</span></div>}
        {loading && <div className="loading-state"><i /><span>Loading bookings…</span></div>}
      </div>
      <div className="pagination-row">
        <label>Rows per page: <select value={pagination.limit} onChange={(event) => onLimitChange(Number(event.target.value))}><option>6</option><option>10</option><option>20</option><option>50</option><option>100</option></select></label>
        <span>Showing {pagination.from}-{pagination.to} of {pagination.total} Bookings</span>
        <div className="pages"><button disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>‹</button>{Array.from({ length: Math.min(3, pagination.totalPages) }, (_, index) => index + 1).map((page) => <button className={page === pagination.page ? "active" : ""} onClick={() => onPageChange(page)} key={page}>{page}</button>)}{pagination.totalPages > 3 && <><span>…</span><button onClick={() => onPageChange(pagination.totalPages)}>{pagination.totalPages}</button></>}<button disabled={pagination.totalPages === 0 || pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>›</button></div>
      </div>
      {servicesOpen && <ServiceFilter types={serviceTypes} selected={filters.serviceTypeIds} onClose={() => setServicesOpen(false)} onApply={(serviceTypeIds) => onFiltersChange({ ...filters, serviceTypeIds })} />}
    </section>
  );
}
