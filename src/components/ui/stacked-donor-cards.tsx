import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Heart, User, ChevronDown } from "lucide-react";

type Donor = {
  id: string;
  full_name: string;
  amount_paid: number | null;
  donor_message: string | null;
  paid_at: string;
};

interface StackedDonorCardsProps {
  donors: Donor[];
  timeAgo: (iso: string) => string;
}

export const StackedDonorCards = ({ donors, timeAgo }: StackedDonorCardsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set());

  // Trigger animation for new cards
  useEffect(() => {
    if (donors.length > 0) {
      const newCards = new Set<string>();
      donors.forEach((d) => newCards.add(d.id));
      setAnimatingCards(newCards);
      
      // Clear animation after it completes
      const timer = setTimeout(() => {
        setAnimatingCards(new Set());
      }, 600);
      
      return () => clearTimeout(timer);
    }
  }, [donors]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const displayDonors = donors.slice(0, 10);
  const visibleDonors = isExpanded ? displayDonors : displayDonors.slice(0, 3);

  return (
    <div className="relative w-full py-4">
      <div className={cn(
        "mx-auto max-w-[400px] relative transition-all duration-500 ease-out",
        isExpanded ? "min-h-[auto]" : "h-[200px]"
      )}>
        {/* Stacked Cards Container */}
        <div className="relative w-full">
          {displayDonors.map((item, index) => {
            const isVisible = index < visibleDonors.length;
            const isAnimating = animatingCards.has(item.id);
            
            // Calculate stack position
            let translateY = 0;
            let scale = 1;
            let zIndex = displayDonors.length - index;
            let opacity = 1;

            if (!isExpanded && index < 3) {
              // Stack effect when collapsed
              translateY = index * 15;
              scale = 1 - index * 0.05;
              opacity = 1 - index * 0.15;
            }

            return (
              <div
                key={item.id}
                className={cn(
                  "absolute left-0 right-0 w-full px-4 py-3 rounded-2xl border border-border/40 bg-white shadow-sm transition-all duration-500 ease-out",
                  isExpanded && "!relative !mb-3 !transform-none !opacity-100 !scale-100 !translate-y-0 !shadow-sm",
                  !isExpanded && !isVisible && "hidden",
                  isAnimating && "animate-in fade-in slide-in-from-top-2 duration-300"
                )}
                style={{
                  transform: !isExpanded && isVisible ? `translateY(${translateY}px) scale(${scale})` : undefined,
                  opacity: !isExpanded && isVisible ? opacity : undefined,
                  zIndex: !isExpanded && isVisible ? zIndex : undefined,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Avatar & Content */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/10">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-foreground truncate">{item.full_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">
                        {item.donor_message 
                          ? `"${item.donor_message}"` 
                          : item.amount_paid && item.amount_paid > 0 
                            ? "Memberikan Infaq" 
                            : "Memberikan Doa Terbaik"}
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount & Time */}
                  <div className="flex flex-col items-end shrink-0 gap-0.5">
                    {item.amount_paid && item.amount_paid > 0 && (
                      <span className="text-xs font-bold text-primary">
                        Rp {item.amount_paid.toLocaleString("id-ID")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(item.paid_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Spacer for stacked layout */}
        {!isExpanded && displayDonors.length > 0 && (
          <div className="h-[120px]" />
        )}
      </div>

      {/* Toggle Button */}
      {donors.length > 0 && (
        <div className={cn(
          "flex justify-center mt-6 transition-all duration-500",
          isExpanded && "mt-4"
        )}>
          <button
            onClick={toggleExpand}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-2.5 bg-background border border-border rounded-full shadow-sm text-xs font-semibold transition-all duration-300 hover:bg-accent/5 hover:border-accent/30",
              isExpanded && "bg-accent/5 border-accent/30"
            )}
          >
            <Heart className={cn(
              "w-3.5 h-3.5 transition-all duration-300",
              isExpanded ? "fill-rose-500 text-rose-500" : "text-rose-500"
            )} />
            <span>{isExpanded ? "Sembunyikan" : `Lihat Semua (${donors.length})`}</span>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 transition-transform duration-300",
              isExpanded && "rotate-180"
            )} />
          </button>
        </div>
      )}
    </div>
  );
};
