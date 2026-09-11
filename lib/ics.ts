/* =======================================================================
   ICS: bygger en kalenderfil av bokningarna, sa Annas vanliga kalender
   (iPhone, Google, Mac) kan prenumerera pa CRM:et och visa varje
   fotografering med kund, tid och plats utan dubbelskrivning.
   ======================================================================= */

const EJ_BOKNING = ['forfragan', 'tackade_nej', 'avbokad'];

/* Standardlangd pa en fotografering i kalendern nar inget slut finns. */
const TIMMAR = 2;

function esc(s: string): string {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/* Rader far vara hogst 75 tecken i ICS, langre viks med mellanslag. */
function vik(rad: string): string {
  const delar: string[] = [];
  let rest = rad;
  while (rest.length > 73) {
    delar.push(rest.slice(0, 73));
    rest = ' ' + rest.slice(73);
  }
  delar.push(rest);
  return delar.join('\r\n');
}

function kompakt(iso: string): string {
  return String(iso).slice(0, 10).replace(/-/g, '');
}

function plusDagar(iso: string, n: number): string {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function kundNamn(k: any): string {
  if (!k) return 'Kund';
  return k.foretagsnamn || `${k.fornamn || ''} ${k.efternamn || ''}`.trim() || 'Kund';
}

export function arKalenderbokning(b: any): boolean {
  return !!b.datum && EJ_BOKNING.indexOf(b.status) === -1;
}

export function byggIcs(bokningar: any[], appUrl: string): string {
  const nu = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const rader: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fotograf Anna Ejemo//CRM//SV',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Fotograferingar',
    'X-WR-TIMEZONE:Europe/Stockholm',
    'X-PUBLISHED-TTL:PT1H',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Stockholm',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const b of bokningar) {
    if (!arKalenderbokning(b)) continue;
    const namn = kundNamn(b.kund);
    const typ = b.fotograferingstyp?.namn || '';
    const plats = [b.plats, b.adress].filter(Boolean).join(', ');
    const totalt = (Number(b.bokningsavgift_kr) || 0) + (Number(b.bildpaket_kr) || 0);
    const beskrivning = [
      typ ? `Typ: ${typ}` : '',
      b.kund?.telefon ? `Telefon: ${b.kund.telefon}` : '',
      b.kund?.email ? `E-post: ${b.kund.email}` : '',
      totalt ? `Pris: ${totalt.toLocaleString('sv-SE')} kr` : '',
      b.intern_anteckning ? `\n${b.intern_anteckning}` : '',
      `\nI CRM: ${appUrl}/admin/kunder/${b.kund_id}`,
    ].filter(Boolean).join('\n');

    rader.push('BEGIN:VEVENT');
    rader.push(`UID:${b.id}@anna-admin`);
    rader.push(`DTSTAMP:${nu}`);
    if (b.tid) {
      const t = String(b.tid).slice(0, 5).replace(':', '');
      const start = `${kompakt(b.datum)}T${t}00`;
      const h = parseInt(String(b.tid).slice(0, 2), 10);
      const m = String(b.tid).slice(3, 5);
      const slutH = Math.min(h + TIMMAR, 23);
      const slut = `${kompakt(b.datum)}T${String(slutH).padStart(2, '0')}${m}00`;
      rader.push(`DTSTART;TZID=Europe/Stockholm:${start}`);
      rader.push(`DTEND;TZID=Europe/Stockholm:${slut}`);
    } else {
      rader.push(`DTSTART;VALUE=DATE:${kompakt(b.datum)}`);
      rader.push(`DTEND;VALUE=DATE:${kompakt(plusDagar(b.datum, 1))}`);
    }
    rader.push(vik(`SUMMARY:${esc(`Foto: ${namn}${typ ? ' · ' + typ : ''}`)}`));
    if (plats) rader.push(vik(`LOCATION:${esc(plats)}`));
    rader.push(vik(`DESCRIPTION:${esc(beskrivning)}`));
    rader.push(vik(`URL:${appUrl}/admin/kunder/${b.kund_id}`));
    rader.push('END:VEVENT');
  }

  rader.push('END:VCALENDAR');
  return rader.join('\r\n') + '\r\n';
}
