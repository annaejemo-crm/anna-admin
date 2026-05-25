'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function togglePaid(formData) {
  const id = String(formData.get('id') || '');
  const kind = String(formData.get('kind') || '');
  if (!id || (kind !== 'avgift' && kind !== 'paket')) return;
  const supabase = await createClient();
  const col = kind === 'avgift' ? 'bokningsavgift_betald' : 'bildpaket_betald';
  const { data } = await supabase.from('bokningar').select(col).eq('id', id).maybeSingle();
  const current = data ? data[col] : false;
  await supabase.from('bokningar').update({ [col]: !current }).eq('id', id);
  revalidatePath('/admin/kunder');
  const kundId = String(formData.get('kundId') || '');
  if (kundId) revalidatePath('/admin/kunder/' + kundId);
}

export async function setBildpaket(formData) {
  const id = String(formData.get('id') || '');
  const paketId = String(formData.get('paketId') || '');
  if (!id) return;
  const supabase = await createClient();
  if (paketId === 'clear' || !paketId) {
    await supabase.from('bokningar').update({ bildpaket_namn: null, bildpaket_kr: null, bildpaket_betald: false }).eq('id', id);
  } else {
    const { data: paket } = await supabase.from('bildpaket').select('namn,pris_kr').eq('id', paketId).maybeSingle();
    if (paket) {
      await supabase.from('bokningar').update({ bildpaket_namn: paket.namn, bildpaket_kr: paket.pris_kr }).eq('id', id);
    }
  }
  revalidatePath('/admin/kunder');
  const kundId = String(formData.get('kundId') || '');
  if (kundId) revalidatePath('/admin/kunder/' + kundId);
}
