'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : null;
}

async function getKonferens(ar: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, konf: null };
  let { data: konf } = await supabase
    .from('fam_konferenser')
    .select('*')
    .eq('user_id', user.id)
    .eq('ar', ar)
    .maybeSingle();
  if (!konf) {
    const { data: ny } = await supabase
      .from('fam_konferenser')
      .insert({ user_id: user.id, ar })
      .select('*')
      .maybeSingle();
    konf = ny;
  }
  return { supabase, user, konf };
}

/* ============ KONFERENS ============ */

export async function uppdateraKonferens(formData: FormData) {
  const ar = Number(formData.get('ar') || 0);
  if (!ar) return;
  const { supabase, konf } = await getKonferens(ar);
  if (!konf) return;
  await supabase.from('fam_konferenser').update({
    datum: String(formData.get('datum') || '') || null,
    plats: String(formData.get('plats') || '') || null,
    antal_platser: num(formData.get('antal_platser')) || 60,
    pris_forst_till_kvarn: num(formData.get('pris_forst_till_kvarn')) || 1100,
    pris_boka_tidigt: num(formData.get('pris_boka_tidigt')) || 1450,
    pris_ordinarie: num(formData.get('pris_ordinarie')) || 1790,
    budget_kostnader: num(formData.get('budget_kostnader')) || 0,
    budget_intakter: num(formData.get('budget_intakter')) || 0,
    anteckning: String(formData.get('anteckning') || '') || null,
  }).eq('id', konf.id);
  revalidatePath('/admin/fam');
}

/* ============ TALARE ============ */

export async function skapaTalare(formData: FormData) {
  const ar = Number(formData.get('ar') || 0);
  const { supabase, user, konf } = await getKonferens(ar);
  if (!user || !konf) return;
  const namn = String(formData.get('namn') || '').trim();
  if (!namn) return;
  await supabase.from('fam_talare').insert({
    user_id: user.id,
    konferens_id: konf.id,
    namn,
    forelasning_titel: String(formData.get('forelasning_titel') || '') || null,
    amne: String(formData.get('amne') || '') || null,
    hemsida: String(formData.get('hemsida') || '') || null,
    email: String(formData.get('email') || '') || null,
    telefon: String(formData.get('telefon') || '') || null,
    arvode: num(formData.get('arvode')),
    status: String(formData.get('status') || 'kontaktad'),
    anteckning: String(formData.get('anteckning') || '') || null,
  });
  revalidatePath('/admin/fam');
}

export async function uppdateraTalare(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('fam_talare').update({
    namn: String(formData.get('namn') || ''),
    forelasning_titel: String(formData.get('forelasning_titel') || '') || null,
    amne: String(formData.get('amne') || '') || null,
    hemsida: String(formData.get('hemsida') || '') || null,
    email: String(formData.get('email') || '') || null,
    telefon: String(formData.get('telefon') || '') || null,
    arvode: num(formData.get('arvode')),
    status: String(formData.get('status') || 'kontaktad'),
    anteckning: String(formData.get('anteckning') || '') || null,
  }).eq('id', id);
  revalidatePath('/admin/fam');
}

export async function raderaTalare(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('fam_talare').delete().eq('id', id);
  revalidatePath('/admin/fam');
}

/* ============ DELTAGARE ============ */

export async function skapaDeltagare(formData: FormData) {
  const ar = Number(formData.get('ar') || 0);
  const { supabase, user, konf } = await getKonferens(ar);
  if (!user || !konf) return;
  const namn = String(formData.get('namn') || '').trim();
  if (!namn) return;
  const biljettyp = String(formData.get('biljettyp') || 'ordinarie');
  let pris: number | null = num(formData.get('pris'));
  if (pris === null) {
    if (biljettyp === 'forst_till_kvarn') pris = konf.pris_forst_till_kvarn;
    else if (biljettyp === 'boka_tidigt') pris = konf.pris_boka_tidigt;
    else pris = konf.pris_ordinarie;
  }
  await supabase.from('fam_deltagare').insert({
    user_id: user.id,
    konferens_id: konf.id,
    namn,
    email: String(formData.get('email') || '') || null,
    telefon: String(formData.get('telefon') || '') || null,
    fotograf_hemsida: String(formData.get('fotograf_hemsida') || '') || null,
    biljettyp,
    pris,
    betald: formData.get('betald') === 'on',
    lunchval: String(formData.get('lunchval') || '') || null,
    allergier: String(formData.get('allergier') || '') || null,
    anteckning: String(formData.get('anteckning') || '') || null,
  });
  revalidatePath('/admin/fam');
}

export async function uppdateraDeltagare(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('fam_deltagare').update({
    namn: String(formData.get('namn') || ''),
    email: String(formData.get('email') || '') || null,
    telefon: String(formData.get('telefon') || '') || null,
    fotograf_hemsida: String(formData.get('fotograf_hemsida') || '') || null,
    biljettyp: String(formData.get('biljettyp') || 'ordinarie'),
    pris: num(formData.get('pris')),
    betald: formData.get('betald') === 'on',
    lunchval: String(formData.get('lunchval') || '') || null,
    allergier: String(formData.get('allergier') || '') || null,
    anteckning: String(formData.get('anteckning') || '') || null,
  }).eq('id', id);
  revalidatePath('/admin/fam');
}

export async function togglaBetaldDeltagare(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  const { data } = await supabase.from('fam_deltagare').select('betald').eq('id', id).maybeSingle();
  if (!data) return;
  await supabase.from('fam_deltagare').update({
    betald: !data.betald,
    betald_datum: !data.betald ? new Date().toISOString().slice(0, 10) : null,
  }).eq('id', id);
  revalidatePath('/admin/fam');
}

export async function raderaDeltagare(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('fam_deltagare').delete().eq('id', id);
  revalidatePath('/admin/fam');
}

/* ============ SPONSORER ============ */

export async function skapaSponsor(formData: FormData) {
  const ar = Number(formData.get('ar') || 0);
  const { supabase, user, konf } = await getKonferens(ar);
  if (!user || !konf) return;
  const namn = String(formData.get('namn') || '').trim();
  if (!namn) return;
  await supabase.from('fam_sponsorer').insert({
    user_id: user.id,
    konferens_id: konf.id,
    namn,
    kontaktperson: String(formData.get('kontaktperson') || '') || null,
    email: String(formData.get('email') || '') || null,
    telefon: String(formData.get('telefon') || '') || null,
    status: String(formData.get('status') || 'kontaktad'),
    belopp: num(formData.get('belopp')),
    motprestation: String(formData.get('motprestation') || '') || null,
    anteckning: String(formData.get('anteckning') || '') || null,
  });
  revalidatePath('/admin/fam');
}

export async function raderaSponsor(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('fam_sponsorer').delete().eq('id', id);
  revalidatePath('/admin/fam');
}

/* ============ UPPGIFTER ============ */

export async function skapaUppgift(formData: FormData) {
  const ar = Number(formData.get('ar') || 0);
  const { supabase, user, konf } = await getKonferens(ar);
  if (!user || !konf) return;
  const titel = String(formData.get('titel') || '').trim();
  if (!titel) return;
  await supabase.from('fam_uppgifter').insert({
    user_id: user.id,
    konferens_id: konf.id,
    titel,
    beskrivning: String(formData.get('beskrivning') || '') || null,
    deadline: String(formData.get('deadline') || '') || null,
    prioritet: String(formData.get('prioritet') || 'normal'),
    kategori: String(formData.get('kategori') || '') || null,
  });
  revalidatePath('/admin/fam');
}

export async function togglaUppgift(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  const { data } = await supabase.from('fam_uppgifter').select('klar').eq('id', id).maybeSingle();
  if (!data) return;
  await supabase.from('fam_uppgifter').update({
    klar: !data.klar,
    klar_at: !data.klar ? new Date().toISOString() : null,
  }).eq('id', id);
  revalidatePath('/admin/fam');
}

export async function raderaUppgift(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('fam_uppgifter').delete().eq('id', id);
  revalidatePath('/admin/fam');
}

/* ============ SCHEMA ============ */

export async function skapaSchemapost(formData: FormData) {
  const ar = Number(formData.get('ar') || 0);
  const { supabase, user, konf } = await getKonferens(ar);
  if (!user || !konf) return;
  const titel = String(formData.get('titel') || '').trim();
  if (!titel) return;
  await supabase.from('fam_schema').insert({
    user_id: user.id,
    konferens_id: konf.id,
    titel,
    start_tid: String(formData.get('start_tid') || '') || null,
    slut_tid: String(formData.get('slut_tid') || '') || null,
    talare_id: String(formData.get('talare_id') || '') || null,
    typ: String(formData.get('typ') || 'forelasning'),
    beskrivning: String(formData.get('beskrivning') || '') || null,
  });
  revalidatePath('/admin/fam');
}

export async function raderaSchemapost(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('fam_schema').delete().eq('id', id);
  revalidatePath('/admin/fam');
}
