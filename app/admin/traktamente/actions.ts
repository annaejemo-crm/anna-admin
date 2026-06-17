'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { beraknaTraktamente, TRAKTAMENTE_BELOPP, type DagDel } from '@/lib/traktamente';

function num(v: FormDataEntryValue | null, def = 0): number {
  if (v === null || v === undefined) return def;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : def;
}

export async function skapaTraktamentepost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const avresa = String(formData.get('avresa') || '');
  const hemkomst = String(formData.get('hemkomst') || '') || avresa;
  const destination = String(formData.get('destination') || '').trim();
  const syfte = String(formData.get('syfte') || 'Fotografering').trim() || 'Fotografering';
  const avreseDel = (String(formData.get('avreseDel') || 'hel') as DagDel);
  const hemkomstDel = (String(formData.get('hemkomstDel') || 'halv') as DagDel);
  const m_frukost = num(formData.get('maltider_frukost'));
  const m_lunch = num(formData.get('maltider_lunch'));
  const m_middag = num(formData.get('maltider_middag'));
  const anteckning = String(formData.get('anteckning') || '').trim();

  if (!avresa || !hemkomst || !destination) return;

  const r = beraknaTraktamente({
    avresa, hemkomst, avreseDel, hemkomstDel,
    maltider_frukost: m_frukost,
    maltider_lunch: m_lunch,
    maltider_middag: m_middag,
  });

  await supabase.from('traktamente_poster').insert({
    user_id: user.id,
    avresa, hemkomst, destination, syfte,
    antal_heldagar: r.antal_heldagar,
    antal_halvdagar: r.antal_halvdagar,
    antal_natter: r.antal_natter,
    maltider_frukost: m_frukost,
    maltider_lunch: m_lunch,
    maltider_middag: m_middag,
    belopp_heldag: TRAKTAMENTE_BELOPP.heldag,
    belopp_halvdag: TRAKTAMENTE_BELOPP.halvdag,
    belopp_natt: TRAKTAMENTE_BELOPP.natt,
    avdrag_frukost: TRAKTAMENTE_BELOPP.avdrag_frukost,
    avdrag_lunch: TRAKTAMENTE_BELOPP.avdrag_lunch,
    avdrag_middag: TRAKTAMENTE_BELOPP.avdrag_middag,
    brutto_kr: r.brutto_kr,
    maltidsavdrag_kr: r.maltidsavdrag_kr,
    totalt_kr: r.totalt_kr,
    anteckning: anteckning || null,
  });

  revalidatePath('/admin/traktamente');
}

export async function uppdateraTraktamentepost(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();

  const { data: befintlig } = await supabase
    .from('traktamente_poster')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!befintlig) return;

  const avresa = String(formData.get('avresa') || befintlig.avresa);
  const hemkomst = String(formData.get('hemkomst') || befintlig.hemkomst);
  const destination = String(formData.get('destination') || befintlig.destination).trim();
  const syfte = String(formData.get('syfte') || befintlig.syfte).trim();
  const avreseDel = (String(formData.get('avreseDel') || 'hel') as DagDel);
  const hemkomstDel = (String(formData.get('hemkomstDel') || 'halv') as DagDel);
  const m_frukost = num(formData.get('maltider_frukost'), befintlig.maltider_frukost);
  const m_lunch = num(formData.get('maltider_lunch'), befintlig.maltider_lunch);
  const m_middag = num(formData.get('maltider_middag'), befintlig.maltider_middag);
  const anteckning = String(formData.get('anteckning') || '').trim();

  const r = beraknaTraktamente({
    avresa, hemkomst, avreseDel, hemkomstDel,
    maltider_frukost: m_frukost,
    maltider_lunch: m_lunch,
    maltider_middag: m_middag,
  });

  await supabase.from('traktamente_poster').update({
    avresa, hemkomst, destination, syfte,
    antal_heldagar: r.antal_heldagar,
    antal_halvdagar: r.antal_halvdagar,
    antal_natter: r.antal_natter,
    maltider_frukost: m_frukost,
    maltider_lunch: m_lunch,
    maltider_middag: m_middag,
    brutto_kr: r.brutto_kr,
    maltidsavdrag_kr: r.maltidsavdrag_kr,
    totalt_kr: r.totalt_kr,
    anteckning: anteckning || null,
  }).eq('id', id);

  revalidatePath('/admin/traktamente');
}

export async function raderaTraktamentepost(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('traktamente_poster').delete().eq('id', id);
  revalidatePath('/admin/traktamente');
}
