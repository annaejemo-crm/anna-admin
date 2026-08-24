/* =======================================================================
   Bevakning: vad behöver Anna göra just nu?

   Samma logik som dashboarden visar, men samlad på ett ställe så att den
   dagliga cron-körningen och sidan alltid säger samma sak. Modulen skickar
   aldrig något till en kund. Den läser bara och sammanställer en text som
   mejlas till Anna själv, så inget går ut i hennes namn utan att hon klickar.
   ======================================================================= */

import { harledAvtalStatus, RECENSION_FRAN } from '@/lib/types';

/* Så många dagar får gå innan något räknas som att det behöver en knuff. */
const DAGAR_PAKETVAL = 10;
const DAGAR_OBETALT_PAKET = 14;
const DAGAR_RECENSION = 3;
const DAGAR_INNAN_FOTAT = 14;

export type Bevakningspost = {
  id: string;
  kund_id: string | null;
  kund: string;
  datum: string | null;
  notis: string;
};

export type Bevakning = {
  avtalSaknas: Bevakningspost[];
  obetaldBokningsavgift: Bevakningspost[];
  vantarPaketval: Bevakningspost[];
  obetaltBildpaket: Bevakningspost[];
  recension: Bevakningspost[];
};

export function antalPoster(b: Bevakning): number {
  return (
    b.avtalSaknas.length +
    b.obetaldBokningsavgift.length +
    b.vantarPaketval.length +
    b.obetaltBildpaket.length +
    b.recension.length
  );
}

function kundNamn(k: any): string {
  if (!k) return 'Okänd kund';
  const namn = k.foretagsnamn || `${k.fornamn || ''} ${k.efternamn || ''}`.trim();
  return namn || 'Okänd kund';
}

function dagarSedan(varde: string | null | undefined, nuMs: number): number | null {
  if (!varde) return null;
  const t = Date.parse(String(varde));
  if (Number.isNaN(t)) return null;
  const dagar = Math.floor((nuMs - t) / 86400000);
  return dagar < 0 ? 0 : dagar;
}

const MANADER = ['jan', 'feb', 'mars', 'april', 'maj', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec'];

function datumText(varde: string | null): string {
  if (!varde) return 'utan datum';
  const delar = String(varde).slice(0, 10).split('-');
  if (delar.length !== 3) return String(varde);
  const manad = MANADER[parseInt(delar[1], 10) - 1] || delar[1];
  return `${parseInt(delar[2], 10)} ${manad}`;
}

function kronor(varde: any): string {
  const n = Number(varde) || 0;
  return `${n.toLocaleString('sv-SE')} kr`;
}

/**
 * Läser fram allt som ligger och väntar. Klienten skickas in utifrån så att
 * cron-körningen kan använda service-nyckeln och sidan den inloggade sessionen.
 */
export async function hamtaBevakning(supabase: any, nu?: Date): Promise<Bevakning> {
  const nuDate = nu || new Date();
  const nuMs = nuDate.getTime();
  const idag = nuDate.toISOString().slice(0, 10);
  const bortreGrans = new Date(nuMs + DAGAR_INNAN_FOTAT * 86400000).toISOString().slice(0, 10);

  const bevakning: Bevakning = {
    avtalSaknas: [],
    obetaldBokningsavgift: [],
    vantarPaketval: [],
    obetaltBildpaket: [],
    recension: [],
  };

  /* Allt som inte är avslutat. Filtreras sedan i JS så att reglerna står
     samlade och läsbara i stället för utspridda över fem frågor. */
  const { data: oppnaRaw } = await supabase
    .from('bokningar')
    .select(
      'id, datum, kund_id, status, bokningsavgift_kr, bokningsavgift_betald, bildpaket_namn, bildpaket_kr, bildpaket_betald, kundgalleri_skickat, kundgalleri_skickat_at, paketval_paminnelse_skickat_at, bokning_klar, kund:kunder(fornamn, efternamn, foretagsnamn), avtal(status)'
    )
    .eq('bokning_klar', false)
    .order('datum', { ascending: true });

  for (const b of (oppnaRaw || []) as any[]) {
    if (b.status === 'avbokad') continue;

    const post = {
      id: String(b.id),
      kund_id: b.kund_id ? String(b.kund_id) : null,
      kund: kundNamn(b.kund),
      datum: b.datum || null,
    };

    const kommandeInomFonster = b.datum && b.datum >= idag && b.datum <= bortreGrans;

    if (kommandeInomFonster && harledAvtalStatus(b) === 'inget') {
      bevakning.avtalSaknas.push({ ...post, notis: `fotografering ${datumText(b.datum)}` });
    }

    if (kommandeInomFonster && !b.bokningsavgift_betald && Number(b.bokningsavgift_kr) > 0) {
      bevakning.obetaldBokningsavgift.push({
        ...post,
        notis: `${kronor(b.bokningsavgift_kr)}, fotografering ${datumText(b.datum)}`,
      });
    }

    const dagarSedanGalleri = dagarSedan(b.kundgalleri_skickat_at, nuMs);

    if (b.kundgalleri_skickat && !b.bildpaket_namn) {
      if (dagarSedanGalleri === null || dagarSedanGalleri >= DAGAR_PAKETVAL) {
        const dagarSedanPaminnelse = dagarSedan(b.paketval_paminnelse_skickat_at, nuMs);
        const bas = dagarSedanGalleri === null
          ? 'galleri skickat, inget paket valt'
          : `galleri skickat för ${dagarSedanGalleri} dagar sedan`;
        const paminnelse = dagarSedanPaminnelse === null
          ? 'ingen påminnelse skickad'
          : `påminnelse skickad för ${dagarSedanPaminnelse} dagar sedan`;
        bevakning.vantarPaketval.push({ ...post, notis: `${bas}, ${paminnelse}` });
      }
    }

    if (b.bildpaket_namn && !b.bildpaket_betald && Number(b.bildpaket_kr) > 0) {
      if (dagarSedanGalleri === null || dagarSedanGalleri >= DAGAR_OBETALT_PAKET) {
        bevakning.obetaltBildpaket.push({
          ...post,
          notis: `${b.bildpaket_namn}, ${kronor(b.bildpaket_kr)} ej markerad som betald`,
        });
      }
    }
  }

  /* Klara bokningar som väntar på recensionsförfrågan. Samma avgränsning som
     dashboarden: bara kunder som blivit klara efter RECENSION_FRAN, eftersom
     tidigare kunder redan är mejlade utanför systemet. */
  const { data: klaraRaw } = await supabase
    .from('bokningar')
    .select('id, datum, kund_id, bokning_klar_at, kund:kunder(fornamn, efternamn, foretagsnamn, email)')
    .eq('bokning_klar', true)
    .is('recension_mail_skickat_at', null)
    .not('skippa_recensionsmail', 'is', true)
    .gte('bokning_klar_at', RECENSION_FRAN)
    .order('bokning_klar_at', { ascending: false });

  for (const b of (klaraRaw || []) as any[]) {
    if (!b.kund?.email) continue;
    const dagar = dagarSedan(b.bokning_klar_at, nuMs);
    if (dagar !== null && dagar < DAGAR_RECENSION) continue;
    bevakning.recension.push({
      id: String(b.id),
      kund_id: b.kund_id ? String(b.kund_id) : null,
      kund: kundNamn(b.kund),
      datum: b.datum || null,
      notis: dagar === null ? 'klar' : `klar sedan ${dagar} dagar`,
    });
  }

  return bevakning;
}

function avsnitt(rubrik: string, poster: Bevakningspost[]): string {
  if (poster.length === 0) return '';
  const rader = poster.map((p) => `  ${p.kund} · ${p.notis}`).join('\n');
  return `${rubrik} (${poster.length})\n${rader}\n\n`;
}

/**
 * Bygger dagens mejl. Returnerar null när ingenting behöver göras, så att
 * inget tomt mejl skickas.
 */
export function byggPaminnelsemail(
  bevakning: Bevakning,
  appUrl: string,
  nu?: Date
): { amne: string; brodtext: string } | null {
  if (antalPoster(bevakning) === 0) return null;

  const nuDate = nu || new Date();
  const dag = nuDate.getDate();
  const manad = MANADER[nuDate.getMonth()] || '';

  let kropp = '';
  kropp += avsnitt('Avtal saknas', bevakning.avtalSaknas);
  kropp += avsnitt('Obetald bokningsavgift', bevakning.obetaldBokningsavgift);
  kropp += avsnitt('Väntar på paketval', bevakning.vantarPaketval);
  kropp += avsnitt('Obetalt bildpaket', bevakning.obetaltBildpaket);
  kropp += avsnitt('Redo för recensionsförfrågan', bevakning.recension);

  const brodtext =
    `Det här ligger och väntar ${dag} ${manad}.\n\n` +
    kropp +
    `Öppna CRM: ${appUrl}/admin\n`;

  return {
    amne: `Att göra i CRM: ${antalPoster(bevakning)} punkter`,
    brodtext: brodtext,
  };
}
