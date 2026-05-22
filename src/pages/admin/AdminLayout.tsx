import { NavLink, Outlet, useOutletContext, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import {
  LayoutDashboard, CalendarDays, Sparkles, Gift, Users, Settings as SettingsIcon, ShoppingBag, Image as ImageIcon, UserCircle, Download,
} from "lucide-react";
import { useAdminData, AdminData } from "./useAdminData";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/hero", label: "Hero", icon: ImageIcon },
  { to: "/admin/event", label: "Event", icon: CalendarDays },
  { to: "/admin/program", label: "Program", icon: Sparkles },
  { to: "/admin/pendaftar", label: "Pendaftar", icon: Users },
  { to: "/admin/akun", label: "Akun", icon: UserCircle },
  { to: "/admin/merchandise", label: "Merchandise", icon: ShoppingBag },
  { to: "/admin/penukaran", label: "Penukaran", icon: Gift },
  { to: "/admin/pengaturan", label: "Pengaturan", icon: SettingsIcon },
];

export default function AdminLayout() {
  const data = useAdminData();
  const location = useLocation();
  const isDashboard = location.pathname === "/admin" || location.pathname === "/admin/dashboard";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-3 sm:px-6 py-4 sm:py-6">
        <div className={isDashboard ? "" : "grid gap-4 sm:gap-6 md:grid-cols-[240px_1fr]"}>
          {!isDashboard && (
            <aside className="md:sticky md:top-24 md:self-start">
              <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible rounded-2xl bg-card p-2 sm:p-3" style={{ boxShadow: "var(--shadow-card)" }}>
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 whitespace-nowrap rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition ${
                        isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{label}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>
          )}
          <main className="min-w-0 space-y-4 sm:space-y-6 pb-12">
            <Outlet context={data} />
          </main>
        </div>
      </div>
    </div>
  );
}

export const useAdmin = () => useOutletContext<AdminData>();
