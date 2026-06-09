'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function skapaPlats(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const namn = String(formData.get('namn') || '').trim();
  if (!namn) return;

  const adress = String(formData.get('adress') || '').trim() || null;
  const avstandRaw = String(formData.get('avstand_km_enkel') || '').replace(',', '.');
  const avstand_km_enkel = avstandRaw ? parseFloat(avstandRaw) : null;
  const anteckning = String(formData.get('anteckning') || '').trim() || null;

  await supabase.from('platser').insert({
    user_id: user.id,
    namn,
    adress,
    avstand_km_enkel,
    anteckning,
  });

  revalidatePath('/admin/platser');
  redirect('/admin/platser');
}

export async function uppdateraPlats(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  if (!id) return;

  const namn = String(formData.get('namn') || '').trim();
  if (!namn) return;

  const adress = String(formData.get('adress') || '').trim() || null;
  const avstandRaw = String(formData.get('avstand_km_enkel') || '').replace(',', '.');
  const avstand_km_enkel = avstandRaw ? parseFloat(avstandRaw) : null;
  const anteckning = String(formData.get('anteckning') || '').trim() || null;
  const aktiv = formData.get('aktiv') === 'on';

  await supabase
    .from('platser')
    .update({ namn, adress, avstand_km_enkel, anteckning, aktiv })
    .eq('id', id);

  revalidatePath('/admin/platser');
  redirect('/admin/platser');
}

export async function radera_plats(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  if (!id) return;

  await supabase.from('platser').delete().eq('id', id);
  revalidatePath('/admin/platser');
}
