import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronDown, Download, Merge, MoreHorizontal, MousePointerClick, Trash2, Upload, X } from "lucide-react";
import { api, patch, post } from "./api";
import { BookingsTable } from "./components/BookingsTable";
import { CalendarView, RescheduleModal, StatusModal } from "./components/CalendarView";
import { Filters } from "./components/Filters";
import { ConfirmModal } from "./components/Modal";
import { Shell } from "./components/Shell";
import { SummaryPills } from "./components/SummaryPills";
import type { ApprovalStatus, Booking, CalendarEvent, FiltersState, FinanceSummary, LookupType, Pagination, TabView, UserSummary } from "./types";

const emptyFilters: FiltersState = {
  bookingDateFrom: "", bookingDateTo: "", travelDateFrom: "", travelDateTo: "", ownerIds: [],
  primaryOwnerIds: [], secondaryOwnerIds: [], bookingTypeIds: [], serviceTypeIds: [], search: "",
  includeIncomplete: false, sortBy: "updatedAt", sortOrder: "desc"
};
const emptyPagination: Pagination = { page: 1, limit: 6, total: 0, totalPages: 0, from: 0, to: 0 };

function HeaderActions({ selected, allIds, onSelected, onCalendar, toast }: { selected: string[]; allIds: string[]; onSelected: (ids: string[]) => void; onCalendar: () => void; toast: (message: string) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  if (selected.length > 0) return <div className="header-actions selection-actions"><button className="btn secondary" onClick={() => onSelected([])}>Cancel</button><button className="btn secondary" onClick={() => onSelected(selected.length === allIds.length ? [] : allIds)}>{selected.length === allIds.length ? "Deselect all" : "Select all"}</button><div className="relative"><button className="square-btn" onClick={() => setBulkOpen(!bulkOpen)}><MoreHorizontal size={18} /></button>{bulkOpen && <div className="dropdown-menu bulk-menu"><button onClick={() => toast("Download is outside the current backend scope.")}><Download size={17} />Download</button><button onClick={() => toast("Merge is not implemented in the agreed scope.")}><Merge size={17} />Merge</button><button className="danger" onClick={() => toast("Bulk delete is not implemented in the agreed scope.")}><Trash2 size={17} />Delete</button></div>}</div><button className="square-btn" onClick={onCalendar}><CalendarDays size={17} /></button></div>;
  return <div className="header-actions"><div className="relative"><button className="more-actions" onClick={() => setMoreOpen(!moreOpen)}><span>More Actions</span><span className="split"><ChevronDown size={14} /></span></button>{moreOpen && <div className="dropdown-menu more-menu"><button onClick={() => { setMoreOpen(false); onSelected(allIds.slice(0, 1)); }}><MousePointerClick size={17} />Select</button><button onClick={() => toast("Upload is outside the current backend scope.")}><Upload size={17} />Upload</button></div>}</div><button className="square-btn" onClick={onCalendar}><CalendarDays size={17} /></button></div>;
}

export default function App() {
  const [page, setPage] = useState<"bookings" | "calendar">(() => new URLSearchParams(window.location.search).get("view") === "calendar" ? "calendar" : "bookings");
  const [view, setView] = useState<TabView>("ACTIVE");
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | "ALL">("ALL");
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);
  const [pageNumber, setPageNumber] = useState(1);
  const [limit, setLimit] = useState(6);
  const [owners, setOwners] = useState<UserSummary[]>([]);
  const [bookingTypes, setBookingTypes] = useState<LookupType[]>([]);
  const [serviceTypes, setServiceTypes] = useState<LookupType[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState<{ action: string; booking: Booking } | null>(null);
  const [busy, setBusy] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarFrom, setCalendarFrom] = useState(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() - 2);
    return value;
  });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [rescheduleEvent, setRescheduleEvent] = useState<CalendarEvent | null>(null);
  const [statusEvent, setStatusEvent] = useState<CalendarEvent | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  useEffect(() => {
    Promise.all([
      api<{ data: UserSummary[] }>("/users/booking-owners"),
      api<{ data: LookupType[] }>("/booking-types"),
      api<{ data: LookupType[] }>("/service-types"),
      api<{ data: FinanceSummary }>("/bookings/finance-summary")
    ]).then(([ownerData, typeData, serviceData, summaryData]) => {
      setOwners(ownerData.data); setBookingTypes(typeData.data); setServiceTypes(serviceData.data); setSummary(summaryData.data);
    }).catch((error: Error) => setFatalError(error.message));
  }, []);

  const loadBookings = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ view, approvalStatus, page: String(pageNumber), limit: String(limit), includeIncomplete: String(filters.includeIncomplete), sortBy: filters.sortBy, sortOrder: filters.sortOrder });
    (["bookingDateFrom", "bookingDateTo", "travelDateFrom", "travelDateTo", "search"] as const).forEach((key) => filters[key] && params.set(key, String(filters[key])));
    (["ownerIds", "primaryOwnerIds", "secondaryOwnerIds", "bookingTypeIds", "serviceTypeIds"] as const).forEach((key) => filters[key].length && params.set(key, filters[key].join(",")));
    api<{ data: Booking[]; pagination: Pagination }>(`/bookings?${params}`).then((response) => {
      setBookings(response.data); setPagination(response.pagination); setSelected((current) => current.filter((id) => response.data.some((booking) => booking._id === id)));
    }).catch((error: Error) => showToast(error.message)).finally(() => setLoading(false));
  }, [view, approvalStatus, pageNumber, limit, filters, showToast]);

  useEffect(() => { if (page === "bookings") loadBookings(); }, [page, loadBookings]);

  const loadCalendar = useCallback(() => {
    if (page !== "calendar") return;
    setCalendarLoading(true);
    const end = new Date(calendarFrom); end.setDate(end.getDate() + 7); end.setHours(23, 59, 59, 999);
    const params = new URLSearchParams({ from: calendarFrom.toISOString(), to: end.toISOString() });
    if (filters.ownerIds.length) params.set("ownerIds", filters.ownerIds.join(","));
    if (filters.bookingTypeIds.length) params.set("bookingTypeIds", filters.bookingTypeIds.join(","));
    if (filters.serviceTypeIds.length) params.set("serviceTypeIds", filters.serviceTypeIds.join(","));
    if (filters.search) params.set("search", filters.search);
    api<{ data: { events: CalendarEvent[] } }>(`/bookings/calendar?${params}`).then((response) => setCalendarEvents(response.data.events)).catch((error: Error) => showToast(error.message)).finally(() => setCalendarLoading(false));
  }, [page, calendarFrom, filters.ownerIds, filters.bookingTypeIds, filters.serviceTypeIds, filters.search, showToast]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const changeFilters = (next: FiltersState) => { setFilters(next); setPageNumber(1); };
  const changeView = (next: TabView) => { setView(next); setPageNumber(1); setSelected([]); };
  const requestAction = (action: string, booking: Booking) => {
    if (["APPROVE", "REJECT", "SUBMIT_FOR_APPROVAL"].includes(action)) setConfirm({ action, booking });
    else if (["RESTORE", "DUPLICATE"].includes(action)) void executeAction(action, booking);
    else if (action === "DELETE") void api(`/bookings/${booking._id}`, { method: "DELETE" }).catch((error: Error) => showToast(error.message));
    else showToast(`${action.replaceAll("_", " ")} is displayed as designed; its backend operation is deferred.`);
  };
  const executeAction = async (action: string, booking: Booking) => {
    setBusy(true);
    try {
      const paths: Record<string, string> = {
        APPROVE: `/bookings/${booking._id}/approve`, REJECT: `/bookings/${booking._id}/reject`,
        SUBMIT_FOR_APPROVAL: `/bookings/${booking._id}/submit-for-approval`, RESTORE: `/bookings/${booking._id}/restore`, DUPLICATE: `/bookings/${booking._id}/duplicate`
      };
      await post(paths[action], {});
      showToast(action === "APPROVE" ? "Booking approved" : action === "REJECT" ? "Booking rejected" : action === "RESTORE" ? "Booking restored" : action === "DUPLICATE" ? "Booking duplicated" : "Booking sent for approval");
      setConfirm(null); loadBookings();
      const nextSummary = await api<{ data: FinanceSummary }>("/bookings/finance-summary"); setSummary(nextSummary.data);
    } catch (error) { showToast(error instanceof Error ? error.message : "Action failed"); }
    finally { setBusy(false); }
  };

  if (fatalError) return <div className="connection-screen"><div className="connection-card"><span className="brand">ciergo</span><h1>Backend connection needed</h1><p>{fatalError}</p><code>cd backend<br />npm run dev</code><button className="btn purple" onClick={() => window.location.reload()}>Retry connection</button></div></div>;

  return (
    <Shell page={page} onCalendar={() => setPage(page === "calendar" ? "bookings" : "calendar")} summary={<SummaryPills summary={summary} />} selectionActions={page === "bookings" ? <HeaderActions selected={selected} allIds={bookings.map((booking) => booking._id)} onSelected={setSelected} onCalendar={() => setPage("calendar")} toast={showToast} /> : undefined}>
      <Filters filters={filters} setFilters={changeFilters} owners={owners} bookingTypes={bookingTypes} calendar={page === "calendar"} />
      {page === "bookings" ? <BookingsTable bookings={bookings} pagination={pagination} view={view} approvalStatus={approvalStatus} filters={filters} serviceTypes={serviceTypes} selected={selected} loading={loading} onViewChange={changeView} onApprovalStatusChange={(status) => { setApprovalStatus(status); setPageNumber(1); }} onToggleIncomplete={() => changeFilters({ ...filters, includeIncomplete: !filters.includeIncomplete })} onFiltersChange={changeFilters} onSelectionChange={setSelected} onPageChange={setPageNumber} onLimitChange={(value) => { setLimit(value); setPageNumber(1); }} onAction={requestAction} /> : <CalendarView events={calendarEvents} from={calendarFrom} loading={calendarLoading} onPrevious={() => setCalendarFrom(new Date(calendarFrom.getFullYear(), calendarFrom.getMonth(), calendarFrom.getDate() - 7))} onNext={() => setCalendarFrom(new Date(calendarFrom.getFullYear(), calendarFrom.getMonth(), calendarFrom.getDate() + 7))} onStatus={setStatusEvent} onReschedule={setRescheduleEvent} />}
      {confirm && <ConfirmModal busy={busy} tone={confirm.action === "APPROVE" ? "green" : confirm.action === "REJECT" ? "red" : "purple"} confirmText={confirm.action === "APPROVE" ? "Yes, Approve" : confirm.action === "REJECT" ? "Yes, Reject" : "Yes, Send for Approval"} message={<>Are you sure you want to {confirm.action === "APPROVE" ? "approve" : confirm.action === "REJECT" ? "reject" : "send"} this booking with ID <strong>‘{confirm.booking.bookingId}’</strong>{confirm.action === "SUBMIT_FOR_APPROVAL" ? " for approval" : ""}?</>} onClose={() => setConfirm(null)} onConfirm={() => void executeAction(confirm.action, confirm.booking)} />}
      {rescheduleEvent && <RescheduleModal event={rescheduleEvent} onClose={() => setRescheduleEvent(null)} onSave={async (startAt, endAt) => { try { await patch(`/booking-services/${rescheduleEvent._id}/reschedule`, { startAt, endAt }); setRescheduleEvent(null); showToast("Booking service rescheduled"); loadCalendar(); } catch (error) { showToast(error instanceof Error ? error.message : "Unable to reschedule"); } }} />}
      {statusEvent && <StatusModal event={statusEvent} onClose={() => setStatusEvent(null)} onSave={async (status) => { try { await patch(`/booking-services/${statusEvent._id}/status`, { status }); setStatusEvent(null); showToast("Status changed"); loadCalendar(); } catch (error) { showToast(error instanceof Error ? error.message : "Unable to change status"); } }} />}
      {toast && <div className="toast"><X size={16} onClick={() => setToast("")} /><span>{toast}</span></div>}
    </Shell>
  );
}
