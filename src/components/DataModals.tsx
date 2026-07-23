import { useState, type SubmitEvent } from "react";
import type {
  ApiBooking,
  BookingWritePayload,
} from "../types";
import { numberValue } from "../bookingData";
import { Modal } from "./Modal";

const today = () => new Date().toISOString().slice(0, 10);
const inputDate = (value?: string) => {
  if (!value) return today();
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? today() : parsed.toISOString().slice(0, 10);
};
const bookingNumber = () =>
  `BK-${Math.floor(10000 + Math.random() * 90000)}`;
const amountInputValue = (value: number | string) =>
  typeof value === "number" && value === 0 ? "" : value;

function initialBooking(source?: ApiBooking): BookingWritePayload {
  return {
    bookingId: source?.bookingId || bookingNumber(),
    leadPax: source?.leadPax || "",
    customerId: source?.customerId || `CU-${Date.now().toString().slice(-4)}`,
    customerName: source?.customerName || "",
    vendorId: source?.vendorId || `VE-${Date.now().toString().slice(-4)}`,
    vendorName: source?.vendorName || "",
    service: source?.service || "Flights",
    bookingDate: inputDate(source?.bookingDate),
    travelDate: inputDate(source?.travelDate),
    bookingType: source?.bookingType || "Limitless",
    bookingOwner: source?.bookingOwner || "",
    serviceStatus: source?.serviceStatus || "Confirmed",
    paymentStatus: source?.paymentStatus || "Pending",
    totalAmount: numberValue(source?.totalAmount),
    customerPaid: numberValue(source?.customerPaid),
    customerDue: numberValue(source?.customerDue),
    vendorPaid: numberValue(source?.vendorPaid),
    vendorDue: numberValue(source?.vendorDue),
    currency: source?.currency || "INR",
    isIncomplete: source?.isIncomplete === true || source?.isIncomplete === "true",
    isDeleted: false,
    createdAt: source?.createdAt || today(),
    modifiedAt: today(),
  };
}

export function BookingFormModal({
  source,
  busy,
  onClose,
  onSave,
}: {
  source?: ApiBooking;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: BookingWritePayload) => void;
}) {
  const [form, setForm] = useState<BookingWritePayload>(() =>
    initialBooking(source),
  );
  const set = <K extends keyof BookingWritePayload>(
    key: K,
    value: BookingWritePayload[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const total = numberValue(form.totalAmount);
    const customerPaid = numberValue(form.customerPaid);
    const vendorPaid = numberValue(form.vendorPaid);
    onSave({
      ...form,
      customerName: form.customerName || form.leadPax,
      totalAmount: total,
      customerPaid,
      customerDue: Math.max(0, total - customerPaid),
      vendorPaid,
      vendorDue: numberValue(form.vendorDue),
      modifiedAt: today(),
    });
  };

  return (
    <Modal onClose={onClose} className="data-form-modal">
      <div className="data-modal-title">
        <h2>{source ? "Edit booking" : "Create booking"}</h2>
        <p>
          {source
            ? "Update this session-created MockAPI record."
            : "This booking will be created in the supplied MockAPI."}
        </p>
      </div>
      <form onSubmit={submit}>
        <div className="data-form-grid">
          <label>
            Booking ID
            <input required value={form.bookingId} onChange={(event) => set("bookingId", event.target.value)} />
          </label>
          <label>
            Lead passenger
            <input required value={form.leadPax} onChange={(event) => set("leadPax", event.target.value)} />
          </label>
          <label>
            Customer name
            <input value={form.customerName} onChange={(event) => set("customerName", event.target.value)} />
          </label>
          <label>
            Vendor name
            <input required value={form.vendorName} onChange={(event) => set("vendorName", event.target.value)} />
          </label>
          <label>
            Service
            <select value={form.service} onChange={(event) => set("service", event.target.value)}>
              <option>Flights</option><option>Accommodation</option><option>Transportation</option>
              <option>Tours</option><option>Attraction Tickets</option><option>Visa</option><option>Others</option>
            </select>
          </label>
          <label>
            Booking type
            <select value={form.bookingType} onChange={(event) => set("bookingType", event.target.value)}>
              <option>Limitless</option><option>Other Services</option><option>On Ground</option>
            </select>
          </label>
          <label>
            Booking date
            <input required type="date" value={String(form.bookingDate)} onChange={(event) => set("bookingDate", event.target.value)} />
          </label>
          <label>
            Travel date
            <input required type="date" value={String(form.travelDate)} onChange={(event) => set("travelDate", event.target.value)} />
          </label>
          <label>
            Booking owner
            <input required value={form.bookingOwner} onChange={(event) => set("bookingOwner", event.target.value)} />
          </label>
          <label>
            Service status
            <select value={form.serviceStatus} onChange={(event) => set("serviceStatus", event.target.value)}>
              <option>Confirmed</option><option>Pending</option><option>Completed</option><option>Cancelled</option>
            </select>
          </label>
          <label>
            Total amount (₹)
            <input required min="0" type="number" value={amountInputValue(form.totalAmount)} onChange={(event) => set("totalAmount", event.target.value)} />
          </label>
          <label>
            Customer paid (₹)
            <input min="0" type="number" value={amountInputValue(form.customerPaid)} onChange={(event) => set("customerPaid", event.target.value)} />
          </label>
          <label>
            Vendor paid (₹)
            <input min="0" type="number" value={amountInputValue(form.vendorPaid)} onChange={(event) => set("vendorPaid", event.target.value)} />
          </label>
          <label>
            Vendor due (₹)
            <input min="0" type="number" value={amountInputValue(form.vendorDue)} onChange={(event) => set("vendorDue", event.target.value)} />
          </label>
        </div>
        <label className="data-check">
          <input type="checkbox" checked={Boolean(form.isIncomplete)} onChange={(event) => set("isIncomplete", event.target.checked)} />
          Mark booking as incomplete
        </label>
        <div className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn purple" disabled={busy}>{busy ? "Saving…" : source ? "Save changes" : "Create booking"}</button>
        </div>
      </form>
    </Modal>
  );
}
