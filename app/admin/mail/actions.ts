'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateMall(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const namn = String(formData.get('namn') || '');
  const amne = String(formData.get('amne') || '');
  const brodtext = String(formData.get('brodtext') || '');

  await supabase.from('mail_mallar').update({
    namn: namn,
    amne: amne,
    brodtext: brodtext,
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  revalidatePath('/admin/mail');
  redirect(`/admin/mail?id=${id}`);
}
