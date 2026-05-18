import { Home, Calendar, Ticket, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/", icon: Home, label: "Beranda" },
  { to: "/event", icon: Calendar, label: "Event" },
  { to: "/riwayat", icon: Ticket, label: "Riwayat" },
  { to: "/profil", icon: User, label: "Profil" },
];

export const BottomNav = () => (
  <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[480px] border-t border-border/60 bg-card/95 backdrop-blur-md">
    <div className="grid grid-cols-4">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `relative flex flex-col items-center gap-1 py-3 text-xs transition ${
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 h-0.5 w-10 rounded-b-full bg-accent" />
              )}
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);
