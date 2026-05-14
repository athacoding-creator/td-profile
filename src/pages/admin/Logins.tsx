import { useAdmin } from "./AdminLayout";
import { Section } from "./components";

export default function LoginsPage() {
  const { logins } = useAdmin();
  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Tracking Login</h1>
        <p className="text-sm text-muted-foreground">Riwayat login user terbaru</p>
      </div>
      <Section title="100 login terakhir">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Waktu</th><th>User</th><th>Email</th><th>Device</th></tr>
            </thead>
            <tbody>
              {logins.map((l) => (
                <tr key={l.id} className="border-t border-border/60">
                  <td className="py-2">{new Date(l.created_at).toLocaleString("id-ID")}</td>
                  <td>{l.profiles?.full_name || "—"}</td>
                  <td className="text-xs text-muted-foreground">{l.profiles?.email}</td>
                  <td className="max-w-xs truncate text-xs text-muted-foreground">{l.user_agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
