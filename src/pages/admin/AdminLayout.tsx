import { useLocation, NavLink, Outlet, useOutletContext } from "react-router-dom";
import { Header } from "@/components/Header";
import {
  LayoutDashboard, CalendarDays, Sparkles, Gift, Users, Settings as SettingsIcon, ShoppingBag, Image as ImageIcon, UserCircle, Download, ClipboardCheck, CreditCard, Camera, QrCode, Menu, X, Lock
} from "lucide-react";
import { useAdminData, AdminData } from "./useAdminData";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },

  { to: "/admin/event", label: "Event", icon: CalendarDays },
  { to: "/admin/program", label: "Program", icon: Sparkles },
  { to: "/admin/pendaftar", label: "Pendaftar", icon: Users },
  { to: "/admin/kehadiran", label: "Kehadiran", icon: ClipboardCheck },
  { to: "/admin/scan", label: "Scan QR", icon: Camera },
  { to: "/admin/reset-password", label: "Reset Password", icon: Lock },
  { to: "/admin/akun", label: "Akun", icon: UserCircle },
  { to: "/admin/pembayaran", label: "Pembayaran", icon: CreditCard },
  { to: "/admin/qris", label: "QRIS Manager", icon: QrCode },
  { to: "/admin/merchandise", label: "Merchandise", icon: ShoppingBag },
  { to: "/admin/penukaran", label: "Penukaran", icon: Gift },
  { to: "/admin/pengaturan", label: "Pengaturan", icon: SettingsIcon },
];

export default function AdminLayout() {
  const data = useAdminData();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isDashboard = location.pathname === "/admin" || location.pathname === "/admin/dashboard";

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 container px-4 sm:px-6 py-4 sm:py-6">
        <div className={isDashboard ? "" : "flex flex-col md:flex-row gap-6"}>
          {!isDashboard && (
            <>
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-full flex items-center justify-between bg-card p-3 rounded-2xl border border-border/60 shadow-sm mb-2 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </div>
                  <span className="font-bold text-sm">Menu Admin</span>
                </div>
              </button>

              {/* Sidebar / Mobile Menu */}
              <aside className={`
                md:w-[240px] md:sticky md:top-24 md:self-start z-40
                ${isMobileMenuOpen ? "fixed inset-0 top-[72px] bg-background/95 backdrop-blur-sm p-4 md:relative md:top-0 md:bg-transparent md:p-0 overflow-y-auto" : "hidden md:block"}
              `}>
                <nav className="flex flex-col gap-1.5 rounded-2xl bg-card p-2 sm:p-3 border border-border/60 shadow-sm">
                  <div className="px-3 py-2 mb-1 hidden md:block border-b border-border/40">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Navigasi Admin</p>
                  </div>
                  {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                            : "text-foreground hover:bg-muted"
                        }`
                      }
                    >
                      <Icon className={`h-5 w-5 ${location.pathname.startsWith(to) ? "" : "text-muted-foreground"}`} />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </nav>
              </aside>
            </>
          )}
          
          <main className="flex-1 min-w-0 space-y-6 pb-20">
            <Outlet context={data} />
          </main>
        </div>
      </div>
    </div>
  );
}

export const useAdmin = () => useOutletContext<AdminData>();
