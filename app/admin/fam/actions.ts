'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { skickaMail } from '@/lib/mail';

/* Sista dag for talarna att skicka in den fardiga presentationen.
   Satt av Anna 2026-10-04 for konferensen i november 2026. Byt har om
   deadline flyttas, texten i mejlet hamtar datumet harifran. */
const PRESENTATION_DEADLINE = '2026-10-29';

/* Reservtext om mallen med kategori talare saknas under Mailmallar. */
const TALARMEJL_AMNE = 'Din presentation till Family and Meetings, senast {{deadline}}';
const TALARMEJL_BRODTEXT = `Hej {{fornamn}},

Vad roligt att du är med på Family and Meetings {{konferensdatum}}.

Nu börjar det närma sig, och för att dagen ska flyta på behöver jag ha hela din presentation, helt färdig, absolut senast {{deadline}}. Skicka den till mig på kontakt@annaejemo.se.

Hör av dig om du undrar över något, eller om du vill bolla upplägget innan.

Kram
Anna`;

function langtDatum(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fyllI(mall: string, vars: Record<string, string>): string {
  return mall.replace(/\{\{(\w+)\}\}/g, function(_m, nyckel) { return vars[nyckel] ?? ''; });
}

/**
 * Mejlar en talare och ber om den fardiga presentationen, med deadline.
 * Skickas bara nar Anna klickar pa knappen, inget gar ut automatiskt.
 * Texten hamtas fran mallen med kategori talare under Mailmallar, med
 * reservtexten ovan om mallen saknas. Bokfors i mail_logg, och tiden
 * sparas pa talaren sa Anna ser vad som redan gatt ut. Kraver 0016.
 */
export async function beOmPresentation(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();

  const { data: talare } = await supabase
    .from('fam_talare')
    .select('id, user_id, namn, email, konferens_id')
    .eq('id', id)
    .maybeSingle();
  if (!talare || !talare.email) return;

  const { data: konf } = await supabase
    .from('fam_konferenser')
    .select('datum, plats')
    .eq('id', talare.konferens_id)
    .maybeSingle();

  const { data: mallar } = await supabase
    .from('mail_mallar')
    .select('id, amne, brodtext, aktiv')
    .eq('user_id', talare.user_id)
    .eq('kategori', 'talare')
    .order('ordning', { ascending: true })
    .limit(1);
  const m = (mallar || [])[0];
  const mall = (m && m.aktiv !== false && m.brodtext)
    ? { id: String(m.id), amne: m.amne || TALARMEJL_AMNE, brodtext: m.brodtext }
    : { id: null as string | null, amne: TALARMEJL_AMNE, brodtext: TALARMEJL_BRODTEXT };

  const namn = String(talare.namn || '').trim();
  const vars: Record<string, string> = {
    namn: namn,
    fornamn: namn.split(/\s+/)[0] || namn,
    deadline: langtDatum(PRESENTATION_DEADLINE),
    konferensdatum: langtDatum(konf?.datum || null),
    plats: konf?.plats || '',
  };

  const amne = fyllI(mall.amne, vars);
  const brodtext = fyllI(mall.brodtext, vars);
  const res = await skickaMail({ till: talare.email, amne, brodtext });

  await supabase.from('mail_logg').insert({
    user_id: talare.user_id,
    mall_id: mall.id,
    till_email: talare.email,
    amne: amne,
    brodtext: brodtext,
    status: res.ok ? 'skickat' : 'misslyckat',
  });

  if (res.ok) {
    await supabase.from('fam_talare').update({ presentation_begard_at: new Date().toISOString() }).eq('id', id);
  }
  revalidatePath('/admin/fam');
}

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

  /* Nya prisnivaer ska sla igenom pa deltagarna direkt. Annars star det gamla
     priset kvar pa alla som redan ar inlagda och Oversikt visar fel intakt. */
  const nyaPriser: Record<string, number> = {
    forst_till_kvarn: num(formData.get('pris_forst_till_kvarn')) || 1100,
    boka_tidigt: num(formData.get('pris_boka_tidigt')) || 1450,
    ordinarie: num(formData.get('pris_ordinarie')) || 1790,
  };
  for (const typ of Object.keys(nyaPriser)) {
    await supabase
      .from('fam_deltagare')
      .update({ pris: nyaPriser[typ] })
      .eq('konferens_id', konf.id)
      .eq('biljettyp', typ);
  }

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

export async function togglaTalareCheck(formData: FormData) {
  const id = String(formData.get('id') || '');
  const field = String(formData.get('field') || '');
  const tillaten = ['utkast_skickat', 'presentation_skickad', 'fakturerad'];
  if (!id || !tillaten.includes(field)) return;
  const supabase = await createClient();
  const { data } = await supabase.from('fam_talare').select(field).eq('id', id).maybeSingle();
  if (!data) return;
  await supabase.from('fam_talare').update({ [field]: !(data as any)[field] }).eq('id', id);
  revalidatePath('/admin/fam');
}

export async function uppdateraTalareArvode(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('fam_talare').update({ arvode: num(formData.get('arvode')) }).eq('id', id);
  revalidatePath('/admin/fam');
}

export async function uppdateraTalareKontakt(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('fam_talare').update({
    email: String(formData.get('email') || '') || null,
    telefon: String(formData.get('telefon') || '') || null,
  }).eq('id', id);
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

/* Priset for en biljettyp hamtas alltid fran konferensen, sa en deltagare
   aldrig kan sta med ett pris som inte finns i prislistan. */
function prisForTyp(konf: any, biljettyp: string): number | null {
  if (biljettyp === 'forst_till_kvarn') return konf.pris_forst_till_kvarn ?? null;
  if (biljettyp === 'boka_tidigt') return konf.pris_boka_tidigt ?? null;
  return konf.pris_ordinarie ?? null;
}

/* Byter biljettyp pa en deltagare och satter om priset samtidigt. */
export async function andraBiljettyp(formData: FormData) {
  const ar = Number(formData.get('ar') || 0);
  const id = String(formData.get('id') || '');
  const biljettyp = String(formData.get('biljettyp') || '');
  if (!id || !biljettyp) return;
  const { supabase, konf } = await getKonferens(ar);
  if (!konf) return;
  await supabase
    .from('fam_deltagare')
    .update({ biljettyp, pris: prisForTyp(konf, biljettyp) })
    .eq('id', id)
    .eq('konferens_id', konf.id);
  revalidatePath('/admin/fam');
}

/* Satter samma biljettyp och pris pa samtliga deltagare i arets konferens.
   Anvands for att lagga en grundniva, sedan andras de som avviker pa raden. */
export async function sattBiljettypForAlla(formData: FormData) {
  const ar = Number(formData.get('ar') || 0);
  const biljettyp = String(formData.get('biljettyp') || '');
  if (!biljettyp) return;
  const { supabase, konf } = await getKonferens(ar);
  if (!konf) return;
  await supabase
    .from('fam_deltagare')
    .update({ biljettyp, pris: prisForTyp(konf, biljettyp) })
    .eq('konferens_id', konf.id);
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

/* ============ UTGIFTER ============ */

export async function skapaUtgift(formData: FormData) {
  const ar = Number(formData.get('ar') || 0);
  const { supabase, user, konf } = await getKonferens(ar);
  if (!user || !konf) return;
  const beskrivning = String(formData.get('beskrivning') || '').trim();
  if (!beskrivning) return;
  const betald = formData.get('betald') === 'on';
  await supabase.from('fam_utgifter').insert({
    user_id: user.id,
    konferens_id: konf.id,
    datum: String(formData.get('datum') || '') || null,
    kategori: String(formData.get('kategori') || 'ovrigt'),
    beskrivning,
    leverantor: String(formData.get('leverantor') || '') || null,
    belopp_kr: num(formData.get('belopp_kr')) || 0,
    betald,
    betald_datum: betald ? new Date().toISOString().slice(0, 10) : null,
  });
  revalidatePath('/admin/fam');
}

export async function togglaBetaldUtgift(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  const { data } = await supabase.from('fam_utgifter').select('betald').eq('id', id).maybeSingle();
  if (!data) return;
  await supabase.from('fam_utgifter').update({
    betald: !data.betald,
    betald_datum: !data.betald ? new Date().toISOString().slice(0, 10) : null,
  }).eq('id', id);
  revalidatePath('/admin/fam');
}

export async function raderaUtgift(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('fam_utgifter').delete().eq('id', id);
  revalidatePath('/admin/fam');
}

/* Byter namn, mejl och hemsida på en deltagare direkt på raden. Byts
   namnet skrivs det gamla in i anteckningen, så det syns att biljetten
   sålts vidare och av vem. Biljettyp, pris och betald rörs inte. */
export async function bytDeltagare(formData: FormData) {
  const id = String(formData.get('id') || '');
  const namn = String(formData.get('namn') || '').trim();
  if (!id || !namn) return;
  const supabase = await createClient();
  const { data } = await supabase.from('fam_deltagare').select('namn, anteckning').eq('id', id).maybeSingle();
  if (!data) return;
  let anteckning = data.anteckning || null;
  if (data.namn && data.namn.trim() !== namn) {
    const datum = new Date().toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
    const rad = `Biljett överlåten från ${data.namn.trim()} ${datum}`;
    anteckning = anteckning ? `${rad}\n${anteckning}` : rad;
  }
  await supabase.from('fam_deltagare').update({
    namn,
    email: String(formData.get('email') || '').trim() || null,
    fotograf_hemsida: String(formData.get('fotograf_hemsida') || '').trim() || null,
    anteckning,
  }).eq('id', id);
  revalidatePath('/admin/fam');
}
