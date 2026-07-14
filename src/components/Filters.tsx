import { useState } from "react";
import {
  ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, RefreshCcw, Search, X
} from "lucide-react";
import type { FiltersState, LookupType, UserSummary } from "../types";
import { Modal } from "./Modal";

const userId = (user: UserSummary) => user.id || user._id || "";
const isoDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const parseDate = (value: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const addMonths = (value: Date, amount: number) => new Date(value.getFullYear(), value.getMonth() + amount, 1);
const formatPillDate = (value: string, fallback: string) => value
  ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).format(parseDate(value))
  : fallback;

function MonthCalendar({ month, rangeFrom, rangeTo, onSelect }: {
  month: Date;
  rangeFrom: string;
  rangeTo: string;
  onSelect: (date: Date) => void;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  return <div className="calendar-month">
    <div className="calendar-weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-days">{days.map((day) => {
      const value = isoDate(day);
      const outside = day.getMonth() !== month.getMonth();
      const endpoint = value === rangeFrom || value === rangeTo;
      const inRange = Boolean(rangeFrom && rangeTo && value > rangeFrom && value < rangeTo);
      return <button type="button" key={value} className={`${outside ? "outside" : ""} ${endpoint ? "selected" : ""} ${inRange ? "in-range" : ""}`} onClick={() => onSelect(day)}>{String(day.getDate()).padStart(2, "0")}</button>;
    })}</div>
  </div>;
}

function DateRangePicker({ label, from, to, onChange, open, onOpen, onClose }: {
  label: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const initial = parseDate(from) ?? new Date();
  const [visibleMonth, setVisibleMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const choose = (date: Date) => {
    const value = isoDate(date);
    if (!draftFrom || draftTo) {
      setDraftFrom(value);
      setDraftTo("");
      return;
    }
    const nextFrom = value < draftFrom ? value : draftFrom;
    const nextTo = value < draftFrom ? draftFrom : value;
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    onChange(nextFrom, nextTo);
    onClose();
  };
  const applyPreset = (preset: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let end = new Date(today);
    if (preset === "Yesterday") start = end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (preset === "This Week") start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    if (preset === "Last Week") { end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - 1); start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6); }
    if (preset === "This Month") start = new Date(today.getFullYear(), today.getMonth(), 1);
    if (preset === "Last Month") { start = new Date(today.getFullYear(), today.getMonth() - 1, 1); end = new Date(today.getFullYear(), today.getMonth(), 0); }
    if (preset === "Last 30 Days") start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
    if (preset === "This Year") start = new Date(today.getFullYear(), 0, 1);
    const nextFrom = isoDate(start); const nextTo = isoDate(end);
    setDraftFrom(nextFrom); setDraftTo(nextTo); onChange(nextFrom, nextTo); onClose();
  };
  const toggle = () => {
    if (open) onClose();
    else {
      const next = parseDate(from) ?? new Date();
      setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
      setDraftFrom(from); setDraftTo(to); onOpen();
    }
  };
  return <div className="filter-field date-range date-range-picker">
    <label>{label}</label>
    <button type="button" className="date-range-trigger" onClick={toggle} aria-expanded={open}>
      <span className={from ? "has-value" : ""}>{formatPillDate(from, "Start Date")}</span><ArrowRight size={17} />
      <span className={to ? "has-value" : ""}>{formatPillDate(to, "End Date")}</span><CalendarDays size={17} />
    </button>
    {open && <div className="date-picker-popover" onClick={(event) => event.stopPropagation()}>
      <aside>{["Today", "Yesterday", "This Week", "Last Week", "This Month", "Last Month", "Last 30 Days", "This Year"].map((item) => <button type="button" key={item} onClick={() => applyPreset(item)}>{item}</button>)}</aside>
      <section>
        <header><div><button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, -12))}><ChevronsLeft size={20} /></button><button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}><ChevronLeft size={20} /></button></div><strong>{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth)}</strong><span /></header>
        <MonthCalendar month={visibleMonth} rangeFrom={draftFrom} rangeTo={draftTo} onSelect={choose} />
      </section>
      <section>
        <header><span /><strong>{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(addMonths(visibleMonth, 1))}</strong><div><button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}><ChevronRight size={20} /></button><button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, 12))}><ChevronsRight size={20} /></button></div></header>
        <MonthCalendar month={addMonths(visibleMonth, 1)} rangeFrom={draftFrom} rangeTo={draftTo} onSelect={choose} />
      </section>
    </div>}
  </div>;
}

function OwnerPicker({
  owners, filters, onApply, onClose
}: {
  owners: UserSummary[];
  filters: FiltersState;
  onApply: (values: Pick<FiltersState, "ownerIds" | "primaryOwnerIds" | "secondaryOwnerIds">) => void;
  onClose: () => void;
}) {
  const [advanced, setAdvanced] = useState(filters.primaryOwnerIds.length > 0 || filters.secondaryOwnerIds.length > 0);
  const [normal, setNormal] = useState(filters.ownerIds);
  const [primary, setPrimary] = useState(filters.primaryOwnerIds);
  const [secondary, setSecondary] = useState(filters.secondaryOwnerIds);
  const [query, setQuery] = useState("");
  const [ownerOptionsOpen, setOwnerOptionsOpen] = useState<"normal" | "primary" | "secondary" | null>(null);
  const visible = owners.filter((owner) => (owner.name || "").toLowerCase().includes(query.toLowerCase()));
  const toggle = (list: string[], id: string, setter: (ids: string[]) => void) => setter(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  const chips = (list: string[], setter: (ids: string[]) => void) => (
    <div className="owner-chips">{list.map((id) => {
      const owner = owners.find((item) => userId(item) === id);
      return <button key={id} onClick={() => setter(list.filter((item) => item !== id))}><X size={12} />{owner?.name}</button>;
    })}</div>
  );
  const chooser = (key: "normal" | "primary" | "secondary", list: string[], setter: (ids: string[]) => void) => (
    <div className="owner-chooser">
      <div className="owner-dropdown-control" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOwnerOptionsOpen(null); }}>
        <div className={`select-like ${ownerOptionsOpen === key ? "open" : ""}`} onClick={() => setOwnerOptionsOpen(ownerOptionsOpen === key ? null : key)}><Search size={14} /><input value={query} onClick={(event) => { event.stopPropagation(); setOwnerOptionsOpen(ownerOptionsOpen === key ? null : key); }} onChange={(event) => { setQuery(event.target.value); setOwnerOptionsOpen(key); }} placeholder="Search / Select Owners" /><ChevronDown size={14} /></div>
        {ownerOptionsOpen === key && <div className="owner-options">{visible.map((owner) => {
          const id = userId(owner);
          return <button key={id} onClick={() => toggle(list, id, setter)}><span className={`check-box ${list.includes(id) ? "checked" : ""}`}>{list.includes(id) && <Check size={12} />}</span>{owner.name}</button>;
        })}</div>}
      </div>
      {chips(list, setter)}
    </div>
  );

  return (
    <Modal onClose={onClose} className="owner-modal">
      <div className="modal-heading-row"><strong>Select Booking Owners</strong><label><input type="checkbox" checked={advanced} onChange={(event) => setAdvanced(event.target.checked)} /> Advance Search</label></div>
      {!advanced ? (
        <><p>{normal.length} Owner(s) Selected</p>{chooser("normal", normal, setNormal)}</>
      ) : (
        <div className="advanced-owner-grid">
          <section><div className="section-title"><strong>Primary Owner(s)</strong><span>{primary.length} Owner(s) Selected</span></div>{chooser("primary", primary, setPrimary)}</section>
          <section><div className="section-title"><strong>Secondary Owner(s)</strong><span>{secondary.length} Owner(s) Selected</span></div>{chooser("secondary", secondary, setSecondary)}</section>
        </div>
      )}
      <div className="modal-footer"><button className="square-btn" onClick={() => { setNormal([]); setPrimary([]); setSecondary([]); }}><RefreshCcw size={15} /></button><button className="btn purple" onClick={() => { onApply(advanced ? { ownerIds: [], primaryOwnerIds: primary, secondaryOwnerIds: secondary } : { ownerIds: normal, primaryOwnerIds: [], secondaryOwnerIds: [] }); onClose(); }}>Apply</button></div>
    </Modal>
  );
}

export function Filters({
  filters, setFilters, owners, bookingTypes, calendar = false
}: {
  filters: FiltersState;
  setFilters: (next: FiltersState) => void;
  owners: UserSummary[];
  bookingTypes: LookupType[];
  calendar?: boolean;
}) {
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState<"booking" | "travel" | null>(null);
  const [bookingTypeOpen, setBookingTypeOpen] = useState(false);
  const selectedOwnerIds = [
    ...filters.ownerIds,
    ...filters.primaryOwnerIds,
    ...filters.secondaryOwnerIds
  ];
  const selectedOwnerNames = owners
    .filter((owner) => selectedOwnerIds.includes(userId(owner)))
    .map((owner) => owner.name)
    .filter(Boolean);
  const update = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => setFilters({ ...filters, [key]: value });
  const selectedBookingType = bookingTypes.find((type) => type._id === filters.bookingTypeIds[0]);
  const reset = () => setFilters({
    bookingDateFrom: "", bookingDateTo: "", travelDateFrom: "", travelDateTo: "", ownerIds: [], primaryOwnerIds: [], secondaryOwnerIds: [], bookingTypeIds: [], serviceTypeIds: [], search: "", includeIncomplete: false, sortBy: "updatedAt", sortOrder: "desc"
  });
  return (
    <>
      <section className="filters-panel">
        <DateRangePicker label="Booking Date" from={filters.bookingDateFrom} to={filters.bookingDateTo} open={dateOpen === "booking"} onOpen={() => { setBookingTypeOpen(false); setDateOpen("booking"); }} onClose={() => setDateOpen(null)} onChange={(bookingDateFrom, bookingDateTo) => setFilters({ ...filters, bookingDateFrom, bookingDateTo })} />
        <DateRangePicker label="Travel Date" from={filters.travelDateFrom} to={filters.travelDateTo} open={dateOpen === "travel"} onOpen={() => { setBookingTypeOpen(false); setDateOpen("travel"); }} onClose={() => setDateOpen(null)} onChange={(travelDateFrom, travelDateTo) => setFilters({ ...filters, travelDateFrom, travelDateTo })} />
        <div className="filter-field"><label>Booking Owner</label><button className="select-like owner-trigger" onClick={() => setOwnerOpen(true)}><span>{selectedOwnerNames.length ? `${selectedOwnerNames.length} owner(s) selected` : "Search / Select Owners"}</span><ChevronDown size={14} /></button></div>
        <div className="filter-field booking-type-field"><label>Booking Type</label><button type="button" className="booking-type-trigger" onClick={() => { setDateOpen(null); setBookingTypeOpen(!bookingTypeOpen); }}><span>{selectedBookingType?.name || "All Bookings"}</span><ChevronDown size={16} /></button>{bookingTypeOpen && <div className="booking-type-menu"><button type="button" className={!selectedBookingType ? "active" : ""} onClick={() => { update("bookingTypeIds", []); setBookingTypeOpen(false); }}>All Bookings</button>{bookingTypes.map((type) => <button type="button" className={selectedBookingType?._id === type._id ? "active" : ""} key={type._id} onClick={() => { update("bookingTypeIds", [type._id]); setBookingTypeOpen(false); }}>{type.name}</button>)}</div>}</div>
        <div className="filter-search"><div className="search-input">{calendar && <select aria-label="Search field"><option>Booking ID</option><option>Lead Pax</option></select>}<input value={filters.search} onChange={(e) => update("search", e.target.value)} placeholder={calendar ? "Type here" : "Search by ID / Lead Pax / Amount"} /><Search size={16} /></div><button className="square-btn" onClick={reset} title="Reset filters"><RefreshCcw size={16} /></button></div>
      </section>
      {(dateOpen || bookingTypeOpen) && <button type="button" className="filter-popover-backdrop" aria-label="Close filter dropdown" onClick={() => { setDateOpen(null); setBookingTypeOpen(false); }} />}
      {ownerOpen && <OwnerPicker owners={owners} filters={filters} onClose={() => setOwnerOpen(false)} onApply={(values) => setFilters({ ...filters, ...values })} />}
    </>
  );
}
