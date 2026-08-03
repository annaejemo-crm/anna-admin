'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { skickaMail } from '@/lib/mail';

const AVTAL_AMNE = 'Ditt avtal för fotograferingen';

function slug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function skapaAvtal(formData: FormData) {
  const supabase = await createClient();
  const userRes = await supabase.auth.getUser();
  const user = userRes.data.user;
  if (!user) return;

  const bokning_id = String(formData.get('bokning_id') || '');
  const mall_id = String(formData.get('mall_id') || '') || null;
  const personligt_meddelande = String(formData.get('personligt_meddelande') || '') || null;

  const klausuler: any[] = [];
  const titlarRaw = formData.getAll('klausul_titel');
  const broddetarRaw = formData.getAll('klausul_brod');
  for (let i = 0; i < titlarRaw.length; i++) {
    const titel = String(titlarRaw[i] || '').trim();
    const brodtext = String(broddetarRaw[i] || '').trim();
    if (titel || brodtext) klausuler.push({ titel: titel, brodtext: brodtext });
  }

  const { data: bokning } = await supabase
    .from('bokningar')
    .select('*, kund:kunder(fornamn, efternamn, foretagsnamn, email)')
    .eq('id', bokning_id)
    .single();

  if (!bokning) return;
  const k: any = bokning.kund;
  const kund_namn = k.foretagsnamn || `${k.fornamn} ${k.efternamn || ''}`.trim();
  const bildpaket_text = bokning.bildpaket_namn
    ? `${bokning.bildpaket_namn} (${(bokning.bildpaket_kr || 0).toLocaleString('sv-SE')} kr)`
    : 'Väljs efter fotograferingen';

  const detaljer = {
    kund_namn: kund_namn,
    kund_email: k.email || '',
    datum: bokning.datum,
    tid: bokning.tid,
    plats: bokning.plats,
    bokningsavgift_kr: bokning.bokningsavgift_kr,
    bildpaket_text: bildpaket_text,
  };

  const nyttSlug = slug();

  const { data: nyttAvtal } = await supabase.from('avtal').insert({
    user_id: user.id,
    bokning_id: bokning_id,
    mall_id: mall_id,
    klausuler: klausuler,
    detaljer: detaljer,
    slug: nyttSlug,
    personligt_meddelande: personligt_meddelande,
    status: 'utkast',
  }).select('id').single();

  if (!nyttAvtal) return;

  revalidatePath('/admin/avtal');
  revalidatePath(`/admin/kunder/${bokning.kund_id}`);
  redirect(`/admin/avtal/${nyttAvtal.id}`);
}

export async function skickaAvtal(formData: FormData) {
  const supabase = await createClient();
  const userRes = await supabase.auth.getUser();
  const user = userRes.data.user;
  if (!user) return;

  const id = String(formData.get('id') || '');
  const bokning_id = String(formData.get('bokning_id') || '');
  const nu = new Date().toISOString();

  const { data: foretag } = await supabase
    .from('foretag_installningar')
    .select('foretagsnamn')
    .maybeSingle();
  const fotografNamn = (foretag && foretag.foretagsnamn) || 'Anna Ejemo';

  await supabase.from('avtal_signaturer').insert({
    user_id: user.id,
    avtal_id: id,
    namn: fotografNamn,
    typed_name: fotografNamn,
    metod: 'fotograf_godkand',
    ip_adress: null,
    user_agent: 'admin-app',
    signerad_at: nu,
  });

  await supabase.from('avtal').update({
    status: 'skickat',
    skickat_at: nu,
  }).eq('id', id);

  if (bokning_id) {
    await supabase.from('bokningar').update({
      status: 'avtal_skickat',
    }).eq('id', bokning_id);
  }

  // Maila lanken till kunden direkt. Tidigare fick Anna kopiera lanken
  // och skicka den fran sin egen mail, vilket var det som gjorde att
  // avtalsfunktionen aldrig kom till anvandning.
  let mailStatus = 'ingen_adress';

  const { data: avtalRad } = await supabase
    .from('avtal')
    .select('slug, bokning:bokningar(kund:kunder(fornamn, email))')
    .eq('id', id)
    .maybeSingle();

  const bokningRel: any = avtalRad ? (avtalRad as any).bokning : null;
  const kund: any = bokningRel ? bokningRel.kund : null;

  if (avtalRad && kund && kund.email) {
    const h = await headers();
    const protokoll = h.get('x-forwarded-proto') || 'https';
    const vard = h.get('host') || '';
    const lank = `${protokoll}://${vard}/avtal/${avtalRad.slug}`;
    const fornamn = kund.fornamn || '';

    const brodtext = `Hej${fornamn ? ' ' + fornamn : ''},

Här kommer avtalet för din fotografering. Läs igenom det i lugn och ro och signera digitalt med ditt namn längst ner på sidan.

${lank}

Hör av dig om något är oklart.

Varma hälsningar
Anna`;

    const res = await skickaMail({
      till: kund.email,
      amne: AVTAL_AMNE,
      brodtext: brodtext,
    });
    mailStatus = res.ok ? 'ok' : 'fel';
  }

  revalidatePath(`/admin/avtal/${id}`);
  revalidatePath('/admin/avtal');
  revalidatePath(`/admin/kunder`);
  revalidatePath('/admin');
  redirect(`/admin/avtal/${id}?mail=${mailStatus}`);
}

export async function raderaAvtal(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  await supabase.from('avtal').delete().eq('id', id);
  revalidatePath('/admin/avtal');
  redirect('/admin/avtal');
}
