import {
  useEffect,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from "react";
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { numberValue } from "../bookingData";
import type {
  ApiPayment,
  Booking,
  PaymentAdditionalEntry,
  PaymentAdditionalEntryType,
  PaymentParty,
  PaymentSheetMode,
  PaymentWritePayload,
} from "../types";

const today = () => new Date().toISOString().slice(0, 10);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const entryLabels: Record<PaymentAdditionalEntryType, string> = {
  DEPOSIT_INCENTIVE: "Deposit / Incentive",
  CASHBACK: "Cashback",
  BANK_CHARGES: "Bank Charges",
};

const inputDate = (value?: string): string => {
  if (!value) return today();
  const dayFirst = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dayFirst) return `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? today()
    : parsed.toISOString().slice(0, 10);
};

const paymentBookingId = (payment: ApiPayment) =>
  String(payment.BookingID || payment.bookingId || "").trim();

const paymentBusinessId = (payment: ApiPayment) =>
  String(payment.PaymentID || payment.paymentId || `Payment ${payment.id}`);

const paymentParty = (payment: ApiPayment): PaymentParty =>
  String(payment.CustomerORVendor || payment.party || "Customer")
    .trim()
    .toLowerCase() === "vendor"
    ? "Vendor"
    : "Customer";

const booleanValue = (value: boolean | string | undefined) =>
  value === true || String(value).toLowerCase() === "true";

const amountInputValue = (value: number | string | undefined) =>
  typeof value === "number" && value === 0 ? "" : value;

function randomIndex(length: number): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
}

function createSuffix(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const numbers = "0123456789";
  const all = `${letters}${numbers}`;
  const values = [
    letters[randomIndex(letters.length)],
    letters[randomIndex(letters.length)],
    numbers[randomIndex(numbers.length)],
    numbers[randomIndex(numbers.length)],
    all[randomIndex(all.length)],
  ];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapWith = randomIndex(index + 1);
    [values[index], values[swapWith]] = [values[swapWith], values[index]];
  }
  return values.join("");
}

function generatePaymentId(
  party: PaymentParty,
  payments: ApiPayment[],
): string {
  const existing = new Set(payments.map(paymentBusinessId));
  const prefix = party === "Customer" ? "PI" : "PO";
  let candidate = "";
  do candidate = `${prefix}-${createSuffix()}`;
  while (existing.has(candidate));
  return candidate;
}

function emptyEntries(paymentId: string): PaymentAdditionalEntry[] {
  return (Object.keys(entryLabels) as PaymentAdditionalEntryType[]).map(
    (type) => ({
      type,
      amount: 0,
      reference: "",
      parentPaymentId: paymentId,
    }),
  );
}

function normalizeEntries(
  payment: ApiPayment | undefined,
  paymentId: string,
): PaymentAdditionalEntry[] {
  const source = Array.isArray(payment?.additionalEntries)
    ? payment.additionalEntries
    : [];
  return emptyEntries(paymentId).map((fallback) => {
    const entry = source.find((item) => item.type === fallback.type);
    return entry
      ? {
          type: fallback.type,
          amount: numberValue(entry.amount),
          reference: String(entry.reference || ""),
          parentPaymentId: paymentId,
        }
      : fallback;
  });
}

function paymentName(booking: Booking, party: PaymentParty): string {
  return party === "Customer" ? booking.customerName : booking.vendorName;
}

function outstandingAmount(booking: Booking, party: PaymentParty): number {
  const pending =
    party === "Customer"
      ? booking.paymentBreakdown.customer.pending
      : booking.paymentBreakdown.vendor.pending;
  return pending / 100;
}

function initialPayment(
  booking: Booking,
  payments: ApiPayment[],
  source?: ApiPayment,
): PaymentWritePayload {
  const party = source ? paymentParty(source) : "Customer";
  const paymentId = source
    ? paymentBusinessId(source)
    : generatePaymentId(party, payments);
  return {
    PaymentID: paymentId,
    BookingID: booking.bookingId,
    Type: source?.Type || "Payment",
    CustomerORVendor: party,
    entityName:
      source?.entityName ||
      source?.partyName ||
      paymentName(booking, party),
    paymentDate: inputDate(source?.paymentDate || source?.date),
    amount: source
      ? numberValue(source.amount)
      : outstandingAmount(booking, party),
    currency: source?.currency || "INR",
    paymentMode: source?.paymentMode || source?.mode || "Bank Transfer",
    transactionRef:
      source?.transactionRef || source?.reference || "",
    notes: source?.notes || "",
    isAdvance: booleanValue(source?.isAdvance),
    documentUrl: source?.documentUrl || "",
    documentName: source?.documentName || "",
    documentType: source?.documentType || "",
    documentSize: numberValue(source?.documentSize),
    additionalEntries: normalizeEntries(source, paymentId),
    createdAt: source?.createdAt || new Date().toISOString(),
  };
}

const money = (value: number | string | undefined, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numberValue(value));

const displayDate = (value?: string) => {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(parsed);
};

function PaymentList({
  booking,
  payments,
  onCreate,
  onOpen,
}: {
  booking: Booking;
  payments: ApiPayment[];
  onCreate: () => void;
  onOpen: (payment: ApiPayment, mode: "VIEW" | "EDIT") => void;
}) {
  const associated = payments.filter(
    (payment) => paymentBookingId(payment) === booking.bookingId,
  );
  return (
    <div className="payment-list-view">
      <div className="payment-list-heading">
        <div>
          <h3>Recorded payments</h3>
          <p>
            {associated.length} payment{associated.length === 1 ? "" : "s"} for{" "}
            {booking.bookingId}
          </p>
        </div>
        <button className="btn purple" onClick={onCreate}>
          <Plus size={16} />
          Record Payment
        </button>
      </div>
      {associated.length === 0 ? (
        <div className="payment-list-empty">
          <FileText size={28} />
          <strong>No payments recorded</strong>
          <span>Record the first payment against this booking.</span>
        </div>
      ) : (
        <div className="payment-records">
          {associated.map((payment) => (
            <article className="payment-record" key={payment.id}>
              <div className="payment-record-main">
                <span className="payment-record-id">
                  {paymentBusinessId(payment)}
                </span>
                <strong>
                  {money(payment.amount, payment.currency || booking.currency)}
                </strong>
                <small>
                  {paymentParty(payment)} ·{" "}
                  {payment.paymentMode || payment.mode || "—"}
                </small>
              </div>
              <div className="payment-record-meta">
                <span>{displayDate(payment.paymentDate || payment.date)}</span>
                <span
                  className={`payment-record-status ${
                    booleanValue(payment.isAdvance) ? "advance" : ""
                  }`}
                >
                  {booleanValue(payment.isAdvance)
                    ? "Advance"
                    : payment.status || "Recorded"}
                </span>
              </div>
              <div className="payment-record-actions">
                <button onClick={() => onOpen(payment, "VIEW")}>
                  <Eye size={15} />
                  View
                </button>
                <button onClick={() => onOpen(payment, "EDIT")}>
                  <Pencil size={15} />
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function PaymentSidesheet({
  booking,
  payments,
  initialMode,
  busy,
  onClose,
  onSave,
}: {
  booking: Booking;
  payments: ApiPayment[];
  initialMode: PaymentSheetMode;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: PaymentWritePayload, id?: string) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<PaymentSheetMode>(initialMode);
  const [editing, setEditing] = useState<ApiPayment>();
  const [form, setForm] = useState<PaymentWritePayload>(() =>
    initialPayment(booking, payments),
  );
  const [expanded, setExpanded] = useState<
    Set<PaymentAdditionalEntryType>
  >(() => new Set());
  const [advancePrompt, setAdvancePrompt] = useState(false);
  const [fileError, setFileError] = useState("");
  const readOnly = mode === "VIEW";
  const listMode = mode === "LIST";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !advancePrompt) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [advancePrompt, onClose]);

  const set = <K extends keyof PaymentWritePayload>(
    key: K,
    value: PaymentWritePayload[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setEditing(undefined);
    setForm(initialPayment(booking, payments));
    setExpanded(new Set());
    setMode("CREATE");
  };

  const openPayment = (payment: ApiPayment, nextMode: "VIEW" | "EDIT") => {
    setEditing(payment);
    setForm(initialPayment(booking, payments, payment));
    setExpanded(
      new Set(
        (payment.additionalEntries || [])
          .filter(
            (entry) =>
              numberValue(entry.amount) > 0 || Boolean(entry.reference),
          )
          .map((entry) => entry.type),
      ),
    );
    setMode(nextMode);
  };

  const changeParty = (party: PaymentParty) => {
    const currentId = String(form.PaymentID || "");
    const suffix = currentId.includes("-")
      ? currentId.split("-").slice(1).join("-")
      : createSuffix();
    const paymentId = `${party === "Customer" ? "PI" : "PO"}-${suffix}`;
    setForm((current) => ({
      ...current,
      PaymentID: paymentId,
      CustomerORVendor: party,
      entityName: paymentName(booking, party),
      amount: outstandingAmount(booking, party),
      additionalEntries: (current.additionalEntries || []).map((entry) => ({
        ...entry,
        parentPaymentId: paymentId,
      })),
    }));
  };

  const updateEntry = (
    type: PaymentAdditionalEntryType,
    field: "amount" | "reference",
    value: number | string,
  ) =>
    setForm((current) => ({
      ...current,
      additionalEntries: (current.additionalEntries || []).map((entry) =>
        entry.type === type ? { ...entry, [field]: value } : entry,
      ),
    }));

  const toggleEntry = (type: PaymentAdditionalEntryType) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setFileError("Please select a file smaller than 5 MB.");
      return;
    }
    setFileError("");
    set("documentName", file.name);
    set("documentType", file.type || "application/octet-stream");
    set("documentSize", file.size);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => set("documentUrl", String(reader.result || ""));
      reader.readAsDataURL(file);
    } else {
      set("documentUrl", "");
    }
  };

  const removeFile = () => {
    set("documentUrl", "");
    set("documentName", "");
    set("documentType", "");
    set("documentSize", 0);
    setFileError("");
  };

  const save = async (asAdvance: boolean) => {
    const payload: PaymentWritePayload = {
      ...form,
      PaymentID: String(form.PaymentID),
      BookingID: booking.bookingId,
      CustomerORVendor: form.CustomerORVendor || "Customer",
      amount: numberValue(form.amount),
      isAdvance: asAdvance || booleanValue(form.isAdvance),
      additionalEntries: (form.additionalEntries || [])
        .filter(
          (entry) =>
            expanded.has(entry.type) &&
            (numberValue(entry.amount) > 0 || entry.reference.trim()),
        )
        .map((entry) => ({
          ...entry,
          amount: numberValue(entry.amount),
          parentPaymentId: String(form.PaymentID),
        })),
    };
    const saved = await onSave(payload, editing?.id);
    if (saved) onClose();
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save(false);
  };

  const requestAdvance = (event: React.MouseEvent<HTMLButtonElement>) => {
    const formElement = event.currentTarget.form;
    if (!formElement?.checkValidity()) {
      formElement?.reportValidity();
      return;
    }
    setAdvancePrompt(true);
  };

  const title = listMode
    ? "Payments"
    : String(form.PaymentID || "Payment");

  return (
    <div className="sidesheet-layer" aria-live="polite">
      <button
        className="sidesheet-backdrop"
        aria-label="Close payment sidesheet"
        onClick={onClose}
      />
      <aside
        className="payment-sidesheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-sidesheet-title"
      >
        <header className="payment-sheet-header">
          <div>
            <div className="payment-sheet-title-row">
              {!listMode && mode !== "CREATE" && (
                <button
                  className="payment-back"
                  aria-label="Back to payments"
                  onClick={() => setMode("LIST")}
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <h2 id="payment-sidesheet-title">{title}</h2>
            </div>
            <p>Booking ID: {booking.bookingId}</p>
          </div>
          <button
            className="payment-sheet-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>

        {listMode ? (
          <PaymentList
            booking={booking}
            payments={payments}
            onCreate={openCreate}
            onOpen={openPayment}
          />
        ) : (
          <form className="payment-sheet-form" onSubmit={submit}>
            <div className="payment-sheet-body">
              <section className="payment-party-section">
                <span className="payment-field-label">Payment for</span>
                <div className="party-radios">
                  {(["Customer", "Vendor"] as PaymentParty[]).map((party) => (
                    <label
                      key={party}
                      className={
                        form.CustomerORVendor === party ? "selected" : ""
                      }
                    >
                      <input
                        type="radio"
                        name="payment-party"
                        value={party}
                        checked={form.CustomerORVendor === party}
                        disabled={readOnly}
                        onChange={() => changeParty(party)}
                      />
                      <span />
                      {party}
                    </label>
                  ))}
                </div>
                <div className="payment-entity">
                  <small>
                    {form.CustomerORVendor === "Vendor"
                      ? "Vendor Name"
                      : "Customer Name"}
                  </small>
                  <strong>{form.entityName}</strong>
                </div>
              </section>

              <div className="payment-fields">
                <label>
                  <span>Payment Date</span>
                  <input
                    required
                    type="date"
                    value={String(form.paymentDate || "")}
                    disabled={readOnly}
                    onChange={(event) =>
                      set("paymentDate", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Amount</span>
                  <div className="amount-input">
                    <b>₹</b>
                    <input
                      required
                      min="0"
                      step="0.01"
                      type="number"
                      value={amountInputValue(form.amount)}
                      disabled={readOnly}
                      onChange={(event) =>
                        set("amount", event.target.value)
                      }
                    />
                  </div>
                </label>
                <label>
                  <span>Currency</span>
                  <div className="sheet-select">
                    <select
                      value={form.currency}
                      disabled={readOnly}
                      onChange={(event) =>
                        set("currency", event.target.value)
                      }
                    >
                      <option>INR</option>
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                      <option>AED</option>
                    </select>
                    <ChevronDown size={15} />
                  </div>
                </label>
                <label>
                  <span>Payment Mode</span>
                  <div className="sheet-select">
                    <select
                      value={form.paymentMode}
                      disabled={readOnly}
                      onChange={(event) =>
                        set("paymentMode", event.target.value)
                      }
                    >
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                      <option>UPI</option>
                      <option>Cheque</option>
                      <option>Card</option>
                    </select>
                    <ChevronDown size={15} />
                  </div>
                </label>
                <label className="full-width">
                  <span>Transaction Reference / UTR</span>
                  <input
                    type="text"
                    value={form.transactionRef}
                    disabled={readOnly}
                    placeholder="Enter reference number"
                    onChange={(event) =>
                      set("transactionRef", event.target.value)
                    }
                  />
                </label>
                <label className="full-width">
                  <span>Notes</span>
                  <textarea
                    value={form.notes}
                    disabled={readOnly}
                    placeholder="Add any notes"
                    onChange={(event) => set("notes", event.target.value)}
                  />
                </label>
              </div>

              <section className="additional-payment-section">
                <div className="payment-section-heading">
                  <h3>Additional Entries</h3>
                  <p>Optional entries linked to {form.PaymentID}</p>
                </div>
                {(form.additionalEntries || []).map((entry) => {
                  const isOpen = expanded.has(entry.type);
                  return (
                    <div
                      className={`additional-entry ${isOpen ? "open" : ""}`}
                      key={entry.type}
                    >
                      <button
                        type="button"
                        onClick={() => toggleEntry(entry.type)}
                      >
                        <span>{entryLabels[entry.type]}</span>
                        <Plus size={17} />
                      </button>
                      {isOpen && (
                        <div className="additional-entry-fields">
                          <label>
                            <span>Amount</span>
                            <div className="amount-input">
                              <b>₹</b>
                              <input
                                min="0"
                                step="0.01"
                                type="number"
                                value={amountInputValue(entry.amount)}
                                disabled={readOnly}
                                onChange={(event) =>
                                  updateEntry(
                                    entry.type,
                                    "amount",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label>
                            <span>Reference</span>
                            <input
                              value={entry.reference}
                              disabled={readOnly}
                              placeholder="Enter reference"
                              onChange={(event) =>
                                updateEntry(
                                  entry.type,
                                  "reference",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>

              <section className="payment-document-section">
                <div className="payment-section-heading">
                  <h3>Upload Document</h3>
                  <p>Images and documents up to 5 MB</p>
                </div>
                {form.documentName ? (
                  <div className="payment-file">
                    <div className="payment-file-preview">
                      {form.documentUrl &&
                      String(form.documentType).startsWith("image/") ? (
                        <img
                          src={form.documentUrl}
                          alt={String(form.documentName)}
                        />
                      ) : String(form.documentType).startsWith("image/") ? (
                        <ImageIcon size={22} />
                      ) : (
                        <FileText size={22} />
                      )}
                    </div>
                    <div>
                      <strong>{form.documentName}</strong>
                      <small>
                        {numberValue(form.documentSize)
                          ? `${(
                              numberValue(form.documentSize) /
                              1024 /
                              1024
                            ).toFixed(2)} MB`
                          : "Attached document"}
                      </small>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        aria-label="Remove attachment"
                        onClick={removeFile}
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>
                ) : readOnly ? (
                  <div className="payment-no-document">
                    No document attached
                  </div>
                ) : (
                  <label className="attach-document">
                    <Paperclip size={18} />
                    Attach Screenshot / Document
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={selectFile}
                    />
                  </label>
                )}
                {fileError && <p className="file-error">{fileError}</p>}
              </section>

              {booleanValue(form.isAdvance) && (
                <div className="advance-badge">Advance payment</div>
              )}
              {!readOnly && (
                <button
                  type="button"
                  className="advance-payment-cta"
                  onClick={requestAdvance}
                >
                  <Plus size={16} />
                  Record as Advance Payment
                </button>
              )}
            </div>

            <footer className="payment-sheet-footer">
              {readOnly ? (
                <>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setMode("LIST")}
                  >
                    Back to Payments
                  </button>
                  <button
                    type="button"
                    className="btn purple"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button className="btn purple" disabled={busy}>
                    {busy
                      ? "Saving…"
                      : mode === "EDIT"
                        ? "Update Payment"
                        : "Record Payment"}
                  </button>
                </>
              )}
            </footer>
          </form>
        )}

        {advancePrompt && (
          <div className="advance-confirm-layer">
            <div className="advance-confirm" role="alertdialog">
              <h3>Record advance payment?</h3>
              <p>
                This will log {money(form.amount, form.currency)} as an advance
                against {form.entityName}.
              </p>
              <div>
                <button
                  className="btn secondary"
                  onClick={() => setAdvancePrompt(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn purple"
                  disabled={busy}
                  onClick={() => {
                    setAdvancePrompt(false);
                    void save(true);
                  }}
                >
                  Yes, Record Advance
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
