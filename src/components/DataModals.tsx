import { useState, type SubmitEvent } from "react";
import { Pencil } from "lucide-react";
import type {
  ApiBooking,
  ApiPayment,
  Booking,
  BookingWritePayload,
  PaymentWritePayload,
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
            <input required min="0" type="number" value={form.totalAmount} onChange={(event) => set("totalAmount", Number(event.target.value))} />
          </label>
          <label>
            Customer paid (₹)
            <input min="0" type="number" value={form.customerPaid} onChange={(event) => set("customerPaid", Number(event.target.value))} />
          </label>
          <label>
            Vendor paid (₹)
            <input min="0" type="number" value={form.vendorPaid} onChange={(event) => set("vendorPaid", Number(event.target.value))} />
          </label>
          <label>
            Vendor due (₹)
            <input min="0" type="number" value={form.vendorDue} onChange={(event) => set("vendorDue", Number(event.target.value))} />
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

const paymentBookingId = (payment: ApiPayment) =>
  payment.BookingID || payment.bookingId || "";

function initialPayment(
  booking: Booking,
  source?: ApiPayment,
): PaymentWritePayload {
  const party = source?.CustomerORVendor || source?.party || "Customer";
  return {
    PaymentID:
      source?.PaymentID ||
      source?.paymentId ||
      `PI-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    BookingID: source?.BookingID || source?.bookingId || booking.bookingId,
    Type: source?.Type || "Payment",
    CustomerORVendor: party,
    entityName:
      source?.entityName ||
      source?.partyName ||
      (party.toLowerCase() === "vendor"
        ? booking.serviceTypeIds[0]?.name
        : booking.leadPax.name),
    paymentDate: inputDate(source?.paymentDate || source?.date),
    amount: numberValue(source?.amount),
    currency: source?.currency || booking.currency,
    paymentMode: source?.paymentMode || source?.mode || "Bank Transfer",
    transactionRef: source?.transactionRef || source?.reference || "",
    notes: source?.notes || "",
    isAdvance: source?.isAdvance === true || source?.isAdvance === "true",
    documentUrl: source?.documentUrl || "",
    createdAt: source?.createdAt || today(),
  };
}

export function PaymentModal({
  booking,
  payments,
  busy,
  onClose,
  onSave,
}: {
  booking: Booking;
  payments: ApiPayment[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: PaymentWritePayload, id?: string) => void;
}) {
  const associated = payments.filter(
    (payment) => paymentBookingId(payment) === booking.bookingId,
  );
  const [editing, setEditing] = useState<ApiPayment>();
  const [form, setForm] = useState<PaymentWritePayload>(() =>
    initialPayment(booking),
  );
  const set = <K extends keyof PaymentWritePayload>(
    key: K,
    value: PaymentWritePayload[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const selectPayment = (payment: ApiPayment) => {
    setEditing(payment);
    setForm(initialPayment(booking, payment));
  };
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(
      { ...form, amount: numberValue(form.amount), createdAt: form.createdAt || today() },
      editing?.id,
    );
  };

  return (
    <Modal onClose={onClose} className="payment-modal">
      <div className="data-modal-title">
        <h2>Payments · {booking.bookingId}</h2>
        <p>Create a payment or select an existing payment to update it.</p>
      </div>
      {associated.length > 0 && (
        <div className="payment-history">
          {associated.map((payment) => (
            <button type="button" key={payment.id} onClick={() => selectPayment(payment)}>
              <span><strong>{payment.PaymentID || payment.paymentId || `Payment ${payment.id}`}</strong><small>{payment.paymentDate || payment.date}</small></span>
              <span>₹ {new Intl.NumberFormat("en-IN").format(numberValue(payment.amount))}<Pencil size={14} /></span>
            </button>
          ))}
        </div>
      )}
      {associated.length === 0 && <div className="payment-empty">No payment records exist for this booking yet.</div>}
      <form onSubmit={submit}>
        <h3>{editing ? `Edit ${editing.PaymentID || editing.paymentId || "payment"}` : "Record a payment"}</h3>
        <div className="data-form-grid">
          <label>
            Party
            <select value={form.CustomerORVendor} onChange={(event) => set("CustomerORVendor", event.target.value)}>
              <option>Customer</option><option>Vendor</option>
            </select>
          </label>
          <label>
            Entity name
            <input required value={form.entityName} onChange={(event) => set("entityName", event.target.value)} />
          </label>
          <label>
            Payment date
            <input required type="date" value={form.paymentDate} onChange={(event) => set("paymentDate", event.target.value)} />
          </label>
          <label>
            Amount (₹)
            <input required min="1" type="number" value={form.amount} onChange={(event) => set("amount", Number(event.target.value))} />
          </label>
          <label>
            Payment mode
            <select value={form.paymentMode} onChange={(event) => set("paymentMode", event.target.value)}>
              <option>Bank Transfer</option><option>UPI</option><option>Cash</option><option>Card</option><option>Cheque</option><option>Other</option>
            </select>
          </label>
          <label>
            Transaction reference
            <input value={form.transactionRef} onChange={(event) => set("transactionRef", event.target.value)} />
          </label>
        </div>
        <label className="data-notes">
          Notes
          <textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} />
        </label>
        <label className="data-check">
          <input type="checkbox" checked={Boolean(form.isAdvance)} onChange={(event) => set("isAdvance", event.target.checked)} />
          Advance payment
        </label>
        <div className="modal-footer">
          {editing && <button type="button" className="btn secondary" onClick={() => { setEditing(undefined); setForm(initialPayment(booking)); }}>New payment</button>}
          <button type="button" className="btn secondary" onClick={onClose}>Close</button>
          <button className="btn purple" disabled={busy}>{busy ? "Saving…" : editing ? "Update payment" : "Record payment"}</button>
        </div>
      </form>
    </Modal>
  );
}
