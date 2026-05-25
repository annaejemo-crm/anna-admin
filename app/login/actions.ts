'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

function getSiteUrl(hdrs) {
  const proto = hdrs.get('x-forwarded-proto') || 'https';
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function login(formData) {
  const email = String(formData.get('email') || '');

  if (!email) redirect('/login?error=Mejladress+saknas');

  const supabase = await createClient();
  const hdrs = await headers();
  const siteUrl = getSiteUrl(hdrs);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/login?sent=1');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
