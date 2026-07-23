import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarDays,
  ChevronDown,
  Download,
  Merge,
  MoreHorizontal,
  MousePointerClick,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "./api";
import {
  calendarEvents as buildCalendarEvents,
  deriveLookups,
  filterBookings,
  financeSummary,
  paginate,
  toBooking,
} from "./bookingData";
import { bookingApi, paymentApi } from "./mockApi";
import { BookingsTable } from "./components/BookingsTable";
import {
  CalendarView,
  RescheduleModal,
  StatusModal,
} from "./components/CalendarView";
import {
  BookingFormModal,
} from "./components/DataModals";
import { Filters } from "./components/Filters";
import { ConfirmModal } from "./components/Modal";
import { PaymentSidesheet } from "./components/PaymentSidesheet";
import { Shell } from "./components/Shell";
import { SummaryPills } from "./components/SummaryPills";
import type {
  ApiBooking,
  ApiPayment,
  ApprovalStatus,
  AuthUser,
  Booking,
  BookingWritePayload,
  CalendarEvent,
  FiltersState,
  PaymentWritePayload,
  PaymentSheetMode,
  TabView,
} from "./types";

const emptyFilters: FiltersState = {
  bookingDateFrom: "",
  bookingDateTo: "",
  travelDateFrom: "",
  travelDateTo: "",
  ownerIds: [],
  primaryOwnerIds: [],
  secondaryOwnerIds: [],
  bookingTypeIds: [],
  serviceTypeIds: [],
  search: "",
  includeIncomplete: false,
  sortBy: "updatedAt",
  sortOrder: "desc",
};

const withoutResourceId = (source: ApiBooking): BookingWritePayload => {
  const copy = { ...source };
  delete copy.ID;
  return copy;
};

function HeaderActions({
  selected,
  allIds,
  canCreate,
  onSelected,
  onCreate,
  onCalendar,
  toast,
}: {
  selected: string[];
  allIds: string[];
  canCreate: boolean;
  onSelected: (ids: string[]) => void;
  onCreate: () => void;
  onCalendar: () => void;
  toast: (message: string) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  if (selected.length > 0)
    return (
      <div className="header-actions selection-actions">
        <button className="btn secondary" onClick={() => onSelected([])}>
          Cancel
        </button>
        <button
          className="btn secondary"
          onClick={() =>
            onSelected(selected.length === allIds.length ? [] : allIds)
          }
        >
          {selected.length === allIds.length ? "Deselect all" : "Select all"}
        </button>
        <div className="relative">
          <button className="square-btn" onClick={() => setBulkOpen(!bulkOpen)}>
            <MoreHorizontal size={18} />
          </button>
          {bulkOpen && (
            <div className="dropdown-menu bulk-menu">
              <button onClick={() => toast("Download remains UI-only.")}>
                <Download size={17} />
                Download
              </button>
              <button onClick={() => toast("Merge remains UI-only.")}>
                <Merge size={17} />
                Merge
              </button>
              <button
                className="danger"
                onClick={() =>
                  toast("Bulk delete is not part of the supplied API.")
                }
              >
                <Trash2 size={17} />
                Delete
              </button>
            </div>
          )}
        </div>
        <button className="square-btn" onClick={onCalendar}>
          <CalendarDays size={17} />
        </button>
      </div>
    );
  return (
    <div className="header-actions">
      {canCreate && (
        <button className="btn purple create-booking-btn" onClick={onCreate}>
          <Plus size={16} />
          Create Booking
        </button>
      )}
      <div className="relative">
        <button className="more-actions" onClick={() => setMoreOpen(!moreOpen)}>
          <span>More Actions</span>
          <span className="split">
            <ChevronDown size={14} />
          </span>
        </button>
        {moreOpen && (
          <div className="dropdown-menu more-menu">
            <button
              onClick={() => {
                setMoreOpen(false);
                onSelected(allIds.slice(0, 1));
              }}
            >
              <MousePointerClick size={17} />
              Select
            </button>
            <button onClick={() => toast("Upload remains UI-only.")}>
              <Upload size={17} />
              Upload
            </button>
          </div>
        )}
      </div>
      <button className="square-btn" onClick={onCalendar}>
        <CalendarDays size={17} />
      </button>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<"bookings" | "calendar">(() =>
    new URLSearchParams(window.location.search).get("view") === "calendar"
      ? "calendar"
      : "bookings",
  );
  const [view, setView] = useState<TabView>("ACTIVE");
  const [approvalStatus, setApprovalStatus] = useState<
    ApprovalStatus | "ALL"
  >("ALL");
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [apiBookings, setApiBookings] = useState<ApiBooking[]>([]);
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [limit, setLimit] = useState(6);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState<{
    action: string;
    booking: Booking;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionCreatedIds, setSessionCreatedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [approvalOverrides, setApprovalOverrides] = useState<
    Record<string, ApprovalStatus>
  >({});
  const [editingBooking, setEditingBooking] = useState<ApiBooking>();
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [paymentSheet, setPaymentSheet] = useState<{
    booking: Booking;
    mode: PaymentSheetMode;
  }>();
  const [calendarFrom, setCalendarFrom] = useState(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() - 2);
    return value;
  });
  const calendarInitialized = useRef(false);
  const [rescheduleEvent, setRescheduleEvent] =
    useState<CalendarEvent | null>(null);
  const [statusEvent, setStatusEvent] = useState<CalendarEvent | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3600);
  }, []);

  const fetchFinanceData = useCallback(async () => {
    const [bookingRecords, paymentRecords] = await Promise.all([
      bookingApi.list(),
      paymentApi.list(),
    ]);
    if (!Array.isArray(bookingRecords) || !Array.isArray(paymentRecords))
      throw new Error("The MockAPI returned an unexpected response.");
    setApiBookings(bookingRecords);
    setPayments(paymentRecords);
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setDataError("");
    try {
      const [authResponse] = await Promise.all([
        api<{ data: AuthUser }>("/auth/me"),
        fetchFinanceData(),
      ]);
      setPermissions(authResponse.data.permissions || []);
    } catch (error) {
      setDataError(
        error instanceof Error ? error.message : "Unable to load bookings.",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchFinanceData]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const allBookings = useMemo(
    () =>
      apiBookings.map((booking, index) =>
        toBooking(
          booking,
          index,
          payments,
          permissions,
          sessionCreatedIds,
          approvalOverrides,
        ),
      ),
    [
      apiBookings,
      payments,
      permissions,
      sessionCreatedIds,
      approvalOverrides,
    ],
  );
  const lookups = useMemo(() => deriveLookups(allBookings), [allBookings]);
  const filteredBookings = useMemo(
    () =>
      filterBookings(
        allBookings,
        view,
        approvalStatus,
        filters,
      ),
    [allBookings, view, approvalStatus, filters],
  );
  const pageResult = useMemo(
    () => paginate(filteredBookings, pageNumber, limit),
    [filteredBookings, pageNumber, limit],
  );
  const summary = useMemo(() => financeSummary(allBookings), [allBookings]);
  const timelineEvents = useMemo(
    () => buildCalendarEvents(allBookings),
    [allBookings],
  );

  useEffect(() => {
    setSelected((current) =>
      current.filter((id) =>
        pageResult.data.some((booking) => booking._id === id),
      ),
    );
  }, [pageResult.data]);

  useEffect(() => {
    if (calendarInitialized.current || timelineEvents.length === 0) return;
    const first = new Date(timelineEvents[0].schedule.startAt);
    if (!Number.isNaN(first.getTime())) {
      first.setHours(0, 0, 0, 0);
      first.setDate(first.getDate() - 2);
      setCalendarFrom(first);
      calendarInitialized.current = true;
    }
  }, [timelineEvents]);

  const sourceFor = (booking: Booking) =>
    apiBookings.find((source) =>
      booking.resourceId
        ? source.ID === booking.resourceId
        : source.bookingId === booking.bookingId,
    );

  const refetchFinance = async () => {
    try {
      await fetchFinanceData();
      setDataError("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh data.";
      setDataError(message);
      throw error;
    }
  };

  const saveBooking = async (
    payload: BookingWritePayload,
    resourceId?: string,
  ) => {
    setBusy(true);
    try {
      if (resourceId) {
        if (!sessionCreatedIds.has(resourceId))
          throw new Error(
            "Only bookings created during this session can be updated.",
          );
        await bookingApi.update(resourceId, payload);
        showToast("Booking updated successfully.");
      } else {
        const created = await bookingApi.create(payload);
        if (!created.ID)
          throw new Error("The created booking did not receive a resource ID.");
        setSessionCreatedIds(
          (current) => new Set([...current, String(created.ID)]),
        );
        showToast("Booking created successfully.");
      }
      setCreatingBooking(false);
      setEditingBooking(undefined);
      await refetchFinance();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save booking.");
    } finally {
      setBusy(false);
    }
  };

  const duplicateBooking = async (booking: Booking) => {
    const source = sourceFor(booking);
    if (!source) return showToast("The source booking could not be found.");
    const payload = withoutResourceId(source);
    await saveBooking({
      ...payload,
      bookingId: `${source.bookingId}-COPY-${Date.now().toString().slice(-4)}`,
      isDeleted: false,
      createdAt: new Date().toISOString().slice(0, 10),
      modifiedAt: new Date().toISOString().slice(0, 10),
    });
  };

  const requestAction = (action: string, booking: Booking) => {
    if (["APPROVE", "REJECT", "SUBMIT_FOR_APPROVAL", "DELETE"].includes(action)) {
      if (
        action === "DELETE" &&
        (!booking.resourceId || !booking.sessionCreated)
      ) {
        showToast(
          "Seeded bookings have no usable session resource ID and cannot be deleted.",
        );
        return;
      }
      setConfirm({ action, booking });
      return;
    }
    if (action === "EDIT") {
      if (!booking.resourceId || !booking.sessionCreated) {
        showToast(
          "Only bookings created during this session can be updated.",
        );
        return;
      }
      setEditingBooking(sourceFor(booking));
      return;
    }
    if (action === "DUPLICATE") {
      void duplicateBooking(booking);
      return;
    }
    if (action === "RECORD_PAYMENT") {
      setPaymentSheet({ booking, mode: "CREATE" });
      return;
    }
    if (action === "VIEW_PAYMENTS") {
      setPaymentSheet({ booking, mode: "LIST" });
      return;
    }
    if (action === "RESTORE")
      showToast("Restore remains UI-only because MockAPI has no restore endpoint.");
    else if (action === "LINK")
      showToast("Link remains UI-only because it is not part of the MockAPI schema.");
  };

  const executeConfirmedAction = async () => {
    if (!confirm) return;
    const { action, booking } = confirm;
    setBusy(true);
    try {
      if (action === "DELETE") {
        if (!booking.resourceId || !sessionCreatedIds.has(booking.resourceId))
          throw new Error(
            "Only bookings created during this session can be deleted.",
          );
        await bookingApi.remove(booking.resourceId);
        setSessionCreatedIds((current) => {
          const next = new Set(current);
          next.delete(booking.resourceId!);
          return next;
        });
        await refetchFinance();
        showToast("Booking deleted successfully.");
      } else {
        const nextStatus: ApprovalStatus =
          action === "APPROVE"
            ? "APPROVED"
            : action === "REJECT"
              ? "REJECTED"
              : "PENDING";
        setApprovalOverrides((current) => ({
          ...current,
          [booking.bookingId]: nextStatus,
        }));
        showToast(
          action === "APPROVE"
            ? "Booking approved in the UI."
            : action === "REJECT"
              ? "Booking rejected in the UI."
              : "Booking sent for approval in the UI.",
        );
      }
      setConfirm(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const savePayment = async (
    payload: PaymentWritePayload,
    paymentId?: string,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      if (paymentId) {
        await paymentApi.update(paymentId, payload);
        showToast("Payment updated successfully.");
      } else {
        await paymentApi.create(payload);
        showToast("Payment recorded successfully.");
      }
      const records = await paymentApi.list();
      setPayments(records);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save payment.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const updateCalendarBooking = async (
    event: CalendarEvent,
    changes: Partial<BookingWritePayload>,
  ) => {
    const booking = event.bookingId;
    const source = sourceFor(booking);
    if (
      !source ||
      !booking.resourceId ||
      !sessionCreatedIds.has(booking.resourceId)
    ) {
      showToast(
        "Calendar changes can only be saved for bookings created during this session.",
      );
      return;
    }
    await saveBooking(
      { ...withoutResourceId(source), ...changes },
      booking.resourceId,
    );
  };

  const changeFilters = (next: FiltersState) => {
    setFilters(next);
    setPageNumber(1);
  };
  const changeView = (next: TabView) => {
    setView(next);
    setPageNumber(1);
    setSelected([]);
  };

  return (
    <Shell
      page={page}
      onCalendar={() =>
        setPage(page === "calendar" ? "bookings" : "calendar")
      }
      summary={<SummaryPills summary={summary} />}
      selectionActions={
        page === "bookings" ? (
          <HeaderActions
            selected={selected}
            allIds={pageResult.data.map((booking) => booking._id)}
            canCreate={permissions.includes("bookings.create")}
            onSelected={setSelected}
            onCreate={() => setCreatingBooking(true)}
            onCalendar={() => setPage("calendar")}
            toast={showToast}
          />
        ) : undefined
      }
    >
      <Filters
        filters={filters}
        setFilters={changeFilters}
        owners={lookups.owners}
        bookingTypes={lookups.bookingTypes}
        calendar={page === "calendar"}
      />
      {page === "bookings" ? (
        <BookingsTable
          bookings={pageResult.data}
          pagination={pageResult.pagination}
          view={view}
          approvalStatus={approvalStatus}
          filters={filters}
          serviceTypes={lookups.serviceTypes}
          selected={selected}
          loading={loading}
          error={dataError}
          sourceEmpty={!loading && !dataError && apiBookings.length === 0}
          canViewApprovals={permissions.some((permission) =>
            permission.startsWith("bookings.approve"),
          )}
          onRetry={() => void loadPage()}
          onViewChange={changeView}
          onApprovalStatusChange={(status) => {
            setApprovalStatus(status);
            setPageNumber(1);
          }}
          onToggleIncomplete={() =>
            changeFilters({
              ...filters,
              includeIncomplete: !filters.includeIncomplete,
            })
          }
          onFiltersChange={changeFilters}
          onSelectionChange={setSelected}
          onPageChange={setPageNumber}
          onLimitChange={(value) => {
            setLimit(value);
            setPageNumber(1);
          }}
          onAction={requestAction}
        />
      ) : (
        <CalendarView
          events={timelineEvents}
          from={calendarFrom}
          loading={loading}
          onPrevious={() =>
            setCalendarFrom(
              new Date(
                calendarFrom.getFullYear(),
                calendarFrom.getMonth(),
                calendarFrom.getDate() - 7,
              ),
            )
          }
          onNext={() =>
            setCalendarFrom(
              new Date(
                calendarFrom.getFullYear(),
                calendarFrom.getMonth(),
                calendarFrom.getDate() + 7,
              ),
            )
          }
          onStatus={setStatusEvent}
          onReschedule={setRescheduleEvent}
        />
      )}

      {creatingBooking && (
        <BookingFormModal
          busy={busy}
          onClose={() => setCreatingBooking(false)}
          onSave={(payload) => void saveBooking(payload)}
        />
      )}
      {editingBooking && (
        <BookingFormModal
          source={editingBooking}
          busy={busy}
          onClose={() => setEditingBooking(undefined)}
          onSave={(payload) =>
            void saveBooking(payload, editingBooking.ID)
          }
        />
      )}
      {paymentSheet && (
        <PaymentSidesheet
          key={`${paymentSheet.booking._id}-${paymentSheet.mode}`}
          booking={paymentSheet.booking}
          payments={payments}
          initialMode={paymentSheet.mode}
          busy={busy}
          onClose={() => setPaymentSheet(undefined)}
          onSave={savePayment}
        />
      )}
      {confirm && (
        <ConfirmModal
          busy={busy}
          tone={
            confirm.action === "APPROVE"
              ? "green"
              : ["REJECT", "DELETE"].includes(confirm.action)
                ? "red"
                : "purple"
          }
          confirmText={
            confirm.action === "APPROVE"
              ? "Yes, Approve"
              : confirm.action === "REJECT"
                ? "Yes, Reject"
                : confirm.action === "DELETE"
                  ? "Yes, Delete"
                  : "Yes, Send for Approval"
          }
          message={
            <>
              Are you sure you want to{" "}
              {confirm.action === "APPROVE"
                ? "approve"
                : confirm.action === "REJECT"
                  ? "reject"
                  : confirm.action === "DELETE"
                    ? "delete"
                    : "send"}{" "}
              this booking with ID <strong>‘{confirm.booking.bookingId}’</strong>
              {confirm.action === "SUBMIT_FOR_APPROVAL"
                ? " for approval"
                : ""}
              ?
            </>
          }
          onClose={() => setConfirm(null)}
          onConfirm={() => void executeConfirmedAction()}
        />
      )}
      {rescheduleEvent && (
        <RescheduleModal
          event={rescheduleEvent}
          onClose={() => setRescheduleEvent(null)}
          onSave={(startAt) => {
            void updateCalendarBooking(rescheduleEvent, {
              travelDate: startAt.slice(0, 10),
              modifiedAt: new Date().toISOString().slice(0, 10),
            });
            setRescheduleEvent(null);
          }}
        />
      )}
      {statusEvent && (
        <StatusModal
          event={statusEvent}
          onClose={() => setStatusEvent(null)}
          onSave={(status) => {
            void updateCalendarBooking(statusEvent, {
              serviceStatus: status.replace("_", " "),
              modifiedAt: new Date().toISOString().slice(0, 10),
            });
            setStatusEvent(null);
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <X size={16} onClick={() => setToast("")} />
          <span>{toast}</span>
        </div>
      )}
    </Shell>
  );
}
