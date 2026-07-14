import {
  Building2, BusFront, Grid2X2, IdCard, PersonStanding, Plane, ShieldCheck, Ticket,
  type LucideIcon
} from "lucide-react";

const serviceIcons: Record<string, LucideIcon> = {
  FLIGHT: Plane,
  ACCOMMODATION: Building2,
  HOTEL: Building2,
  TRANSPORTATION: BusFront,
  TRANSPORTATION_LAND: BusFront,
  TICKET: Ticket,
  ATTRACTION: Ticket,
  ACTIVITY: PersonStanding,
  VISA: IdCard,
  TRAVEL_INSURANCE: ShieldCheck,
  INSURANCE: ShieldCheck,
  OTHER: Grid2X2,
  OTHERS: Grid2X2
};

export function ServiceIcon({ code, size = 15 }: { code?: string; size?: number }) {
  const Icon = serviceIcons[(code || "OTHER").toUpperCase()] ?? Grid2X2;
  return <Icon aria-hidden="true" size={size} strokeWidth={1.7} />;
}
