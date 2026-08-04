'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Sparar en avtalsmall. Klausuler kommer in som parallella listor av
 * titlar och brodtexter. Tomma par hoppas over, sa Anna kan radera en
 * klausul genom att tomma bada falten.
 */
export async function sparaMall(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  if (!id) return;

  const namn = String(formData.get('namn') || '').trim();
  const fotograferingstyp = String(formData.get('fotograferingstyp') || '').trim() || null;

  const titlar = formData.getAll('klausul_titel');
  const brodtexter = formData.getAll('klausul_brod');

  const klausuler: { titel: string; brodtext: string }[] = [];
  for (let i = 0; i < titlar.length; i++) {
    const titel = String(titlar[i] || '').trim();
    const brodtext = String(brodtexter[i] || '').trim();
    if (titel || brodtext) klausuler.push({ titel: titel, brodtext: brodtext });
  }

  const uppdatering: any = { klausuler: klausuler, fotograferingstyp: fotograferingstyp };
  if (namn) uppdatering.namn = namn;

  await supabase.from('avtal_mallar').update(uppdatering).eq('id', id);

  revalidatePath('/admin/avtal/mallar');
  redirect(`/admin/avtal/mallar?mall=${id}&sparat=1`);
}

/**
 * Skapar en ny tom mall sa Anna kan lagga till exempelvis nyfodd eller foretag.
 */
export async function skapaMall(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const namn = String(formData.get('namn') || '').trim();
  if (!namn) return;

  const { data: befintliga } = await supabase
    .from('avtal_mallar')
    .select('ordning')
    .order('ordning', { ascending: false })
    .limit(1);

  const nastaOrdning = befintliga && befintliga.length > 0 ? Number(befintliga[0].ordning || 0) + 1 : 1;

  const { data: nyMall } = await supabase.from('avtal_mallar').insert({
    user_id: user.id,
    namn: namn,
    fotograferingstyp: null,
    klausuler: [],
    ordning: nastaOrdning,
    aktiv: true,
  }).select('id').single();

  revalidatePath('/admin/avtal/mallar');
  if (nyMall) redirect(`/admin/avtal/mallar?mall=${nyMall.id}`);
  redirect('/admin/avtal/mallar');
}
