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

/**
 * Flytta en körjournal-rad uppåt eller nedåt inom samma datum.
 * Byter pos-värde med raden ovanför/under.
 */
export async function flyttaKorjournalpost(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const riktning = String(formData.get('riktning') || '');
  if (!id || (riktning !== 'upp' && riktning !== 'ner')) return;

  const { data: rad } = await supabase
    .from('korjournal')
    .select('id, datum, pos, bil')
    .eq('id', id)
    .maybeSingle();
  if (!rad) return;

  // Hämta granne med samma datum OCH samma bil (annars swap:as resor mellan bilar)
  let queryGranne = supabase
    .from('korjournal')
    .select('id, pos')
    .eq('datum', rad.datum)
    .eq('bil', rad.bil);

  if (riktning === 'upp') {
    queryGranne = queryGranne.lt('pos', rad.pos).order('pos', { ascending: false }).limit(1);
  } else {
    queryGranne = queryGranne.gt('pos', rad.pos).order('pos', { ascending: true }).limit(1);
  }

  const { data: grannar } = await queryGranne;
  const granne = grannar && grannar[0];

  if (granne) {
    // Byt pos-värden
    await supabase.from('korjournal').update({ pos: granne.pos }).eq('id', rad.id);
    await supabase.from('korjournal').update({ pos: rad.pos }).eq('id', granne.id);
  } else {
    // Ingen granne med pos-skillnad. Sätt nytt pos relativt rad.
    const nyPos = riktning === 'upp' ? (rad.pos as number) - 1 : (rad.pos as number) + 1;
    await supabase.from('korjournal').update({ pos: nyPos }).eq('id', rad.id);
  }

  revalidatePath('/admin/korjournal');
}

/**
 * Lägg till en manuell körjournal-post.
 * För resor som inte hör till en bokning, eller poster du vill rätta i efterhand.
 */
export async function skapaKorjournalpost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const datum = String(formData.get('datum') || '').trim();
  if (!datum) return;

  const syfte = String(formData.get('syfte') || '').trim();
  if (!syfte) return;

  const fran_adress = String(formData.get('fran_adress') || '').trim() || null;
  const plats_namn = String(formData.get('plats_namn') || '').trim() || null;
  const plats_adress = String(formData.get('plats_adress') || '').trim() || null;
  const medfoljande = String(formData.get('medfoljande') || '').trim() || null;

  const kmRaw = String(formData.get('antal_km') || '').replace(',', '.').trim();
  const antal_km_parsed = kmRaw ? parseFloat(kmRaw) : NaN;
  const antal_km = Number.isNaN(antal_km_parsed) ? null : antal_km_parsed;

  const bil = String(formData.get('bil') || 'TMX76G').trim() || 'TMX76G';

  await supabase.from('korjournal').insert({
    user_id: user.id,
    datum,
    syfte,
    fran_adress,
    plats_namn,
    plats_adress,
    antal_km,
    medfoljande,
    bil,
  });

  revalidatePath('/admin/korjournal');
}

/**
 * Byter bil för en körjournal-rad (mellan TMX76G och UDD408).
 */
export async function bytBilForKorjournalpost(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  if (!id) return;
  const { data: rad } = await supabase
    .from('korjournal')
    .select('bil')
    .eq('id', id)
    .maybeSingle();
  if (!rad) return;
  const nyBil = rad.bil === 'UDD408' ? 'TMX76G' : 'UDD408';
  await supabase.from('korjournal').update({ bil: nyBil }).eq('id', id);
  revalidatePath('/admin/korjournal');
}

/**
 * Uppdatera en befintlig körjournal-rad. Anna kan ändra datum, syfte,
 * plats, km och kund direkt på raden.
 */
export async function uppdateraKorjournalpost(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  if (!id) return;

  const datum = String(formData.get('datum') || '').trim();
  const syfte = String(formData.get('syfte') || '').trim();
  const fran_adress = String(formData.get('fran_adress') || '').trim() || null;
  const plats_namn = String(formData.get('plats_namn') || '').trim() || null;
  const plats_adress = String(formData.get('plats_adress') || '').trim() || null;
  const medfoljande = String(formData.get('medfoljande') || '').trim() || null;
  const kmRaw = String(formData.get('antal_km') || '').replace(',', '.').trim();
  const antal_km_parsed = kmRaw ? parseFloat(kmRaw) : NaN;
  const antal_km = Number.isNaN(antal_km_parsed) ? null : antal_km_parsed;

  const update: any = { fran_adress, plats_namn, plats_adress, medfoljande, antal_km };
  if (datum) update.datum = datum;
  if (syfte) update.syfte = syfte;

  await supabase.from('korjournal').update(update).eq('id', id);
  revalidatePath('/admin/korjournal');
}

/**
 * Synka körjournal från bokningar vars datum har passerat (eller är idag).
 * Skapar rader även när avstånd saknas så Anna kan fylla i km själv.
 * Syfte är alltid "Fotografering". Kunden hamnar i Kund-kolumnen.
 */
export async function synkaKorjournalFranBokningar(_formData?: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const idag = new Date().toISOString().slice(0, 10);

  // 1. Koppla bokningar till platser där text matchar (om plats_id saknas)
  const { data: platser } = await supabase
    .from('platser')
    .select('id, namn, avstand_km_enkel, adress')
    .not('avstand_km_enkel', 'is', null);

  const { data: utanPlatsId } = await supabase
    .from('bokningar')
    .select('id, plats')
    .is('plats_id', null)
    .not('plats', 'is', null);

  for (const b of (utanPlatsId || []) as any[]) {
    const bp = String(b.plats || '').toLowerCase();
    const match = (platser || []).find((p: any) => {
      const pn = String(p.namn || '').toLowerCase();
      return bp.includes(pn) || pn.includes(bp);
    });
    if (match) {
      await supabase
        .from('bokningar')
        .update({ plats_id: match.id, avstand_km_enkel: match.avstand_km_enkel })
        .eq('id', b.id);
    }
  }

  // 2. Hämta alla bokningar där datum har passerat
  const { data: passerade } = await supabase
    .from('bokningar')
    .select('id, datum, plats, adress, avstand_km_enkel, plats_id, kund:kunder(fornamn, efternamn, foretagsnamn), plats_ref:platser!plats_id(namn, adress)')
    .lte('datum', idag)
    .not('datum', 'is', null);

  // 3. Hämta vilka bokning_id som redan finns i körjournal
  const { data: befintliga } = await supabase
    .from('korjournal')
    .select('bokning_id')
    .not('bokning_id', 'is', null);
  const finns = new Set((befintliga || []).map((r: any) => r.bokning_id));

  // 4. Skapa rader för de som saknas
  let skapade = 0;
  for (const b of (passerade || []) as any[]) {
    if (finns.has(b.id)) continue;
    const kund: any = b.kund;
    const platsRef: any = b.plats_ref;
    const kundNamn = kund?.foretagsnamn || `${kund?.fornamn || ''} ${kund?.efternamn || ''}`.trim();
    const platsNamn = platsRef?.namn || b.plats || null;
    const platsAdress = platsRef?.adress || b.adress || null;
    const km = b.avstand_km_enkel && Number(b.avstand_km_enkel) > 0
      ? Number(b.avstand_km_enkel) * 2
      : null;

    const { error } = await supabase.from('korjournal').insert({
      user_id: user.id,
      bokning_id: b.id,
      datum: b.datum,
      syfte: 'Fotografering',
      plats_namn: platsNamn,
      plats_adress: platsAdress,
      antal_km: km,
      medfoljande: kundNamn || null,
      bil: 'TMX76G',
    });
    if (!error) skapade++;
  }

  revalidatePath('/admin/korjournal');
}

/**
 * Uppdatera mätarställning för ett år (vid årets början eller slut).
 */
export async function sparaMatarstallning(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const ar = parseInt(String(formData.get('ar') || ''), 10);
  if (!ar) return;

  const bil = String(formData.get('bil') || 'TMX76G').trim() || 'TMX76G';
  const borjanRaw = String(formData.get('borjan_km') || '').replace(',', '.').trim();
  const slutRaw = String(formData.get('slut_km') || '').replace(',', '.').trim();

  const borjan_km = borjanRaw ? parseFloat(borjanRaw) : null;
  const slut_km = slutRaw ? parseFloat(slutRaw) : null;

  await supabase.from('matarstallning').upsert({
    user_id: user.id,
    ar,
    bil,
    borjan_km: Number.isNaN(borjan_km as number) ? null : borjan_km,
    slut_km: Number.isNaN(slut_km as number) ? null : slut_km,
    uppdaterad_at: new Date().toISOString(),
  }, { onConflict: 'user_id,ar,bil' });

  revalidatePath('/admin/korjournal');
}
