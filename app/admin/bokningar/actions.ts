'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { skickaMail } from '@/lib/mail';
import { skickaPaminnelseFor } from '@/lib/kundpaminnelse';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CYzaSIzh9wxIEBM/review';
const RECENSIONSMAIL_AMNE = 'Tack för ditt förtroende';
const RECENSIONSMAIL_BRODTEXT_BASE = `,

Hoppas du är nöjd med bilderna! Det betyder enormt mycket för mig som liten verksamhet om du har en stund över att lämna en kort recension på Google. Det hjälper andra att hitta mig och är ett väldigt bra sätt för mig att växa på.

Här är länken: ${GOOGLE_REVIEW_URL}

Tack på förhand.

Varma hälsningar
Anna`;

export async function updateBokning(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get('id') || '');
  const kund_id = String(formData.get('kund_id') || '');
  const datum = String(formData.get('datum') || '') || null;
  const tid = String(formData.get('tid') || '') || null;
  const plats = String(formData.get('plats') || '') || null;
  const adress = String(formData.get('adress') || '') || null;
  const fotograferingstyp_id = String(formData.get('fotograferingstyp_id') || '') || null;
  const status = String(formData.get('status') || 'bokad');

  const bokningsavgiftRaw = String(formData.get('bokningsavgift_kr') || '').replace(/\s/g, '').replace(',', '.');
  const bildpaketKrRaw = String(formData.get('bildpaket_kr') || '').replace(/\s/g, '').replace(',', '.');
  const bildpaketNamn = String(formData.get('bildpaket_namn') || '') || null;

  const bokningsavgift_kr = bokningsavgiftRaw ? Math.round(parseFloat(bokningsavgiftRaw)) : null;
  const bildpaket_kr = bildpaketKrRaw ? Math.round(parseFloat(bildpaketKrRaw)) : null;

  const bokningsavgift_betald = formData.get('bokningsavgift_betald') === 'on';
  const bildpaket_betald = formData.get('bildpaket_betald') === 'on';

  const intern_anteckning = String(formData.get('intern_anteckning') || '') || null;
  const visma_fakturanr = String(formData.get('visma_fakturanr') || '') || null;

  // Plats kan vara vald från listan eller frihandstext
  const plats_id_raw = String(formData.get('plats_id') || '');
  const plats_id = plats_id_raw && plats_id_raw !== 'fri' ? plats_id_raw : null;

  // Om en plats valts från listan: hämta dess avstånd och använd platsens namn/adress
  let plats_namn = plats;
  let plats_adress = adress;
  let avstand_km_enkel: number | null = null;
  if (plats_id) {
    const { data: p } = await supabase
      .from('platser')
      .select('namn, adress, avstand_km_enkel')
      .eq('id', plats_id)
      .maybeSingle();
    if (p) {
      plats_namn = p.namn;
      plats_adress = p.adress || adress;
      avstand_km_enkel = p.avstand_km_enkel != null ? Number(p.avstand_km_enkel) : null;
    }
  } else {
    // Fri plats: läs km från fritext-fältet om Anna fyllt i det
    const friRaw = String(formData.get('avstand_km_enkel_fri') || '').replace(',', '.').trim();
    if (friRaw) {
      const friNum = parseFloat(friRaw);
      if (!Number.isNaN(friNum) && friNum > 0) {
        avstand_km_enkel = friNum;
      }
    }
  }

  await supabase.from('bokningar').update({
    datum: datum,
    tid: tid,
    plats: plats_namn,
    adress: plats_adress,
    plats_id,
    avstand_km_enkel,
    fotograferingstyp_id: fotograferingstyp_id,
    status: status,
    bokningsavgift_kr: bokningsavgift_kr,
    bildpaket_namn: bildpaketNamn,
    bildpaket_kr: bildpaket_kr,
    bokningsavgift_betald: bokningsavgift_betald,
    bildpaket_betald: bildpaket_betald,
    intern_anteckning: intern_anteckning,
    visma_fakturanr: visma_fakturanr,
  }).eq('id', id);

  // Om status sätts till klar via formuläret: sätt bokning_klar-flaggan
  // och skapa körjournal-rad ifall avstånd finns och rad saknas.
  if (status === 'klar') {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: bef } = await supabase
      .from('bokningar')
      .select('bokning_klar, kund:kunder(fornamn, efternamn, foretagsnamn)')
      .eq('id', id)
      .single();

    if (bef && !bef.bokning_klar) {
      await supabase.from('bokningar').update({
        bokning_klar: true,
        bokning_klar_at: new Date().toISOString(),
      }).eq('id', id);
    }

    if (user && avstand_km_enkel && avstand_km_enkel > 0) {
      const { data: existing } = await supabase
        .from('korjournal')
        .select('id')
        .eq('bokning_id', id)
        .maybeSingle();

      if (!existing) {
        const kund: any = bef?.kund;
        const kundNamn = kund?.foretagsnamn || `${kund?.fornamn || ''} ${kund?.efternamn || ''}`.trim();

        await supabase.from('korjournal').insert({
          user_id: user.id,
          bokning_id: id,
          datum: datum || new Date().toISOString().slice(0, 10),
          syfte: 'Fotografering',
          plats_namn,
          plats_adress,
          antal_km: avstand_km_enkel * 2,
          medfoljande: kundNamn || null,
          bil: 'TMX76G',
        });
      }
    }
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin/kunder');
  revalidatePath('/admin/ekonomi');
  revalidatePath('/admin/korjournal');
  redirect(`/admin/kunder/${kund_id}`);
}

export async function toggleKundgalleri(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const kund_id = String(formData.get('kund_id') || '');

  const { data: bokning } = await supabase
    .from('bokningar')
    .select('kundgalleri_skickat')
    .eq('id', id)
    .single();

  if (!bokning) return;

  const nyttVarde = !bokning.kundgalleri_skickat;
  await supabase.from('bokningar').update({
    kundgalleri_skickat: nyttVarde,
    kundgalleri_skickat_at: nyttVarde ? new Date().toISOString() : null,
  }).eq('id', id);

  if (kund_id) revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin');
  revalidatePath('/admin/kunder');
}

/**
 * Cyklar status framåt: väntar på galleri → galleri skickat → klar → väntar på galleri.
 * Klar betyder bokning_klar = true. Anna kan klicka tillbaka från klar om hon vill rätta.
 */
export async function gaVidare(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const id = String(formData.get('id') || '');
  const kund_id = String(formData.get('kund_id') || '');

  const { data: b } = await supabase
    .from('bokningar')
    .select('kundgalleri_skickat, bokning_klar, datum, avstand_km_enkel, plats, kund:kunder(fornamn, efternamn, foretagsnamn), fotograferingstyp:fotograferingstyper(namn), plats_ref:platser!plats_id(namn, adress)')
    .eq('id', id)
    .single();

  if (!b) return;

  if (b.bokning_klar) {
    // Tillbaka från klar: nollställ klar-timestamp så recensionsmail-cronen
    // inte räknar gamla bokningar som klara igen.
    await supabase.from('bokningar').update({
      bokning_klar: false,
      bokning_klar_at: null,
      kundgalleri_skickat: false,
      kundgalleri_skickat_at: null,
    }).eq('id', id);
  } else if (b.kundgalleri_skickat) {
    // Galleri skickat → klar. Spara timestamp så cron kan vänta X dagar
    // innan recensionsmail går iväg.
    await supabase.from('bokningar').update({
      bokning_klar: true,
      bokning_klar_at: new Date().toISOString(),
    }).eq('id', id);

    // Auto-skapa rad i körjournalen om bokningen har avstånd.
    // Kollar först att det inte redan finns en rad, annars får Anna dubbla
    // resor varje gång hon klickar tillbaka från klar och sedan klar igen.
    const { data: befintligaRader } = await supabase
      .from('korjournal')
      .select('id')
      .eq('bokning_id', id)
      .limit(1);
    const harRedanRad = !!(befintligaRader && befintligaRader.length > 0);

    if (user && !harRedanRad && b.avstand_km_enkel && Number(b.avstand_km_enkel) > 0) {
      const kund: any = b.kund;
      const platsRef: any = b.plats_ref;
      const kundNamn = kund?.foretagsnamn || `${kund?.fornamn || ''} ${kund?.efternamn || ''}`.trim();
      const platsNamn = platsRef?.namn || b.plats || null;
      const platsAdress = platsRef?.adress || null;
      const tor = Number(b.avstand_km_enkel) * 2;
      const datum = b.datum || new Date().toISOString().slice(0, 10);

      await supabase.from('korjournal').insert({
        user_id: user.id,
        bokning_id: id,
        datum,
        syfte: 'Fotografering',
        plats_namn: platsNamn,
        plats_adress: platsAdress,
        antal_km: tor,
        medfoljande: kundNamn || null,
        bil: 'TMX76G',
      });
    }
  } else {
    await supabase.from('bokningar').update({
      kundgalleri_skickat: true,
      kundgalleri_skickat_at: new Date().toISOString(),
    }).eq('id', id);
  }

  if (kund_id) revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin');
  revalidatePath('/admin/kunder');
  revalidatePath('/admin/korjournal');
}

/**
 * Skickar recensionsmail manuellt till kunden för en specifik bokning.
 * Anna klickar själv när hon vill be om recension.
 * Sätter recension_mail_skickat_at så knappen syns som klar i UI.
 */
export async function skickaRecensionsmail(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const kund_id = String(formData.get('kund_id') || '');
  if (!id) return;

  const { data: bokning } = await supabase
    .from('bokningar')
    .select('id, kund_id, recension_mail_skickat_at')
    .eq('id', id)
    .maybeSingle();

  if (!bokning) return;
  if (bokning.recension_mail_skickat_at) {
    // Redan skickat. Inget mer att göra.
    return;
  }

  const kundIdLokal = bokning.kund_id;
  if (!kundIdLokal) return;

  const { data: kund } = await supabase
    .from('kunder')
    .select('email, fornamn')
    .eq('id', kundIdLokal)
    .maybeSingle();

  if (!kund || !kund.email) return;

  const fornamn = kund.fornamn || '';
  const brodtext = `Hej${fornamn ? ' ' + fornamn : ''}${RECENSIONSMAIL_BRODTEXT_BASE}`;

  const res = await skickaMail({
    till: kund.email,
    amne: RECENSIONSMAIL_AMNE,
    brodtext: brodtext,
  });

  if (res.ok) {
    await supabase
      .from('bokningar')
      .update({ recension_mail_skickat_at: new Date().toISOString() })
      .eq('id', id);
  }

  if (kund_id) revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin/kunder');
}

/**
 * Markerar en bokning så den inte längre visas i Recensionsförfrågan-listan.
 * Anna klickar X på dashboarden när hon inte vill be om recension från just den kunden.
 */
export async function skippaRecensionsmail(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  if (!id) return;
  await supabase.from('bokningar').update({ skippa_recensionsmail: true }).eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/admin/kunder');
}

const PAKETPAMINNELSE_AMNE = 'Påminnelse om dina bilder';

function paketPaminnelseBrodtext(fornamn: string): string {
  return `Hej${fornamn ? ' ' + fornamn : ''},

Hoppas du fått chans att titta igenom galleriet.

Hör av dig när du gjort ditt val av bilder och bildpaket, så ordnar jag med leveransen.

Varma hälsningar
Anna`;
}

/**
 * Skickar påminnelsemail manuellt till kunden om att välja bildpaket.
 * Anna klickar själv på knappen i dashboard när hon vill påminna.
 * Sätter paketval_paminnelse_skickat_at så knappen visas som skickad i UI.
 */
export async function skickaPaketPaminnelse(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const kund_id = String(formData.get('kund_id') || '');
  if (!id) return;

  const { data: bokning } = await supabase
    .from('bokningar')
    .select('id, kund_id')
    .eq('id', id)
    .maybeSingle();

  if (!bokning) return;

  const kundIdLokal = bokning.kund_id;
  if (!kundIdLokal) return;

  const { data: kund } = await supabase
    .from('kunder')
    .select('email, fornamn')
    .eq('id', kundIdLokal)
    .maybeSingle();

  if (!kund || !kund.email) return;

  const fornamn = kund.fornamn || '';
  const brodtext = paketPaminnelseBrodtext(fornamn);

  const res = await skickaMail({
    till: kund.email,
    amne: PAKETPAMINNELSE_AMNE,
    brodtext: brodtext,
  });

  if (res.ok) {
    await supabase
      .from('bokningar')
      .update({ paketval_paminnelse_skickat_at: new Date().toISOString() })
      .eq('id', id);
  }

  if (kund_id) revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin');
  revalidatePath('/admin/kunder');
}

export async function deleteBokning(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const kund_id = String(formData.get('kund_id') || '');
  await supabase.from('bokningar').delete().eq('id', id);
  revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin/kunder');
  revalidatePath('/admin/ekonomi');
  redirect(`/admin/kunder/${kund_id}`);
}

export async function skapaBokning(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Obligatoriskt sedan 2026-09-10: kalla, e-post, telefon, datum och klockslag.
  // Saknas nagot skickas Anna tillbaka till formularet med ett meddelande,
  // inget sparas. Gamla bokningar rors inte, kravet galler bara nya.
  // En forfragan (status forfragan) far sakna datum och tid.
  const status = String(formData.get('status') || 'bokad');
  const arForfragan = status === 'forfragan';

  function avbryt(varfor: string): never {
    redirect('/admin/bokningar/ny?fel=' + encodeURIComponent(varfor) + (arForfragan ? '&status=forfragan' : ''));
  }

  const kund_lage = String(formData.get('kund_lage') || 'ny');
  let kund_id: string | null = null;

  const datum = String(formData.get('datum') || '') || null;
  const tid = String(formData.get('tid') || '') || null;
  const kalla = String(formData.get('kalla') || '').trim() || null;
  const email = String(formData.get('email') || '').trim() || null;
  const telefon = String(formData.get('telefon') || '').trim() || null;

  const saknas: string[] = [];
  if (!datum && !arForfragan) saknas.push('datum');
  if (!tid && !arForfragan) saknas.push('klockslag');
  if (!kalla) saknas.push('källa');

  if (kund_lage === 'existerande') {
    kund_id = String(formData.get('kund_id') || '') || null;
    if (!kund_id) avbryt('välj en kund.');

    const { data: kund } = await supabase
      .from('kunder')
      .select('id, email, telefon')
      .eq('id', kund_id)
      .maybeSingle();
    if (!kund) avbryt('kunden hittades inte.');

    // Kompletterar kunden med det som saknas, utan att skriva over det som finns
    const nyEmail = (kund.email && String(kund.email).trim()) ? null : email;
    const nyTelefon = (kund.telefon && String(kund.telefon).trim()) ? null : telefon;
    if (!(kund.email && String(kund.email).trim()) && !nyEmail) saknas.push('e-post');
    if (!(kund.telefon && String(kund.telefon).trim()) && !nyTelefon) saknas.push('telefon');
    if (saknas.length > 0) avbryt('fyll i ' + saknas.join(', ') + '.');

    if (nyEmail || nyTelefon) {
      const komplettering: { email?: string; telefon?: string } = {};
      if (nyEmail) komplettering.email = nyEmail;
      if (nyTelefon) komplettering.telefon = nyTelefon;
      await supabase.from('kunder').update(komplettering).eq('id', kund_id);
    }
  } else {
    const fornamn = String(formData.get('fornamn') || '').trim();
    const efternamn = String(formData.get('efternamn') || '') || null;
    const foretagsnamn = String(formData.get('foretagsnamn') || '') || null;
    const ar_foretagskund = formData.get('ar_foretagskund') === 'on';
    const hur_hittade = String(formData.get('hur_hittade') || '') || null;

    if (!fornamn) saknas.unshift('förnamn');
    if (!email) saknas.push('e-post');
    if (!telefon) saknas.push('telefon');
    if (saknas.length > 0) avbryt('fyll i ' + saknas.join(', ') + '.');

    const { data: nyKund } = await supabase.from('kunder').insert({
      user_id: user.id,
      fornamn: fornamn,
      efternamn: efternamn,
      foretagsnamn: foretagsnamn,
      ar_foretagskund: ar_foretagskund,
      email: email,
      telefon: telefon,
      hur_hittade: hur_hittade,
    }).select('id').single();

    if (nyKund) kund_id = nyKund.id;
  }

  if (!kund_id) avbryt('kunden kunde inte sparas.');

  const plats = String(formData.get('plats') || '') || null;
  const adress = String(formData.get('adress') || '') || null;
  const fotograferingstyp_id = String(formData.get('fotograferingstyp_id') || '') || null;

  const bokningsavgiftRaw = String(formData.get('bokningsavgift_kr') || '').replace(/\s/g, '').replace(',', '.');
  const bokningsavgift_kr = bokningsavgiftRaw ? Math.round(parseFloat(bokningsavgiftRaw)) : null;
  const bokningsavgift_betald = formData.get('bokningsavgift_betald') === 'on';
  const innefattar_traktamente = formData.get('innefattar_traktamente') === 'on';
  const intern_anteckning = String(formData.get('intern_anteckning') || '') || null;

  // Plats kan vara vald från listan eller frihandstext
  const plats_id_raw = String(formData.get('plats_id') || '');
  const plats_id = plats_id_raw && plats_id_raw !== 'fri' ? plats_id_raw : null;

  let plats_namn = plats;
  let plats_adress = adress;
  let avstand_km_enkel: number | null = null;
  if (plats_id) {
    const { data: p } = await supabase
      .from('platser')
      .select('namn, adress, avstand_km_enkel')
      .eq('id', plats_id)
      .maybeSingle();
    if (p) {
      plats_namn = p.namn;
      plats_adress = p.adress || adress;
      avstand_km_enkel = p.avstand_km_enkel != null ? Number(p.avstand_km_enkel) : null;
    }
  } else {
    // Fri plats: läs km från fritext-fältet om Anna fyllt i det
    const friRaw = String(formData.get('avstand_km_enkel_fri') || '').replace(',', '.').trim();
    if (friRaw) {
      const friNum = parseFloat(friRaw);
      if (!Number.isNaN(friNum) && friNum > 0) {
        avstand_km_enkel = friNum;
      }
    }
  }

  await supabase.from('bokningar').insert({
    user_id: user.id,
    kund_id: kund_id,
    datum: datum,
    tid: tid,
    plats: plats_namn,
    adress: plats_adress,
    plats_id,
    avstand_km_enkel,
    fotograferingstyp_id: fotograferingstyp_id,
    status: status,
    bokningsavgift_kr: bokningsavgift_kr,
    bokningsavgift_betald: bokningsavgift_betald,
    bildpaket_betald: false,
    innefattar_traktamente: innefattar_traktamente,
    intern_anteckning: intern_anteckning,
    kalla: kalla,
  });

  revalidatePath('/admin');
  revalidatePath('/admin/kunder');
  revalidatePath('/admin/forfragningar');
  revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin/ekonomi');
  redirect(arForfragan ? '/admin/forfragningar' : `/admin/kunder/${kund_id}`);
}

/**
 * Avgor en forfragan. "bokad" skickar Anna vidare till redigeringssidan
 * sa hon kan satta datum och tid, "tackade_nej" stanger den utan att
 * radera nagot, sa statistiken i steg 3 kan rakna hur manga som blev bokning.
 */
export async function avgorForfragan(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const beslut = String(formData.get('beslut') || '');
  if (!id) return;
  if (beslut !== 'bokad' && beslut !== 'tackade_nej' && beslut !== 'forfragan') return;

  await supabase.from('bokningar').update({ status: beslut }).eq('id', id);

  revalidatePath('/admin');
  revalidatePath('/admin/forfragningar');
  revalidatePath('/admin/kunder');

  if (beslut === 'bokad') redirect(`/admin/bokningar/${id}/redigera`);
}

/**
 * Kundpaminnelse infor fotografering, styrs fran dashboarden.
 * "skicka" gar ivag direkt oavsett hur manga dagar som ar kvar,
 * "skippa" gor att cron inte skickar nagot for den bokningen,
 * "angra" tar bort skippet sa den gar ut som vanligt.
 */
export async function hanteraKundpaminnelse(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const beslut = String(formData.get('beslut') || '');
  if (!id) return;

  if (beslut === 'skippa') {
    await supabase.from('bokningar').update({ skippa_paminnelse_kund: true }).eq('id', id);
  } else if (beslut === 'angra') {
    await supabase.from('bokningar').update({ skippa_paminnelse_kund: false }).eq('id', id);
  } else if (beslut === 'skicka') {
    const { data: b } = await supabase
      .from('bokningar')
      .select('id, user_id, kund_id, datum, tid, plats, adress, status, bokningsavgift_kr, bildpaket_namn, bildpaket_kr, paminnelse_kund_skickat_at, skippa_paminnelse_kund, kund:kunder(fornamn, efternamn, foretagsnamn, email), fotograferingstyp:fotograferingstyper(namn)')
      .eq('id', id)
      .maybeSingle();
    if (!b || !b.datum) return;
    const kundObj: any = b.kund;
    await skickaPaminnelseFor(supabase, {
      id: String(b.id),
      user_id: String(b.user_id),
      kund_id: b.kund_id ? String(b.kund_id) : null,
      kund: kundNamnFor(kundObj),
      email: kundObj?.email || null,
      datum: b.datum,
      tid: b.tid || null,
      plats: b.plats || null,
      skickasDatum: b.datum,
      skickat_at: b.paminnelse_kund_skickat_at || null,
      skippad: !!b.skippa_paminnelse_kund,
      bokning: b,
    });
  }

  revalidatePath('/admin');
  revalidatePath('/admin/kunder');
}

function kundNamnFor(k: any): string {
  if (!k) return 'Okänd kund';
  return k.foretagsnamn || `${k.fornamn || ''} ${k.efternamn || ''}`.trim() || 'Okänd kund';
}

export async function updateKund(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const fornamn = String(formData.get('fornamn') || '');
  const efternamn = String(formData.get('efternamn') || '') || null;
  const foretagsnamn = String(formData.get('foretagsnamn') || '') || null;
  const ar_foretagskund = formData.get('ar_foretagskund') === 'on';
  const email = String(formData.get('email') || '') || null;
  const telefon = String(formData.get('telefon') || '') || null;
  const hur_hittade = String(formData.get('hur_hittade') || '') || null;
  const korta_anteckningar = String(formData.get('korta_anteckningar') || '') || null;

  await supabase.from('kunder').update({
    fornamn: fornamn,
    efternamn: efternamn,
    foretagsnamn: foretagsnamn,
    ar_foretagskund: ar_foretagskund,
    email: email,
    telefon: telefon,
    hur_hittade: hur_hittade,
    korta_anteckningar: korta_anteckningar,
  }).eq('id', id);

  revalidatePath(`/admin/kunder/${id}`);
  revalidatePath('/admin/kunder');
  redirect(`/admin/kunder/${id}`);
}
