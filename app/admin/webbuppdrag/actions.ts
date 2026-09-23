'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { WEBB_LAGEN, WEBB_TYPER, type WebbLage, type WebbTyp } from '@/lib/types';

const LAGEN = WEBB_LAGEN.map(function(l) { return l.kod; });
const TYPER = WEBB_TYPER.map(function(t) { return t.kod; });

function uppdateraSidor(kundId?: string | null) {
  revalidatePath('/admin');
  revalidatePath('/admin/webbuppdrag');
  revalidatePath('/admin/ekonomi');
  revalidatePath('/admin/utveckling');
  revalidatePath('/admin/kunder');
  if (kundId) revalidatePath(`/admin/kunder/${kundId}`);
}

function avbryt(varfor: string): never {
  redirect('/admin/webbuppdrag?fel=' + encodeURIComponent(varfor));
}

function heltal(v: FormDataEntryValue | null): number | null {
  const s = String(v || '').replace(/\s/g, '').replace(',', '.');
  if (!s) return null;
  const n = Math.round(parseFloat(s));
  return Number.isFinite(n) ? n : null;
}

function datum(v: FormDataEntryValue | null): string | null {
  const s = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Datumen for klar, fakturerad och betald foljer laget nar Anna inte satt
 * dem sjalv: flyttas laget till klar satts klar_datum till i dag, och sa
 * vidare. Datum som redan finns rors inte.
 */
function datumFranLage(lage: WebbLage, nuvarande: { klar_datum: string | null; fakturerad_datum: string | null; betald_datum: string | null }) {
  const idag = new Date().toISOString().slice(0, 10);
  const ut: { klar_datum?: string; fakturerad_datum?: string; betald_datum?: string } = {};
  if ((lage === 'klar' || lage === 'fakturerad' || lage === 'betald') && !nuvarande.klar_datum) ut.klar_datum = idag;
  if ((lage === 'fakturerad' || lage === 'betald') && !nuvarande.fakturerad_datum) ut.fakturerad_datum = idag;
  if (lage === 'betald' && !nuvarande.betald_datum) ut.betald_datum = idag;
  return ut;
}

/**
 * Nytt webbuppdrag. Antingen pa en existerande kund (kund_id) eller pa en
 * ny kund som skapas samtidigt och markeras som webbkund. Titel kravs,
 * och kund. Resten fylls pa efter hand. Kraver migration 0014.
 */
export async function skapaWebbuppdrag(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const titel = String(formData.get('titel') || '').trim();
  if (!titel) avbryt('fyll i vad uppdraget gäller.');

  const typRaw = String(formData.get('typ') || 'seo_analys');
  const typ: WebbTyp = (TYPER.indexOf(typRaw as WebbTyp) !== -1 ? typRaw : 'seo_analys') as WebbTyp;
  const lageRaw = String(formData.get('lage') || 'forfragan');
  const lage: WebbLage = (LAGEN.indexOf(lageRaw as WebbLage) !== -1 ? lageRaw : 'forfragan') as WebbLage;

  // Vald kund i listan vinner, annars skapas en ny kund av namnfalten
  let kund_id: string | null = String(formData.get('kund_id') || '') || null;

  if (kund_id) {
    await supabase.from('kunder').update({ ar_webbkund: true }).eq('id', kund_id);
  } else {
    const foretagsnamn = String(formData.get('foretagsnamn') || '').trim();
    const fornamn = String(formData.get('fornamn') || '').trim();
    const efternamn = String(formData.get('efternamn') || '').trim() || null;
    if (!foretagsnamn && !fornamn) avbryt('välj en kund i listan eller fyll i företagsnamn eller förnamn på en ny.');
    const email = String(formData.get('email') || '').trim() || null;
    const telefon = String(formData.get('telefon') || '').trim() || null;

    const { data: nyKund, error: kundFel } = await supabase.from('kunder').insert({
      user_id: user.id,
      fornamn: fornamn || foretagsnamn,
      efternamn: efternamn,
      foretagsnamn: foretagsnamn || null,
      ar_webbkund: true,
      email: email,
      telefon: telefon,
      hur_hittade: 'Webbuppdrag',
    }).select('id').single();

    if (kundFel || !nyKund) avbryt('kunden kunde inte sparas. Är migration 0014 körd i Supabase?');
    kund_id = nyKund.id;
  }

  const bas = { klar_datum: datum(formData.get('klar_datum')), fakturerad_datum: null, betald_datum: null };

  const { error } = await supabase.from('webbuppdrag').insert({
    user_id: user.id,
    kund_id: kund_id,
    titel: titel,
    typ: typ,
    lage: lage,
    hemsida: String(formData.get('hemsida') || '').trim() || null,
    pris_kr: heltal(formData.get('pris_kr')),
    start_datum: datum(formData.get('start_datum')),
    klar_datum: bas.klar_datum,
    nasta_steg: String(formData.get('nasta_steg') || '').trim() || null,
    uppfoljning_datum: datum(formData.get('uppfoljning_datum')),
    anteckning: String(formData.get('anteckning') || '').trim() || null,
    ...datumFranLage(lage, bas),
  });

  if (error) avbryt('uppdraget kunde inte sparas. Är migration 0014 körd i Supabase?');

  uppdateraSidor(kund_id);
  redirect('/admin/webbuppdrag');
}

/**
 * Uppdaterar lage, pris, nasta steg och uppfoljningsdatum inline fran
 * listan. Datumen for klar, fakturerad och betald satts automatiskt nar
 * laget passerar dem, om de inte redan finns.
 */
export async function uppdateraWebbuppdrag(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  if (!id) return;

  const { data: nuvarande } = await supabase
    .from('webbuppdrag')
    .select('kund_id, klar_datum, fakturerad_datum, betald_datum')
    .eq('id', id)
    .maybeSingle();
  if (!nuvarande) return;

  const lageRaw = String(formData.get('lage') || '');
  const lage: WebbLage | null = LAGEN.indexOf(lageRaw as WebbLage) !== -1 ? (lageRaw as WebbLage) : null;

  const andring: Record<string, unknown> = {
    nasta_steg: String(formData.get('nasta_steg') || '').trim() || null,
    uppfoljning_datum: datum(formData.get('uppfoljning_datum')),
    updated_at: new Date().toISOString(),
  };
  if (formData.has('pris_kr')) andring.pris_kr = heltal(formData.get('pris_kr'));
  if (lage) {
    andring.lage = lage;
    Object.assign(andring, datumFranLage(lage, nuvarande));
  }

  await supabase.from('webbuppdrag').update(andring).eq('id', id);
  uppdateraSidor(nuvarande.kund_id);

  const tillbaka = String(formData.get('tillbaka') || '');
  if (tillbaka === 'kund') redirect(`/admin/kunder/${nuvarande.kund_id}`);
}

/**
 * Snabbknapp fran dashboarden och listan: markerar uppfoljningen som gjord
 * genom att ta bort datumet, utan att andra laget.
 */
export async function webbUppfoljningKlar(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  if (!id) return;
  const { data } = await supabase.from('webbuppdrag').update({ uppfoljning_datum: null }).eq('id', id).select('kund_id').maybeSingle();
  uppdateraSidor(data?.kund_id);
}
