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
