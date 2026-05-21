import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Settings = { profile_complete_bonus: number; default_attendance_points: number };

export type AdminData = {
  events: any[];
  programs: any[];
  settings: Settings;
  setSettings: (s: Settings) => void;
  redemptions: any[];
  registrations: any[];
  attendance: any[];
  onlineCount: number;
  reloadEvents: () => Promise<void>;
  reloadPrograms: () => Promise<void>;
};

export function useAdminData(): AdminData {
  const [events, setEvents] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [settings, setSettings] = useState<Settings>({ profile_complete_bonus: 50, default_attendance_points: 10 });
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id,title,description,venue,city,starts_at,ends_at,status,gender,event_type,poster_url,group_link,points_reward,program_id,created_by,created_at,updated_at,success_message,is_pinned,is_recurring,recurring_days,recurring_start_time,recurring_end_time,recurring_until, programs(id, name, code)")
      .order("is_pinned", { ascending: false })
      .order("starts_at", { ascending: false });
    if (error) console.error("loadEvents", error);
    setEvents(data ?? []);
  };
  const loadPrograms = async () => {
    const { data } = await supabase.from("programs")
      .select("id,name,code,description,gender_restriction,created_at,updated_at")
      .order("name");
    setPrograms(data ?? []);
  };
  const loadSettings = async () => {
    const { data } = await supabase.from("app_settings").select("*");
    if (data) {
      const s: any = { profile_complete_bonus: 50, default_attendance_points: 10 };
      data.forEach((row: any) => { s[row.key] = row.value; });
      setSettings(s);
    }
  };
  const loadRedemptions = async () => {
    const { data } = await supabase
      .from("redemptions")
      .select("id, status, cost_points, created_at, user_id, reward_id, rewards(name), profiles:user_id(full_name, email, phone)")
      .order("created_at", { ascending: false }).limit(100);
    setRedemptions(data ?? []);
  };
  const loadRegistrations = async () => {
    const { data } = await supabase
      .from("registrations")
      .select("id, created_at, event_id, user_id, events(title, programs(name)), profiles:user_id(full_name, email, phone, gender, city)")
      .order("created_at", { ascending: false }).limit(200);
    setRegistrations(data ?? []);
  };
  const loadAttendance = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("id, scanned_at, event_id, user_id, profiles:user_id(full_name, gender)")
      .order("scanned_at", { ascending: false }).limit(1000);
    setAttendance(data ?? []);
  };

  const reloadAll = async () => {
    await Promise.all([loadEvents(), loadPrograms(), loadSettings(), loadRedemptions(), loadRegistrations(), loadAttendance()]);
  };

  useEffect(() => {
    reloadAll();
    const ch = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, loadSettings)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, loadEvents)
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, loadPrograms)
      .on("postgres_changes", { event: "*", schema: "public", table: "redemptions" }, loadRedemptions)
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, loadRegistrations)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, loadAttendance)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") reloadAll();
      });

    const presence = supabase.channel("online-users", { config: { presence: { key: "admin" } } });
    presence.on("presence", { event: "sync" }, () => {
      setOnlineCount(Object.keys(presence.presenceState()).length);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await presence.track({ at: Date.now() });
    });

    const onVis = () => { if (document.visibilityState === "visible") reloadAll(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      supabase.removeChannel(ch);
      supabase.removeChannel(presence);
    };
  }, []);

  return { events, programs, settings, setSettings, redemptions, registrations, attendance, onlineCount, reloadEvents: loadEvents, reloadPrograms: loadPrograms };
}
