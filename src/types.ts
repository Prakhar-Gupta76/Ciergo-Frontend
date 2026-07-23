export type ApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
export type TabView = "ACTIVE" | "DELETED" | "APPROVALS";

export interface UserSummary {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  initials?: string;
  avatarUrl?: string;
}

export interface BookingOwner {
  userId: UserSummary;
  ownerType: "PRIMARY" | "SECONDARY";
}

export interface LookupType {
  _id: string;
  code: string;
  name: string;
  iconKey?: string;
  category?: string;
  color?: string;
}

export interface Booking {
  _id: string;
  resourceId?: string;
  sessionCreated?: boolean;
  bookingId: string;
  leadPax: { name: string; phone?: string; email?: string };
  bookingDate: string;
  travelStartDate: string;
  travelEndDate?: string;
  owners: BookingOwner[];
  bookingTypeId: LookupType;
  serviceTypeIds: LookupType[];
  currency: string;
  totals: { customerAmount: number; vendorAmount: number; grossMargin: number };
  pendingAmounts?: { customer: number; vendor: number };
  bookingStatus: string;
  paymentStatus: string;
  approval: { required: boolean; status: ApprovalStatus };
  completion: { status: "COMPLETE" | "INCOMPLETE"; missingFields: string[] };
  voucherAvailability: Record<string, boolean>;
  openTaskCount: number;
  isDeleted: boolean;
  allowedActions: string[];
}

export interface ApiBooking {
  ID?: string;
  bookingId: string;
  leadPax: string;
  customerId: string;
  customerName: string;
  vendorId: string;
  vendorName: string;
  service: string;
  bookingDate: string;
  travelDate: string;
  bookingType: string;
  bookingOwner: string;
  serviceStatus: string;
  paymentStatus: string;
  totalAmount: number | string;
  customerPaid: number | string;
  customerDue: number | string;
  vendorPaid: number | string;
  vendorDue: number | string;
  currency: string;
  isIncomplete: boolean | string;
  isDeleted: boolean | string;
  createdAt: string;
  modifiedAt: string;
}

export interface ApiPayment {
  id: string;
  PaymentID?: string;
  BookingID?: string;
  Type?: string;
  CustomerORVendor?: string;
  entityName?: string;
  paymentDate?: string;
  amount: number | string;
  currency?: string;
  paymentMode?: string;
  transactionRef?: string;
  notes?: string;
  isAdvance?: boolean | string;
  documentUrl?: string;
  createdAt?: string;
  paymentId?: string;
  bookingId?: string;
  party?: string;
  partyName?: string;
  date?: string;
  mode?: string;
  reference?: string;
  status?: string;
}

export type BookingWritePayload = Omit<ApiBooking, "ID">;
export type PaymentWritePayload = Omit<ApiPayment, "id">;

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  permissions: string[];
}

export interface FinanceSummary {
  currency: string;
  youGive: number;
  youGet: number;
  net: number;
  netDirection: "POSITIVE" | "NEGATIVE" | "ZERO";
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
}

export interface CalendarEvent {
  _id: string;
  bookingId: Booking;
  serviceTypeId: LookupType;
  title: string;
  subTitle?: string;
  schedule: { startAt: string; endAt?: string; timezone: string; isAllDay: boolean };
  route?: { from?: string; to?: string };
  operationalStatus: "UPCOMING" | "ON_TRIP" | "COMPLETED" | "CANCELLED";
}

export interface FiltersState {
  bookingDateFrom: string;
  bookingDateTo: string;
  travelDateFrom: string;
  travelDateTo: string;
  ownerIds: string[];
  primaryOwnerIds: string[];
  secondaryOwnerIds: string[];
  bookingTypeIds: string[];
  serviceTypeIds: string[];
  search: string;
  includeIncomplete: boolean;
  sortBy: "updatedAt" | "travelStartDate" | "amount";
  sortOrder: "asc" | "desc";
}
