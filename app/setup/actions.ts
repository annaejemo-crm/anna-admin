'use server';

import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';

export async function setupPassword(formData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || password.length < 8) {
    redirect('/setup?error=Fyll+i+mejl+och+l%C3%B6senord+(minst+8+tecken)');
  }

  const admin = createServiceClient();

  const { data, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    redirect('/setup?error=' + encodeURIComponent(listError.message));
  }
  const users = (data && data.users) || [];
  const user = users.find((u) => u.email === email);
  if (!user) {
    redirect('/setup?error=Hittade+inte+anv%C3%A4ndaren');
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });

  if (error) {
    redirect('/setup?error=' + encodeURIComponent(error.message));
  }

  redirect('/setup?ok=1');
}
