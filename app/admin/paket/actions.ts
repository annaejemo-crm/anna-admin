'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updatePaket(formData) {
  const id = String(formData.get('id') || '');
  const namn = String(formData.get('namn') || '').trim();
  const beskrivning = String(formData.get('beskrivning') || '').trim() || null;
  const antalRaw = String(formData.get('antal_bilder') || '');
  const antal = antalRaw ? parseInt(antalRaw) : null;
  const pris = parseInt(String(formData.get('pris_kr') || '0'));
  if (!id || !namn || !pris) return;
  const supabase = await createClient();
  await supabase.from('bildpaket').update({ namn, beskrivning, antal_bilder: antal, pris_kr: pris }).eq('id', id);
  revalidatePath('/admin/paket');
}

export async function addPaket(formData) {
  const namn = String(formData.get('namn') || '').trim();
  const beskrivning = String(formData.get('beskrivning') || '').trim() || null;
  const antalRaw = String(formData.get('antal_bilder') || '');
  const antal = antalRaw ? parseInt(antalRaw) : null;
  const pris = parseInt(String(formData.get('pris_kr') || '0'));
  const ordning = parseInt(String(formData.get('ordning') || '100'));
  if (!namn || !pris) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('bildpaket').insert({
    user_id: user.id, namn, beskrivning, antal_bilder: antal, pris_kr: pris, ordning,
  });
  revalidatePath('/admin/paket');
}

export async function deletePaket(formData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('bildpaket').delete().eq('id', id);
  revalidatePath('/admin/paket');
}
