const reasonLabels: Record<string, string> = {
  profile_complete_bonus: "Melengkapi Profil",
  attendance: "Kehadiran",
  admin_adjustment: "Penyesuaian Admin",
};

export function getReasonLabel(reason: string): string {
  return reasonLabels[reason] || formatReason(reason);
}

function formatReason(reason: string): string {
  return reason
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
