'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';

/**
 * Skapar eller byter nyckeln till kalenderprenumerationen. Byts nyckeln
 * slutar den gamla adressen fungera direkt, sa Anna kan stanga av en
 * prenumeration som hamnat fel. Kraver migration 0013.
 */
export async function nyKalenderNyckel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const nyckel = randomBytes(24).toString('base64url');
  await supabase.from('kalender_prenumeration').upsert(
    { user_id: user.id, nyckel: nyckel },
    { onConflict: 'user_id' },
  );
  revalidatePath('/admin/kalender');
}

export async function stangAvKalender() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('kalender_prenumeration').delete().eq('user_id', user.id);
  revalidatePath('/admin/kalender');
}
