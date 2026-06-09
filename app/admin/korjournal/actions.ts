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
