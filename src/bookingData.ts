import type {
  ApiBooking,
  ApiPayment,
  ApprovalStatus,
  Booking,
  CalendarEvent,
  FiltersState,
  FinanceSummary,
  LookupType,
  Pagination,
  TabView,
  UserSummary,
} from "./types";

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";

export const numberValue = (value: number | string | undefined): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const booleanValue = (value: boolean | string | undefined): boolean =>
  value === true || String(value).toLowerCase() === "true";

export function isoDate(value: string | undefined): string {
  if (!value) return "1970-01-01T00:00:00.000Z";
  const dayFirst = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const parsed = dayFirst
    ? new Date(
        Number(dayFirst[3]),
        Number(dayFirst[2]) - 1,
        Number(dayFirst[1]),
      )
    : new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "1970-01-01T00:00:00.000Z"
    : parsed.toISOString();
}

export function bookingTypeLookup(name: string): LookupType {
  const normalized = name.trim() || "Other Services";
  return {
    _id: `booking-type-${slug(normalized)}`,
    code: normalized.toLowerCase() === "limitless" ? "LI" : "OS",
    name: normalized,
  };
}

export function serviceLookup(name: string): LookupType {
  const normalized = name.trim() || "Others";
  const lower = normalized.toLowerCase();
  let code = "OTHERS";
  if (lower.includes("flight")) code = "FLIGHT";
  else if (lower.includes("accommodation") || lower.includes("hotel"))
    code = "ACCOMMODATION";
  else if (lower.includes("transport") || lower.includes("car"))
    code = "TRANSPORTATION";
  else if (lower.includes("attraction") || lower.includes("ticket"))
    code = "TICKET";
  else if (lower.includes("tour") || lower.includes("activity"))
    code = "ACTIVITY";
  else if (lower.includes("visa")) code = "VISA";
  else if (lower.includes("insurance")) code = "TRAVEL_INSURANCE";
  return {
    _id: `service-${slug(normalized)}`,
    code,
    name: normalized,
    category: "OTHER_SERVICES",
  };
}

const paymentBookingId = (payment: ApiPayment): string =>
  String(payment.BookingID || payment.bookingId || "").trim();

const paymentParty = (payment: ApiPayment): "Customer" | "Vendor" =>
  String(payment.CustomerORVendor || payment.party || "Customer")
    .trim()
    .toLowerCase() === "vendor"
    ? "Vendor"
    : "Customer";

function paymentBreakdown(
  apiBooking: ApiBooking,
  payments: ApiPayment[],
): Booking["paymentBreakdown"] {
  const associated = payments.filter(
    (payment) => paymentBookingId(payment) === apiBooking.bookingId,
  );
  const customerPaid =
    associated
      .filter((payment) => paymentParty(payment) === "Customer")
      .reduce((total, payment) => total + numberValue(payment.amount), 0) * 100;
  const vendorPaid =
    associated
      .filter((payment) => paymentParty(payment) === "Vendor")
      .reduce((total, payment) => total + numberValue(payment.amount), 0) * 100;
  const customerTotal = numberValue(apiBooking.totalAmount) * 100;
  const vendorTotal =
    (numberValue(apiBooking.vendorPaid) + numberValue(apiBooking.vendorDue)) *
    100;

  return {
    customer: {
      paid: customerPaid,
      pending: Math.max(customerTotal - customerPaid, 0),
      total: customerTotal,
    },
    vendor: {
      paid: vendorPaid,
      pending: Math.max(vendorTotal - vendorPaid, 0),
      total: vendorTotal,
    },
  };
}

function cumulativePaymentStatus(
  breakdown: Booking["paymentBreakdown"],
): string {
  const paid = breakdown.customer.paid + breakdown.vendor.paid;
  const total = breakdown.customer.total + breakdown.vendor.total;
  if (paid <= 0) return "PENDING";
  if (total <= 0 || paid >= total) return "PAID";
  return "PARTIALLY_PAID";
}

function defaultApproval(apiBooking: ApiBooking): ApprovalStatus {
  return apiBooking.serviceStatus.toLowerCase() === "pending"
    ? "PENDING"
    : "NOT_REQUIRED";
}

function actionsFor(
  booking: ApiBooking,
  approval: ApprovalStatus,
  permissions: string[],
): string[] {
  const actions: string[] = [];
  if (booleanValue(booking.isDeleted)) {
    if (permissions.includes("bookings.restore")) actions.push("RESTORE");
    actions.push("DUPLICATE");
    return actions;
  }
  if (
    approval === "PENDING" &&
    permissions.some((permission) => permission.startsWith("bookings.approve"))
  ) {
    actions.push("APPROVE", "REJECT");
  }
  if (approval === "REJECTED") actions.push("SUBMIT_FOR_APPROVAL");
  else if (permissions.includes("payments.create")) actions.push("RECORD_PAYMENT");
  if (permissions.includes("bookings.edit")) actions.push("EDIT");
  if (permissions.includes("bookings.delete")) actions.push("DELETE");
  actions.push("LINK", "DUPLICATE");
  return actions;
}

export function toBooking(
  apiBooking: ApiBooking,
  index: number,
  payments: ApiPayment[],
  permissions: string[],
  sessionCreatedIds: Set<string>,
  approvalOverrides: Record<string, ApprovalStatus>,
): Booking {
  const resourceId =
    typeof apiBooking.ID === "string" && apiBooking.ID.trim()
      ? apiBooking.ID
      : undefined;
  const uiKey = resourceId
    ? `mockapi-${resourceId}`
    : `seed-${slug(apiBooking.bookingId)}-${index}`;
  const approval =
    approvalOverrides[apiBooking.bookingId] || defaultApproval(apiBooking);
  const ownerNames = apiBooking.bookingOwner
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const type = bookingTypeLookup(apiBooking.bookingType);
  const service = serviceLookup(apiBooking.service);
  const customerAmount = numberValue(apiBooking.totalAmount) * 100;
  const vendorAmount =
    (numberValue(apiBooking.vendorPaid) + numberValue(apiBooking.vendorDue)) *
    100;
  const breakdown = paymentBreakdown(apiBooking, payments);

  return {
    _id: uiKey,
    resourceId,
    sessionCreated: resourceId ? sessionCreatedIds.has(resourceId) : false,
    bookingId: apiBooking.bookingId || `Booking ${index + 1}`,
    customerName:
      apiBooking.customerName || apiBooking.leadPax || "Unknown customer",
    vendorName: apiBooking.vendorName || "Unknown vendor",
    leadPax: { name: apiBooking.leadPax || apiBooking.customerName || "—" },
    bookingDate: isoDate(apiBooking.bookingDate),
    travelStartDate: isoDate(apiBooking.travelDate),
    owners: (ownerNames.length ? ownerNames : ["Unassigned"]).map(
      (name, ownerIndex) => ({
        userId: {
          id: `owner-${slug(name)}`,
          name,
          initials: name
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
        },
        ownerType: ownerIndex === 0 ? "PRIMARY" : "SECONDARY",
      }),
    ),
    bookingTypeId: type,
    serviceTypeIds: [service],
    currency: apiBooking.currency || "INR",
    totals: {
      customerAmount,
      vendorAmount,
      grossMargin: customerAmount - vendorAmount,
    },
    pendingAmounts: {
      customer: breakdown.customer.pending,
      vendor: breakdown.vendor.pending,
    },
    paymentBreakdown: breakdown,
    bookingStatus: apiBooking.serviceStatus || "Pending",
    paymentStatus: cumulativePaymentStatus(breakdown),
    approval: {
      required: approval !== "NOT_REQUIRED",
      status: approval,
    },
    completion: {
      status: booleanValue(apiBooking.isIncomplete)
        ? "INCOMPLETE"
        : "COMPLETE",
      missingFields: [],
    },
    voucherAvailability: {
      bookingVoucher: false,
      customerInvoice: false,
      vendorVoucher: false,
      vendorInvoice: false,
    },
    openTaskCount: 0,
    isDeleted: booleanValue(apiBooking.isDeleted),
    allowedActions: actionsFor(apiBooking, approval, permissions),
  };
}

export function deriveLookups(bookings: Booking[]): {
  owners: UserSummary[];
  bookingTypes: LookupType[];
  serviceTypes: LookupType[];
} {
  const owners = new Map<string, UserSummary>();
  const bookingTypes = new Map<string, LookupType>();
  const serviceTypes = new Map<string, LookupType>();
  bookings.forEach((booking) => {
    booking.owners.forEach((owner) =>
      owners.set(owner.userId.id || owner.userId.name || "", owner.userId),
    );
    bookingTypes.set(booking.bookingTypeId._id, booking.bookingTypeId);
    booking.serviceTypeIds.forEach((service) =>
      serviceTypes.set(service._id, service),
    );
  });
  return {
    owners: [...owners.values()],
    bookingTypes: [...bookingTypes.values()],
    serviceTypes: [...serviceTypes.values()],
  };
}

function inRange(value: string, from: string, to: string): boolean {
  const time = new Date(value).getTime();
  return (!from || time >= new Date(from).getTime()) &&
    (!to || time <= new Date(`${to}T23:59:59`).getTime());
}

export function filterBookings(
  allBookings: Booking[],
  view: TabView,
  approvalStatus: ApprovalStatus | "ALL",
  filters: FiltersState,
): Booking[] {
  let result = allBookings.filter((booking) => {
    if (view === "DELETED") return booking.isDeleted;
    if (booking.isDeleted) return false;
    if (view === "APPROVALS")
      return (
        booking.approval.required &&
        (approvalStatus === "ALL" ||
          booking.approval.status === approvalStatus)
      );
    return !["PENDING", "REJECTED"].includes(booking.approval.status);
  });
  if (!filters.includeIncomplete)
    result = result.filter(
      (booking) => booking.completion.status === "COMPLETE",
    );
  result = result.filter(
    (booking) =>
      inRange(
        booking.bookingDate,
        filters.bookingDateFrom,
        filters.bookingDateTo,
      ) &&
      inRange(
        booking.travelStartDate,
        filters.travelDateFrom,
        filters.travelDateTo,
      ),
  );
  if (filters.ownerIds.length)
    result = result.filter((booking) =>
      booking.owners.some((owner) =>
        filters.ownerIds.includes(owner.userId.id || ""),
      ),
    );
  if (filters.primaryOwnerIds.length)
    result = result.filter((booking) =>
      booking.owners.some(
        (owner) =>
          owner.ownerType === "PRIMARY" &&
          filters.primaryOwnerIds.includes(owner.userId.id || ""),
      ),
    );
  if (filters.secondaryOwnerIds.length)
    result = result.filter((booking) =>
      booking.owners.some(
        (owner) =>
          owner.ownerType === "SECONDARY" &&
          filters.secondaryOwnerIds.includes(owner.userId.id || ""),
      ),
    );
  if (filters.bookingTypeIds.length)
    result = result.filter((booking) =>
      filters.bookingTypeIds.includes(booking.bookingTypeId._id),
    );
  if (filters.serviceTypeIds.length)
    result = result.filter((booking) =>
      booking.serviceTypeIds.some((service) =>
        filters.serviceTypeIds.includes(service._id),
      ),
    );
  if (filters.search.trim()) {
    const query = filters.search.trim().toLowerCase();
    result = result.filter(
      (booking) =>
        booking.bookingId.toLowerCase().includes(query) ||
        booking.leadPax.name.toLowerCase().includes(query) ||
        String(booking.totals.customerAmount / 100).includes(query),
    );
  }
  const direction = filters.sortOrder === "asc" ? 1 : -1;
  return [...result].sort((left, right) => {
    const leftValue =
      filters.sortBy === "amount"
        ? left.totals.customerAmount
        : new Date(
            filters.sortBy === "travelStartDate"
              ? left.travelStartDate
              : left.bookingDate,
          ).getTime();
    const rightValue =
      filters.sortBy === "amount"
        ? right.totals.customerAmount
        : new Date(
            filters.sortBy === "travelStartDate"
              ? right.travelStartDate
              : right.bookingDate,
          ).getTime();
    return (leftValue - rightValue) * direction;
  });
}

export function paginate(
  bookings: Booking[],
  page: number,
  limit: number,
): { data: Booking[]; pagination: Pagination } {
  const total = bookings.length;
  const totalPages = Math.ceil(total / limit);
  const safePage = totalPages ? Math.min(page, totalPages) : 1;
  const start = (safePage - 1) * limit;
  return {
    data: bookings.slice(start, start + limit),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      from: total ? start + 1 : 0,
      to: Math.min(start + limit, total),
    },
  };
}

export function financeSummary(bookings: Booking[]): FinanceSummary {
  const active = bookings.filter((booking) => !booking.isDeleted);
  const youGet = active.reduce(
    (total, booking) => total + booking.totals.customerAmount,
    0,
  );
  const youGive = active.reduce(
    (total, booking) => total + booking.totals.vendorAmount,
    0,
  );
  const net = youGet - youGive;
  return {
    currency: active[0]?.currency || "INR",
    youGive,
    youGet,
    net: Math.abs(net),
    netDirection: net > 0 ? "POSITIVE" : net < 0 ? "NEGATIVE" : "ZERO",
  };
}

export function calendarEvents(bookings: Booking[]): CalendarEvent[] {
  return bookings
    .filter((booking) => !booking.isDeleted)
    .map((booking, index) => {
      const start = new Date(booking.travelStartDate);
      start.setHours(9 + (index % 9), index % 2 ? 30 : 0, 0, 0);
      const status = booking.bookingStatus.toLowerCase();
      const operationalStatus: CalendarEvent["operationalStatus"] =
        status === "cancelled"
          ? "CANCELLED"
          : status === "completed"
            ? "COMPLETED"
            : start.getTime() > Date.now()
              ? "UPCOMING"
              : "ON_TRIP";
      return {
        _id: `calendar-${booking._id}`,
        bookingId: booking,
        serviceTypeId: booking.serviceTypeIds[0],
        title: booking.serviceTypeIds[0]?.name || "Booking",
        subTitle: booking.bookingTypeId.name,
        schedule: {
          startAt: start.toISOString(),
          timezone: "Asia/Kolkata",
          isAllDay: false,
        },
        operationalStatus,
      };
    });
}
