'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateForetag(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const payload = {
    user_id: user.id,
    foretagsnamn: String(formData.get('foretagsnamn') || ''),
    orgnr: String(formData.get('orgnr') || '') || null,
    email: String(formData.get('email') || '') || null,
    telefon: String(formData.get('telefon') || '') || null,
    adress: String(formData.get('adress') || '') || null,
    postnummer: String(formData.get('postnummer') || '') || null,
    ort: String(formData.get('ort') || '') || null,
    bankgiro: String(formData.get('bankgiro') || '') || null,
    iban: String(formData.get('iban') || '') || null,
    hemsida: String(formData.get('hemsida') || '') || null,
    momsregistrerad: formData.get('momsregistrerad') === 'on',
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from('foretag_installningar')
    .upsert(payload, { onConflict: 'user_id' });

  revalidatePath('/admin/installningar');
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get('password') || '');
  if (password.length < 6) return;
  await supabase.auth.updateUser({ password: password });
  revalidatePath('/admin/installningar');
}
