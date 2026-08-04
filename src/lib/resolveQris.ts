import { supabase } from "@/integrations/supabase/client";

export type ResolvedQris = {
  id: string;
  name: string;
  type: "qris";
  qr_url: string;
  description: string | null;
  whatsapp_number: string | null;
  category_name: string | null;
};

type EventLike = {
  qris_method_id?: string | null;
  payment_category_id?: string | null;
  registration_type?: string | null;
  is_online?: boolean | null;
};

const SELECT =
  "id,name,description,qr_url,whatsapp_number,is_active,order_index,category,category_id,payment_categories(name,whatsapp_number)";

const shape = (row: any): ResolvedQris => ({
  id: row.id,
  name: row.name,
  type: "qris",
  qr_url: row.qr_url,
  description: row.description ?? null,
  whatsapp_number: row.whatsapp_number ?? row.payment_categories?.whatsapp_number ?? null,
  category_name: row.payment_categories?.name ?? null,
});

/**
 * Urutan pencarian QRIS untuk sebuah event:
 * 1. QRIS spesifik yang dipilih admin pada event
 * 2. QRIS aktif pada kategori pembayaran event
 * 3. QRIS aktif pada kategori bawaan ("infaq" untuk infaq/online, "paid" untuk berbayar)
 */
export async function resolveEventQris(event: EventLike): Promise<ResolvedQris | null> {
  if (event.qris_method_id) {
    const { data } = await supabase.from("qris_methods").select(SELECT).eq("id", event.qris_method_id).maybeSingle();
    if (data) return shape(data);
  }

  const isInfaq = !!event.is_online || event.registration_type === "infaq";

  if (!isInfaq && event.payment_category_id) {
    const { data } = await supabase
      .from("qris_methods")
      .select(SELECT)
      .eq("category_id", event.payment_category_id)
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) return shape(data);
  }

  const fallbackSlug = isInfaq ? "infaq" : event.registration_type === "paid" ? "paid" : null;
  if (!fallbackSlug) return null;

  const { data: category } = await supabase
    .from("payment_categories")
    .select("id")
    .eq("slug", fallbackSlug)
    .maybeSingle();

  let query = supabase.from("qris_methods").select(SELECT).eq("is_active", true).order("order_index", { ascending: true }).limit(1);
  query = category?.id ? query.eq("category_id", category.id) : query.eq("category", fallbackSlug);

  const { data } = await query.maybeSingle();
  return data ? shape(data) : null;
}
