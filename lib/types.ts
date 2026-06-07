/* ====================================================================
   TypeScript-typer som speglar databasschemat (00_initial.sql)
   ====================================================================== */

export type StatusKod =
  | 'forfragan'
  | 'bokad'
  | 'avtal_skickat'
  | 'signat'
  | 'fotograferad'
  | 'vantar_galleri'
  | 'galleri_skickat'
  | 'paket_att_valja'
  | 'levererat'
  | 'betald'
  | 'klar'
  | 'avbokad';

export const STATUS_LABELS: Record<StatusKod, string> = {
  forfragan: 'Förfrågan',
  bokad: 'Bokad',
  avtal_skickat: 'Avtal skickat',
  signat: 'Signat',
  fotograferad: 'Fotograferad',
  vantar_galleri: 'Väntar på galleri',
  galleri_skickat: 'Galleri skickat',
  paket_att_valja: 'Paket att välja',
  levererat: 'Levererat',
  betald: 'Betald',
  klar: 'Klar',
  avbokad: 'Avbokad',
};

/**
 * Härleder status från en boknings data så vi slipper hålla status-fältet manuellt synkat.
 * Flöde: bokad → väntar_galleri (fotografering passerat) → galleri_skickat → klar (bildpaket valt).
 * Avbokad behålls om explicit satt.
 */
export function harledBokningStatus(b: any): StatusKod {
  if (!b) return 'bokad';
  if (b.status === 'avbokad') return 'avbokad';
  if (b.bokning_klar) return 'klar';
  if (b.bildpaket_namn && b.bildpaket_kr) return 'klar';
  if (b.kundgalleri_skickat) return 'galleri_skickat';
  const idag = new Date().toISOString().slice(0, 10);
  if (b.datum && b.datum < idag) return 'vantar_galleri';
  return 'bokad';
}

export type Fotograferingstyp = {
  id: string;
  user_id: string;
  namn: string;
  beskrivning: string | null;
  ordning: number;
  aktiv: boolean;
  created_at: string;
};

export type Kund = {
  id: string;
  user_id: string;
  fornamn: string;
  efternamn: string | null;
  foretagsnamn: string | null;
  email: string | null;
  telefon: string | null;
  hur_hittade: string | null;
  korta_anteckningar: string | null;
  created_at: string;
  updated_at: string;
};

export type Bokning = {
  id: string;
  user_id: string;
  kund_id: string;
  fotograferingstyp_id: string | null;
  datum: string | null;
  tid: string | null;
  plats: string | null;
  adress: string | null;
  bokningsavgift_kr: number | null;
  bildpaket_namn: string | null;
  bildpaket_kr: number | null;
  status: StatusKod;
  visma_fakturanr: string | null;
  intern_anteckning: string | null;
  created_at: string;
  updated_at: string;
};

export type BokningMedTotalt = Bokning & {
  totalt_kr: number;
};

export type BokningExpanderad = BokningMedTotalt & {
  kund: Kund;
  fotograferingstyp: Fotograferingstyp | null;
};

export type Anteckning = {
  id: string;
  user_id: string;
  bokning_id: string;
  titel: string | null;
  innehall: string;
  created_at: string;
};

export type StatusHandelse = {
  id: string;
  user_id: string;
  bokning_id: string;
  handelse: string;
  status_kod: StatusKod | null;
  beskrivning: string | null;
  created_at: string;
};

export type MailKategori =
  | 'forfragan'
  | 'bokning'
  | 'paminnelse'
  | 'paketval'
  | 'leverans'
  | 'ovrigt';

export type MailMall = {
  id: string;
  user_id: string;
  namn: string;
  kategori: MailKategori | null;
  amne: string;
  brodtext: string;
  ordning: number;
  aktiv: boolean;
  created_at: string;
  updated_at: string;
};

export type MailLoggPost = {
  id: string;
  user_id: string;
  bokning_id: string | null;
  mall_id: string | null;
  till_email: string;
  amne: string;
  brodtext: string;
  skickat_at: string;
  status: 'skickat' | 'misslyckat' | 'utkast';
};

export type Betalning = {
  id: string;
  user_id: string;
  bokning_id: string;
  belopp_kr: number;
  avser: 'bokningsavgift' | 'bildpaket' | 'ovrigt';
  metod: string | null;
  visma_fakturanr: string | null;
  fakturerad_at: string | null;
  betald_at: string | null;
  status: 'fakturerad' | 'betald' | 'kreditad';
  anteckning: string | null;
  created_at: string;
};

export type AvtalsKlausul = { titel: string; brodtext: string };

export type AvtalMall = {
  id: string;
  user_id: string;
  namn: string;
  fotograferingstyp: string | null;
  klausuler: AvtalsKlausul[];
  ordning: number;
  aktiv: boolean;
  created_at: string;
  updated_at: string;
};

export type AvtalDetaljer = {
  kund_namn: string;
  kund_email: string;
  datum: string | null;
  tid: string | null;
  plats: string | null;
  bokningsavgift_kr: number | null;
  bildpaket_text: string;
};

export type Avtal = {
  id: string;
  user_id: string;
  bokning_id: string;
  mall_id: string | null;
  klausuler: AvtalsKlausul[];
  detaljer: AvtalDetaljer;
  slug: string;
  personligt_meddelande: string | null;
  status: 'utkast' | 'skickat' | 'signat' | 'avbruten';
  skickat_at: string | null;
  signerat_at: string | null;
  kontrakts_hash: string | null;
  created_at: string;
};

export type AvtalSignatur = {
  id: string;
  user_id: string;
  avtal_id: string;
  namn: string;
  email: string | null;
  typed_name: string;
  metod: 'esign' | 'bankid';
  ip_adress: string | null;
  user_agent: string | null;
  signerad_at: string;
};

/* =======================================================================
   Dashboard
   ======================================================================= */

export type DashboardSummary = {
  antal_bokningar: number;
  antal_privat: number;
  antal_foretag: number;
  bokad_omsattning_kr: number;
  inkommit_kr: number;
  vantar_paketval: number;
};

/* =======================================================================
   Mall-variabler för mailutskick
   ======================================================================= */

export type MailVariabler = {
  fornamn: string;
  efternamn: string;
  namn: string;
  email: string;
  typ: string;
  datum: string;
  tid: string;
  plats: string;
  bokningsavgift: string;
  bildpaket: string;
  totalt: string;
};

export function resolveTemplate(text: string, vars: Partial<MailVariabler>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = (vars as Record<string, string | undefined>)[key];
    return value !== undefined ? value : `{{${key}}}`;
  });
}
