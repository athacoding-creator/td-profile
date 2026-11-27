import { useMemo, useState } from "react";
import { Award, ChevronDown, Minus, Pencil, Plus, Search } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { buildAttendancePointSummary, AttendancePointSummary } from "@/lib/pointSummary";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AdjustmentType = "add" | "subtract";

export default function Poin() {
  const adminData = useAdmin();
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<AttendancePointSummary | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("add");
  const [adjustmentAmount, setAdjustmentAmount] = useState("10");
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const eventProgramById = useMemo(
    () => new Map(adminData.events.map((event) => [event.id, event.program_id])),
    [adminData.events],
  );
  const selectedProgram = adminData.programs.find((program) => program.id === selectedProgramId);
  const rows = useMemo(
    () => buildAttendancePointSummary(adminData.attendance, eventProgramById, selectedProgramId, adminData.profiles),
    [adminData.attendance, adminData.profiles, eventProgramById, selectedProgramId],
  );
  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("id");
    if (!normalizedSearch) return rows;
    return rows.filter((row) => row.username.toLocaleLowerCase("id").includes(normalizedSearch));
  }, [rows, search]);
  const selectedPoints = rows.reduce((sum, row) => sum + row.programPoints, 0);
  const totalPoints = rows.reduce((sum, row) => sum + row.totalPoints, 0);

  const openAdjustment = (row: AttendancePointSummary) => {
    setEditingUser(row);
    setAdjustmentType("add");
    setAdjustmentAmount("10");
  };

  const saveAdjustment = async () => {
    if (!editingUser) return;
    const amount = Number(adjustmentAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      toast.error("Masukkan jumlah poin berupa bilangan bulat lebih dari 0");
      return;
    }
    const signedAmount = adjustmentType === "add" ? amount : -amount;
    if (signedAmount < 0 && amount > editingUser.totalPoints) {
      toast.error("Poin tidak boleh menjadi kurang dari 0");
      return;
    }

    setSavingAdjustment(true);
    const { data: newBalance, error } = await supabase.rpc("admin_adjust_points", {
      _user_id: editingUser.userId,
      _amount: signedAmount,
      _reason: "admin_adjustment",
    });
    setSavingAdjustment(false);

    if (error) {
      toast.error(error.message || "Gagal mengubah poin");
      return;
    }

    await adminData.reloadProfiles();
    setEditingUser(null);
    toast.success(`Poin ${editingUser.username} berhasil diubah. Saldo sekarang ${newBalance ?? 0} poin.`);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Poin User</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Total poin ditampilkan terlebih dahulu. Cari nama user atau pilih program untuk melihat rincian poin.
        </p>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
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
                {adminData.programs.map((program) => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div>
            <label htmlFor="point-search" className="text-sm font-semibold text-foreground">
              Cari nama user
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="point-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ketik nama user…"
                className="h-11 pl-10"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview poin</p>
            <h2 className="mt-1 truncate font-display text-xl font-bold text-foreground">{selectedProgram?.name ?? "Total seluruh poin"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Menampilkan {filteredRows.length} dari {rows.length} user</p>
          </div>
          <div className="rounded-xl bg-primary/10 px-3 py-2 text-left sm:text-right">
            <p className="text-[11px] text-muted-foreground">{selectedProgramId ? "Total poin program" : "Total semua user"}</p>
            <p className="font-bold text-primary">{selectedProgramId ? selectedPoints : totalPoints} pts</p>
          </div>
        </div>

        {filteredRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead className="bg-muted/40">
                <tr className="border-b border-border/60">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">Username</th>
                  {selectedProgramId && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">{selectedProgram?.name ?? "Event"}</th>}
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.userId} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-medium text-foreground">{row.username}</p>
                      <p className="text-xs text-muted-foreground">{selectedProgramId ? `${row.programAttendance}x hadir di program ini` : `${row.totalAttendance}x total hadir`}</p>
                    </td>
                    {selectedProgramId && <td className="px-4 py-3 text-right font-semibold text-primary sm:px-5">{row.programPoints}</td>}
                    <td className="px-4 py-3 text-right font-semibold text-foreground sm:px-5">{row.totalPoints}</td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <Button size="sm" variant="outline" onClick={() => openAdjustment(row)} className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit poin
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <Award className="mx-auto h-10 w-10 text-primary/60" />
            <p className="mt-3 text-sm text-muted-foreground">{search ? "User tidak ditemukan." : "Belum ada data poin kehadiran."}</p>
          </div>
        )}
      </section>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Poin User</DialogTitle>
            <DialogDescription>
              {editingUser?.username ?? "User"} memiliki saldo {editingUser?.totalPoints ?? 0} poin saat ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={adjustmentType === "add" ? "default" : "outline"}
                onClick={() => setAdjustmentType("add")}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Tambah
              </Button>
              <Button
                type="button"
                variant={adjustmentType === "subtract" ? "destructive" : "outline"}
                onClick={() => setAdjustmentType("subtract")}
                className="gap-2"
              >
                <Minus className="h-4 w-4" /> Kurangi
              </Button>
            </div>
            <div>
              <label htmlFor="adjustment-amount" className="text-sm font-medium">Jumlah poin</label>
              <Input
                id="adjustment-amount"
                type="number"
                min="1"
                step="1"
                value={adjustmentAmount}
                onChange={(event) => setAdjustmentAmount(event.target.value)}
                className="mt-2 h-11"
              />
            </div>
            <Button type="button" onClick={saveAdjustment} disabled={savingAdjustment} className="w-full">
              {savingAdjustment ? "Menyimpan…" : adjustmentType === "add" ? "Tambah Poin" : "Kurangi Poin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
