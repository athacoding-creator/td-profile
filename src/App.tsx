import { lazy, Suspense, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import Index from "./pages/Index";

const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const ScanQR = lazy(() => import("./pages/ScanQR"));
const ScanSuccess = lazy(() => import("./pages/ScanSuccess"));
const Poin = lazy(() => import("./pages/Poin"));
const Riwayat = lazy(() => import("./pages/Riwayat"));
const Events = lazy(() => import("./pages/Events"));
const Profil = lazy(() => import("./pages/Profil"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const AdminPrograms = lazy(() => import("./pages/admin/Programs"));
const AdminRegistrations = lazy(() => import("./pages/admin/Registrations"));
const AdminExportPendaftar = lazy(() => import("./pages/admin/ExportPendaftar"));
const AdminRedemptions = lazy(() => import("./pages/admin/Redemptions"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));

const AdminMerchandise = lazy(() => import("./pages/admin/Merchandise"));
const AdminHero = lazy(() => import("./pages/admin/Hero"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
    Memuat…
  </div>
);

const Shell = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  if (isAdmin) {
    return <div className="min-h-screen w-full bg-background">{children}</div>;
  }
  return (
    <div className="min-h-screen w-full bg-muted/40 flex justify-center">
      <div className="relative w-full max-w-[480px] min-h-screen bg-background shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Shell>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
                <Route path="/event/:id" element={<EventDetail />} />
                <Route path="/event/:id/scan" element={<RequireAuth><ScanQR /></RequireAuth>} />
                <Route path="/event/:id/sukses" element={<RequireAuth><ScanSuccess /></RequireAuth>} />
                <Route path="/poin" element={<RequireAuth><Poin /></RequireAuth>} />
                <Route path="/riwayat" element={<RequireAuth><Riwayat /></RequireAuth>} />
                <Route path="/event" element={<Events />} />
                <Route path="/profil" element={<RequireAuth><Profil /></RequireAuth>} />
                <Route path="/admin" element={<RequireAuth adminOnly><AdminLayout /></RequireAuth>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="event" element={<AdminEvents />} />
                  <Route path="program" element={<AdminPrograms />} />
                  <Route path="pendaftar" element={<AdminRegistrations />} />
                  <Route path="pendaftar/export" element={<AdminExportPendaftar />} />
                  <Route path="akun" element={<AdminUsers />} />
                  <Route path="penukaran" element={<AdminRedemptions />} />
                  <Route path="merchandise" element={<AdminMerchandise />} />
                  <Route path="hero" element={<AdminHero />} />
                  <Route path="pengaturan" element={<AdminSettings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Shell>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
