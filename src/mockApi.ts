import type {
  ApiBooking,
  ApiPayment,
  BookingWritePayload,
  PaymentWritePayload,
} from "./types";

function requiredMockApiUrl(): string {
  const value = import.meta.env.VITE_API_URL;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("VITE_API_URL is required in frontend/.env");
  }
  return value.replace(/\/+$/, "");
}

const MOCK_API_URL = requiredMockApiUrl();

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${MOCK_API_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error("Unable to reach the Ciergo MockAPI. Check your connection and try again.");
  }

  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String(body.message)
        : `MockAPI request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

export const bookingApi = {
  list: () => request<ApiBooking[]>("/Bookings"),
  create: (payload: BookingWritePayload) =>
    request<ApiBooking>("/Bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: BookingWritePayload) =>
    request<ApiBooking>(`/Bookings/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<ApiBooking>(`/Bookings/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};

export const paymentApi = {
  list: () => request<ApiPayment[]>("/Payments"),
  create: (payload: PaymentWritePayload) =>
    request<ApiPayment>("/Payments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: PaymentWritePayload) =>
    request<ApiPayment>(`/Payments/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
