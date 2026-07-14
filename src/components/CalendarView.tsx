import { useMemo, useState } from "react";
import {
  CheckCircle2, ChevronLeft, ChevronRight, Clock3, Filter, History, MoreVertical, Pencil,
  Repeat2, Trash2
} from "lucide-react";
import type { CalendarEvent } from "../types";
import { Modal } from "./Modal";
import { ServiceIcon } from "./ServiceIcon";

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const shortDay = (date: Date) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" }).format(date);
const shortTime = (value: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
const statusClass: Record<string, string> = { COMPLETED: "completed", ON_TRIP: "on-trip", UPCOMING: "upcoming", CANCELLED: "cancelled" };

function DiagonalCircleArrow({ direction, className }: { direction: "down-left" | "up-right"; className: string }) {
  return <svg aria-hidden="true" className={className} width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    {direction === "down-left" ? <><path d="M16 8 8 16" /><path d="M8 10v6h6" /></> : <><path d="m8 16 8-8" /><path d="M10 8h6v6" /></>}
  </svg>;
}

function EventMenu({ event, onStatus, onReschedule }: { event: CalendarEvent; onStatus: (event: CalendarEvent) => void; onReschedule: (event: CalendarEvent) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="relative event-menu-wrap"><button className="icon-plain" onClick={() => setOpen(!open)}><MoreVertical size={16} /></button>{open && <div className="dropdown-menu calendar-menu">
    <button><DiagonalCircleArrow direction="down-left" className="green-icon" />You Got</button><button><DiagonalCircleArrow direction="up-right" className="red-icon" />You Gave</button>
    <button onClick={() => { setOpen(false); onReschedule(event); }}><History size={18} />Reschedule</button>
    <button onClick={() => { setOpen(false); onStatus(event); }}><Repeat2 size={18} />Change Status</button>
    <button className="blue"><Pencil size={18} />Edit</button><button className="danger"><Trash2 size={18} />Delete</button>
  </div>}</div>;
}

export function RescheduleModal({ event, onClose, onSave }: { event: CalendarEvent; onClose: () => void; onSave: (startAt: string, endAt?: string) => void }) {
  const local = (value?: string) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  const [start, setStart] = useState(local(event.schedule.startAt));
  const [end, setEnd] = useState(local(event.schedule.endAt));
  return <Modal onClose={onClose} className="reschedule-modal"><h2>Reschedule {event.bookingId.bookingId}</h2><p>{event.title}</p><label>Start date & time<input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label><label>End date & time<input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label><div className="modal-footer"><button className="btn secondary" onClick={onClose}>Cancel</button><button className="btn purple" onClick={() => onSave(new Date(start).toISOString(), end ? new Date(end).toISOString() : undefined)}>Save</button></div></Modal>;
}

export function StatusModal({ event, onClose, onSave }: { event: CalendarEvent; onClose: () => void; onSave: (status: CalendarEvent["operationalStatus"]) => void }) {
  const [status, setStatus] = useState(event.operationalStatus);
  return <Modal onClose={onClose} className="status-modal"><h2>Change Status</h2><p>{event.bookingId.bookingId} · {event.title}</p><div className="status-options">{(["UPCOMING", "ON_TRIP", "COMPLETED", "CANCELLED"] as const).map((item) => <button className={status === item ? "active" : ""} onClick={() => setStatus(item)} key={item}><i className={statusClass[item]} />{item.replace("_", " ")}</button>)}</div><div className="modal-footer"><button className="btn secondary" onClick={onClose}>Cancel</button><button className="btn purple" onClick={() => onSave(status)}>Apply</button></div></Modal>;
}

export function CalendarView({ events, from, loading, onPrevious, onNext, onStatus, onReschedule }: {
  events: CalendarEvent[];
  from: Date;
  loading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onStatus: (event: CalendarEvent) => void;
  onReschedule: (event: CalendarEvent) => void;
}) {
  const days = Array.from(
    { length: 7 },
    (_, index) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + index)
  );
  const hours = Array.from({ length: 10 }, (_, index) => index + 8);
  const hourHeight = 40;
  const grouped = useMemo(() => events.reduce<Record<string, CalendarEvent[]>>((result, event) => {
    (result[dayKey(new Date(event.schedule.startAt))] ??= []).push(event); return result;
  }, {}), [events]);
  const statusTotals = useMemo(() => events.reduce<Record<CalendarEvent["operationalStatus"], number>>((totals, event) => {
    totals[event.operationalStatus] += 1;
    return totals;
  }, { COMPLETED: 0, ON_TRIP: 0, UPCOMING: 0, CANCELLED: 0 }), [events]);
  const end = days[days.length - 1];
  return (
    <section className="timeline-section">
      <div className="timeline-title"><strong>Bookings Timeline</strong><button className="filter-button"><Filter size={14} /> Filter</button></div>
      <div className="timeline-card">
        <div className="timeline-toolbar">
          <div><button onClick={onPrevious}><ChevronLeft size={15} /></button><strong>{new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).format(from)} - {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).format(end)}</strong><button onClick={onNext}><ChevronRight size={15} /></button><span>Total&nbsp;&nbsp; {events.length}</span></div>
          <div className="legend"><span><i className="completed" />Completed&nbsp; {statusTotals.COMPLETED}</span><span><i className="on-trip" />On Trip&nbsp; {statusTotals.ON_TRIP}</span><span><i className="upcoming" />Upcoming&nbsp; {statusTotals.UPCOMING}</span><span><i className="cancelled" />Cancelled&nbsp; {statusTotals.CANCELLED}</span></div>
        </div>
        <div className={`timeline-scroll ${loading ? "loading" : ""}`}>
          <div className="time-axis"><div className="axis-head" />{hours.map((hour) => <div className="hour-label" key={hour}>{String(hour).padStart(2, "0")}:00</div>)}</div>
          <div className="days-grid">{days.map((day) => {
            const dayEvents = grouped[dayKey(day)] || [];
            const osCount = dayEvents.filter((event) => event.bookingId.bookingTypeId?.code === "OS").length;
            const liCount = dayEvents.filter((event) => event.bookingId.bookingTypeId?.code === "LI").length;
            return <div className="day-column" key={dayKey(day)}><div className="day-head"><strong>{shortDay(day)}</strong><div><span>OS&nbsp; {osCount}</span><span>Limitless&nbsp; {liCount}</span></div></div><div className="day-body">{hours.map((hour) => <div className="hour-line" key={hour} />)}{dayEvents.map((event) => {
              const eventDate = new Date(event.schedule.startAt);
              const minutes = (eventDate.getHours() - 8) * 60 + eventDate.getMinutes();
              const top = Math.max(7, minutes * (hourHeight / 60) + 7);
              const detail = event.route?.from && event.route?.to ? `${event.route.from} → ${event.route.to}` : event.subTitle;
              return <article className={`calendar-event ${statusClass[event.operationalStatus]}`} style={{ top }} key={event._id}><div className="event-top"><i /><button title={event.bookingId.bookingId}>{event.bookingId.bookingId}</button><span className="event-service-icon"><ServiceIcon code={event.serviceTypeId?.code} size={13} /></span><strong title={event.title}>{event.title}</strong><EventMenu event={event} onStatus={onStatus} onReschedule={onReschedule} /></div><div className="event-bottom"><Clock3 size={13} /><span>{shortTime(event.schedule.startAt)}</span><small title={detail}>{detail}</small></div></article>;
            })}</div></div>;
          })}</div>
        </div>
        {loading && <div className="calendar-loading"><CheckCircle2 size={22} />Loading timeline…</div>}
      </div>
    </section>
  );
}
