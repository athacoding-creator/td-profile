import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  gender: "L" | "P" | null;
  city: string | null;
  birth_date: string | null;
  address: string | null;
  is_complete: boolean;
  points: number;
  avatar_url: string | null;
  province_code: string | null;
  province_name: string | null;
  regency_code: string | null;
  regency_name: string | null;
  district_code: string | null;
  district_name: string | null;
  occupation: string | null;
  instansi: string | null;
  hobi: string | null;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadExtras = async (uid: string) => {
    try {
      const [{ data: prof, error: profError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      
      if (profError) console.error("Error loading profile:", profError);
      if (rolesError) console.error("Error loading roles:", rolesError);
      
      setProfile(prof as any);
      const isAdminUser = (roles ?? []).some((r: any) => r.role === "admin");
      console.log(`[Auth] User ${uid} admin status: ${isAdminUser}, roles:`, roles);
      setIsAdmin(isAdminUser);
    } catch (err) {
      console.error("Error loading extras:", err);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        console.log(`[Auth] Auth state changed: ${e}, user: ${s.user.id}`);
        setTimeout(() => loadExtras(s.user.id), 0);
        if (e === "SIGNED_IN") {
          setTimeout(() => {
            supabase.from("login_events").insert({ user_id: s.user.id, user_agent: navigator.userAgent }).then(() => {});
          }, 0);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        console.log(`[Auth] Session loaded for user: ${s.user.id}`);
        loadExtras(s.user.id).finally(() => {
          // Add a small delay to ensure states are propagated
          setTimeout(() => setLoading(false), 100);
        });
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error("Session error:", err);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      console.log(`[Auth] Refreshing profile for user: ${user.id}`);
      await loadExtras(user.id);
    }
  };

  const signOut = async () => {
    console.log(`[Auth] Signing out user: ${user?.id}`);
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ user, session, profile, isAdmin, loading, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
