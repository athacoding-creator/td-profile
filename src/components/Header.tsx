import { Link } from "react-router-dom";

export const Header = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="container flex items-center justify-center py-2">
        <Link to="/" className="flex items-center gap-2 font-display">
          <img
            src="https://res.cloudinary.com/dph1qdufr/image/upload/v1779515925/Logo_Teras_Dakwah_sievtn.png"
            alt="TD Logo"
            className="h-10 w-auto"
          />
        </Link>
      </div>
    </header>
  );
};
