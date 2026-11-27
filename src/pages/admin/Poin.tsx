import { useMemo, useState } from "react";
import { Award, ChevronDown } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { buildAttendancePointSummary } from "@/lib/pointSummary";

export default function Poin() {
  const data = useAdmin();
  const [selectedProgramId, setSelectedProgramId] = useState("");

  const eventProgramById = useMemo(
    () => new Map(data.events.map((event) => [event.id, event.program_id])),
    [data.events],
  );
  const selectedProgram = data.programs.find((program) => program.id === selectedProgramId);
  const rows = useMemo(
    () => buildAttendancePointSummary(data.attendance, eventProgramById, selectedProgramId),
    [data.attendance, eventProgramById, selectedProgramId],
  );
  const selectedPoints = rows.reduce((sum, row) => sum + row.programPoints, 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Poin User</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Total poin ditampilkan terlebih dahulu. Pilih program untuk melihat rincian poin per event/program.
        </p>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
        <label htmlFor="point-program" className="text-sm font-semibold text-foreground">
          Pilih event/program
        </label>
        <div className="relative mt-2">
          <select
            id="point-program"
            value={selectedProgramId}
            onChange={(event) => setSelectedProgramId(event.target.value)}
            className="h-11 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Semua program (tampilkan total poin)</option>
            {data.programs.map((program) => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview poin</p>
              <h2 className="mt-1 truncate font-display text-xl font-bold text-foreground">{selectedProgram?.name ?? "Total seluruh poin"}</h2>
            </div>
            <div className="rounded-xl bg-primary/10 px-3 py-2 text-left sm:text-right">
              <p className="text-[11px] text-muted-foreground">{selectedProgramId ? "Total poin program" : "Total semua user"}</p>
              <p className="font-bold text-primary">{selectedProgramId ? selectedPoints : rows.reduce((sum, row) => sum + row.totalPoints, 0)} pts</p>
            </div>
          </div>

          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">Username</th>
                    {selectedProgramId && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">{selectedProgram?.name ?? "Event"}</th>}
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.userId} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 sm:px-5">
                        <p className="font-medium text-foreground">{row.username}</p>
                        <p className="text-xs text-muted-foreground">{selectedProgramId ? `${row.programAttendance}x hadir di program ini` : `${row.totalAttendance}x total hadir`}</p>
                      </td>
                      {selectedProgramId && <td className="px-4 py-3 text-right font-semibold text-primary sm:px-5">{row.programPoints}</td>}
                      <td className="px-4 py-3 text-right font-semibold text-foreground sm:px-5">{row.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <Award className="mx-auto h-10 w-10 text-primary/60" />
              <p className="mt-3 text-sm text-muted-foreground">Belum ada data poin kehadiran.</p>
            </div>
          )}
        </section>
    </div>
  );
}
