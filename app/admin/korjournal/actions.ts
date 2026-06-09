'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function raderaKorjournalpost(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  if (!id) return;
  await supabase.from('korjournal').delete().eq('id', id);
  revalidatePath('/admin/korjournal');
}

/**
 * Lägg till en manuell körjournal-post.
 * För resor som inte hör till en bokning, eller poster du vill rätta i efterhand.
 */
export async function skapaKorjournalpost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const datum = String(formData.get('datum') || '').trim();
  if (!datum) return;

  const syfte = String(formData.get('syfte') || '').trim();
  if (!syfte) return;

  const plats_namn = String(formData.get('plats_namn') || '').trim() || null;
  const plats_adress = String(formData.get('plats_adress') || '').trim() || null;
  const medfoljande = String(formData.get('medfoljande') || '').trim() || null;

  const kmRaw = String(formData.get('antal_km') || '').replace(',', '.').trim();
  const antal_km = kmRaw ? parseFloat(kmRaw) : NaN;
  if (Number.isNaN(antal_km) || antal_km <= 0) return;

  await supabase.from('korjournal').insert({
    user_id: user.id,
    datum,
    syfte,
    plats_namn,
    plats_adress,
    antal_km,
    medfoljande,
  });

  revalidatePath('/admin/korjournal');
}

/**
 * Uppdatera mätarställning för ett år (vid årets början eller slut).
 */
export async function sparaMatarstallning(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const ar = parseInt(String(formData.get('ar') || ''), 10);
  if (!ar) return;

  const borjanRaw = String(formData.get('borjan_km') || '').replace(',', '.').trim();
  const slutRaw = String(formData.get('slut_km') || '').replace(',', '.').trim();

  const borjan_km = borjanRaw ? parseFloat(borjanRaw) : null;
  const slut_km = slutRaw ? parseFloat(slutRaw) : null;

  await supabase.from('matarstallning').upsert({
    user_id: user.id,
    ar,
    borjan_km: Number.isNaN(borjan_km as number) ? null : borjan_km,
    slut_km: Number.isNaN(slut_km as number) ? null : slut_km,
    uppdaterad_at: new Date().toISOString(),
  }, { onConflict: 'user_id,ar' });

  revalidatePath('/admin/korjournal');
}
