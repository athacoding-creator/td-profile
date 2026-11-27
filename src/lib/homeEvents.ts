export type HomeEventWithStart = {
  starts_at: string;
};

/**
 * Places events that have not started yet first (nearest start first),
 * followed by events that have already started (most recent start first).
 */
export function sortHomeEvents<T extends HomeEventWithStart>(
  events: readonly T[],
  now: Date = new Date(),
): T[] {
  const nowTime = now.getTime();

  return [...events].sort((a, b) => {
    const aTime = new Date(a.starts_at).getTime();
    const bTime = new Date(b.starts_at).getTime();
    const aUpcoming = aTime >= nowTime;
    const bUpcoming = bTime >= nowTime;

    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? aTime - bTime : bTime - aTime;
  });
}
