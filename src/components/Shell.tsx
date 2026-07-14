import type { ReactNode } from "react";
import {
  Bell, Blocks, BriefcaseBusiness, CalendarDays, ChartNoAxesColumnIncreasing, ChevronDown,
  ChevronRight, ClipboardList, ContactRound, FileChartColumn, House, LayoutDashboard,
  PanelLeftClose, Search, Settings, SquareCheckBig, WalletCards
} from "lucide-react";

const navItems = [
  ["Dashboard", LayoutDashboard], ["Sales", ChartNoAxesColumnIncreasing], ["Operations", Blocks], ["Bookings", BriefcaseBusiness],
  ["Approvals", SquareCheckBig], ["Content", ClipboardList], ["Finance", WalletCards], ["Directory", ContactRound], ["Reports", FileChartColumn]
] as const;

export function Shell({
  children, page, onCalendar, selectionActions, summary
}: {
  children: ReactNode;
  page: "bookings" | "calendar";
  onCalendar: () => void;
  selectionActions?: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row"><span className="brand">ciergo</span><PanelLeftClose size={16} /></div>
        <nav>
          {navItems.map(([label, Icon]) => (
            <button key={label} className={`nav-item ${label === "Finance" ? "active" : ""}`}>
              <Icon size={16} /><span>{label}</span>{["Sales", "Approvals", "Finance", "Directory"].includes(label) && <ChevronRight size={13} />}
            </button>
          ))}
        </nav>
        <button className="nav-item settings"><Settings size={16} /><span>Settings</span><ChevronRight size={13} /></button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <House size={14} /><span>/</span><span>Finance</span><span>/</span>
            {page === "calendar" && <><span>Bookings</span><span>/</span></>}
            <span className="current">{page === "calendar" ? "Booking Calendar" : "Bookings"}</span>
          </div>
          <div className="command-search"><Search size={17} /><input placeholder="Search or type command..." /><kbd>⌘</kbd><span>K</span></div>
          <div className="user-area">
            <button className="bell icon-plain"><Bell size={18} /><i /></button>
            <div className="divider" />
            <img src="https://ui-avatars.com/api/?name=Yash+Manocha&background=533089&color=fff" alt="Yash Manocha" />
            <div><strong>Yash Manocha</strong><small>Sales Lead</small></div>
          </div>
        </header>

        <div className="summary-action-row">
          {summary ?? <div />}
          <div className="header-actions">
            {selectionActions ?? (page === "bookings" ? (
              <>
                <button className="more-actions"><span>More Actions</span><span className="split"><ChevronDown size={14} /></span></button>
                <button className="square-btn" onClick={onCalendar} title="Booking calendar"><CalendarDays size={17} /></button>
              </>
            ) : <button className="square-btn purple" onClick={onCalendar} title="Back to bookings"><CalendarDays size={18} /></button>)}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
