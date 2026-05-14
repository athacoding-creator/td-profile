import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Shield } from "lucide-react";

export const Header = () => {
  const { isAdmin } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="container flex items-center justify-between py-5">
        <Link to="/" className="flex items-center gap-2 font-display">
          <img
            src="https://res.cloudinary.com/dfjvcvbsn/image/upload/v1768960205/TD_Logo_anxcwb.png"
            alt="TD Logo"
            className="h-10 w-auto"
          />
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Shield className="h-3.5 w-3.5" /> Admin
          </Link>
        )}
      </div>
    </header>
  );
};
