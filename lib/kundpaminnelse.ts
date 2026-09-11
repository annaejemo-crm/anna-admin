/* =======================================================================
   Kundpåminnelse: mejl till kunden några dagar före fotograferingen.

   Det här är det enda i systemet som går till en kund utan att Anna
   klickar. Reglerna: bara gravidfotograferingar, bara riktiga bokningar
   med datum och e-post, bara
   en gång per bokning, och Anna kan skippa eller skicka i förväg från
   dashboarden. Texten kommer från mallen med kategori "paminnelse"
   under Mailmallar, så Anna äger formuleringen.
   ======================================================================= */

import { resolveTemplate } from '@/lib/types';
import { skickaMail } from '@/lib/mail';

/* Så många dagar före fotograferingen mejlet går ut. */
export const DAGAR_FORE = 2;

/* Bara dessa fotograferingstyper får påminnelsen. Beslut av Anna 2026-09-11:
   enbart gravidkunder, ingen annan. Jämförs utan hänsyn till stora bokstäver. */
export const PAMINNELSE_TYPER = ['gravid'];

export function farPaminnelse(b: any): boolean {
  const typ = String(b?.fotograferingstyp?.namn || '').toLowerCase().trim();
  return PAMINNELSE_TYPER.indexOf(typ) !== -1;
}

const EJ_BOKNING = ['forfragan', 'tackade_nej', 'avbokad'];
const MANADER = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const VECKODAGAR = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];

/* Dagens datum i Stockholm som ÅÅÅÅ-MM-DD, oavsett var servern står. */
export function idagStockholm(nu?: Date): string {
  const d = nu || new Date();
  const delar = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const h = (t: string) => (delar.find((p) => p.type === t) || { value: '' }).value;
  return `${h('year')}-${h('month')}-${h('day')}`;
}

export function plusDagar(iso: string, dagar: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dagar);
  return d.toISOString().slice(0, 10);
}

/* "torsdag 8 oktober" i stället för 2026-10-08 */
export function datumText(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${VECKODAGAR[d.getUTCDay()]} ${d.getUTCDate()} ${MANADER[d.getUTCMonth()]}`;
}

export function tidText(tid: string | null): string {
  if (!tid) return '';
  return String(tid).slice(0, 5);
}

export function kundNamn(k: any): string {
  if (!k) return 'Okänd kund';
  return k.foretagsnamn || `${k.fornamn || ''} ${k.efternamn || ''}`.trim() || 'Okänd kund';
}

export type Paminnelsekandidat = {
  id: string;
  user_id: string;
  kund_id: string | null;
  kund: string;
  email: string | null;
  datum: string;
  tid: string | null;
  plats: string | null;
  skickasDatum: string;
  skickat_at: string | null;
  skippad: boolean;
  bokning: any;
};

/**
 * Kommande fotograferingar inom ett antal dagar, med läget för påminnelsen.
 * Används av dashboarden (visa vad som går ut) och av cron (skicka det som
 * ska ut i dag). Klienten skickas in så cron kan använda service-nyckeln.
 */
export async function hamtaKandidater(supabase: any, nu?: Date, dagarFram: number = 7): Promise<Paminnelsekandidat[]> {
  const idag = idagStockholm(nu);
  const slut = plusDagar(idag, dagarFram);

  const { data } = await supabase
    .from('bokningar')
    .select('id, user_id, kund_id, datum, tid, plats, adress, status, bokningsavgift_kr, bildpaket_namn, bildpaket_kr, paminnelse_kund_skickat_at, skippa_paminnelse_kund, kund:kunder(fornamn, efternamn, foretagsnamn, email), fotograferingstyp:fotograferingstyper(namn)')
    .gte('datum', idag)
    .lte('datum', slut)
    .order('datum', { ascending: true });

  const lista: Paminnelsekandidat[] = [];
  for (const b of (data || []) as any[]) {
    if (EJ_BOKNING.indexOf(b.status) !== -1) continue;
    if (!b.datum) continue;
    if (!farPaminnelse(b)) continue;
    lista.push({
      id: String(b.id),
      user_id: String(b.user_id),
      kund_id: b.kund_id ? String(b.kund_id) : null,
      kund: kundNamn(b.kund),
      email: b.kund?.email || null,
      datum: b.datum,
      tid: b.tid || null,
      plats: b.plats || null,
      skickasDatum: plusDagar(b.datum, -DAGAR_FORE),
      skickat_at: b.paminnelse_kund_skickat_at || null,
      skippad: !!b.skippa_paminnelse_kund,
      bokning: b,
    });
  }
  return lista;
}

/* Variablerna mallen kan använda, formaterade för människor. */
export function byggVariabler(b: any): Record<string, string> {
  const kund = b.kund || {};
  const totalt = (Number(b.bokningsavgift_kr) || 0) + (Number(b.bildpaket_kr) || 0);
  return {
    fornamn: kund.fornamn || '',
    efternamn: kund.efternamn || '',
    namn: kundNamn(kund),
    email: kund.email || '',
    typ: b.fotograferingstyp?.namn || '',
    datum: datumText(b.datum),
    tid: tidText(b.tid),
    plats: [b.plats, b.adress].filter(Boolean).join(', '),
    bokningsavgift: b.bokningsavgift_kr ? `${Number(b.bokningsavgift_kr).toLocaleString('sv-SE')} kr` : '',
    bildpaket: b.bildpaket_namn || '',
    totalt: `${totalt.toLocaleString('sv-SE')} kr`,
  };
}

/* Mallen med kategori paminnelse. Faller tillbaka på en kort standardtext
   om Anna tagit bort mallen, så påminnelsen aldrig blir tom. */
export async function hamtaMall(supabase: any, userId: string): Promise<{ id: string | null; amne: string; brodtext: string }> {
  const { data } = await supabase
    .from('mail_mallar')
    .select('id, amne, brodtext, aktiv')
    .eq('user_id', userId)
    .eq('kategori', 'paminnelse')
    .order('ordning', { ascending: true })
    .limit(1);
  const m = (data || [])[0];
  if (m && m.aktiv !== false && m.brodtext) return { id: String(m.id), amne: m.amne || 'Inför fotograferingen {{datum}}', brodtext: m.brodtext };
  return {
    id: null,
    amne: 'Snart ses vi! Inför fotograferingen {{datum}}',
    brodtext: 'Hej {{fornamn}},\n\nSnart är det dags. Bara en liten påminnelse inför {{datum}}.\n\nVi ses kl {{tid}} på {{plats}}.\n\nHör av dig om något ändras.\n\nVarma hälsningar\nAnna',
  };
}

/**
 * Skickar påminnelsen för en bokning och bokför det. Returnerar false om
 * kunden saknar e-post eller om mejlet inte gick iväg.
 */
export async function skickaPaminnelseFor(supabase: any, k: Paminnelsekandidat): Promise<{ ok: boolean; fel?: string }> {
  if (!k.email) return { ok: false, fel: 'kunden saknar e-post' };
  const mall = await hamtaMall(supabase, k.user_id);
  const vars = byggVariabler(k.bokning);
  const amne = resolveTemplate(mall.amne, vars);
  const brodtext = resolveTemplate(mall.brodtext, vars);

  const res = await skickaMail({ till: k.email, amne, brodtext });
  await supabase.from('mail_logg').insert({
    user_id: k.user_id,
    bokning_id: k.id,
    mall_id: mall.id,
    till_email: k.email,
    amne,
    brodtext,
    status: res.ok ? 'skickat' : 'misslyckat',
  });
  if (res.ok) {
    await supabase.from('bokningar').update({ paminnelse_kund_skickat_at: new Date().toISOString() }).eq('id', k.id);
  }
  return { ok: res.ok, fel: res.error };
}

/**
 * Dagens körning: allt som ska ut i dag eller borde ha gått ut tidigare
 * (om cron missat en dag) men där fotograferingen inte passerat.
 */
export async function skickaDagensPaminnelser(supabase: any, nu?: Date, torrkorning: boolean = false): Promise<{ kund: string; datum: string; resultat: string }[]> {
  const idag = idagStockholm(nu);
  const kandidater = await hamtaKandidater(supabase, nu, DAGAR_FORE);
  const utfall: { kund: string; datum: string; resultat: string }[] = [];
  for (const k of kandidater) {
    if (k.skickat_at || k.skippad) continue;
    if (k.skickasDatum > idag) continue;
    if (!k.email) { utfall.push({ kund: k.kund, datum: k.datum, resultat: 'saknar e-post' }); continue; }
    if (torrkorning) { utfall.push({ kund: k.kund, datum: k.datum, resultat: 'skulle skickas' }); continue; }
    const r = await skickaPaminnelseFor(supabase, k);
    utfall.push({ kund: k.kund, datum: k.datum, resultat: r.ok ? 'skickad' : `misslyckades: ${r.fel || ''}` });
  }
  return utfall;
}
