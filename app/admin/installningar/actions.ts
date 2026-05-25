'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function updatePassword(formData) {
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');

  if (!password || password.length < 8) {
    redirect('/admin/installningar?error=L%C3%B6senordet+m%C3%A5ste+vara+minst+8+tecken');
  }
  if (password !== confirm) {
    redirect('/admin/installningar?error=L%C3%B6senorden+matchar+inte');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect('/admin/installningar?error=' + encodeURIComponent(error.message));
  }

  redirect('/admin/installningar?ok=1');
}
