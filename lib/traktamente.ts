/* =======================================================================
   Traktamente: beräkningslogik enligt Skatteverkets schablon (inrikes).
   Belopp 2025 (justeras vid behov i framtiden):
     Heldag 290 kr, halvdag 145 kr, nattschablon 145 kr
     Måltidsavdrag: frukost 29 kr, lunch 87 kr, middag 87 kr
   ======================================================================= */

export const TRAKTAMENTE_BELOPP = {
  heldag: 290,
  halvdag: 145,
  natt: 145,
  avdrag_frukost: 29,
  avdrag_lunch: 87,
  avdrag_middag: 87,
} as const;

export type DagDel = 'hel' | 'halv';

export type TraktamenteIndata = {
  avresa: string; // YYYY-MM-DD
  hemkomst: string; // YYYY-MM-DD
  avreseDel: DagDel; // hel = avresa före kl 12.00
  hemkomstDel: DagDel; // hel = hemkomst efter kl 19.00
  maltider_frukost: number;
  maltider_lunch: number;
  maltider_middag: number;
  boende_betalat_av_annan?: boolean; // om true: ingen nattschablon
};

export type TraktamenteResultat = {
  antal_heldagar: number;
  antal_halvdagar: number;
  antal_natter: number;
  brutto_kr: number;
  maltidsavdrag_kr: number;
  totalt_kr: number;
};

/**
 * Räknar ut antal heldagar, halvdagar, nätter samt brutto, måltidsavdrag och totalbelopp.
 * Logik:
 *   Antal kalenderdagar = (hemkomst - avresa) + 1
 *   Antal nätter = (hemkomst - avresa)
 *   Mellanliggande dagar räknas alltid som hel.
 *   Avrese och hemkomstdag styrs av valet hel/halv.
 */
export function beraknaTraktamente(input: TraktamenteIndata): TraktamenteResultat {
  const avresa = new Date(input.avresa + 'T00:00:00');
  const hemkomst = new Date(input.hemkomst + 'T00:00:00');
  const dagarTotalt = Math.max(
    1,
    Math.floor((hemkomst.getTime() - avresa.getTime()) / 86400000) + 1,
  );
  const natterBerakn = Math.max(0, dagarTotalt - 1);
  const natter = input.boende_betalat_av_annan ? 0 : natterBerakn;

  let heldagar = 0;
  let halvdagar = 0;

  if (dagarTotalt === 1) {
    // Endagsresa utan övernattning. Räknar bara avresedagens del.
    if (input.avreseDel === 'hel') heldagar = 1;
    else halvdagar = 1;
  } else {
    // Avresedag
    if (input.avreseDel === 'hel') heldagar += 1;
    else halvdagar += 1;
    // Hemkomstdag
    if (input.hemkomstDel === 'hel') heldagar += 1;
    else halvdagar += 1;
    // Mellanliggande dagar
    heldagar += Math.max(0, dagarTotalt - 2);
  }

  const brutto =
    heldagar * TRAKTAMENTE_BELOPP.heldag +
    halvdagar * TRAKTAMENTE_BELOPP.halvdag +
    natter * TRAKTAMENTE_BELOPP.natt;

  const avdrag =
    input.maltider_frukost * TRAKTAMENTE_BELOPP.avdrag_frukost +
    input.maltider_lunch * TRAKTAMENTE_BELOPP.avdrag_lunch +
    input.maltider_middag * TRAKTAMENTE_BELOPP.avdrag_middag;

  return {
    antal_heldagar: heldagar,
    antal_halvdagar: halvdagar,
    antal_natter: natter,
    brutto_kr: brutto,
    maltidsavdrag_kr: avdrag,
    totalt_kr: brutto - avdrag,
  };
}

export type Traktamentepost = {
  id: string;
  user_id: string;
  bokning_id: string | null;
  avresa: string;
  hemkomst: string;
  destination: string;
  syfte: string;
  antal_heldagar: number;
  antal_halvdagar: number;
  antal_natter: number;
  maltider_frukost: number;
  maltider_lunch: number;
  maltider_middag: number;
  belopp_heldag: number;
  belopp_halvdag: number;
  belopp_natt: number;
  avdrag_frukost: number;
  avdrag_lunch: number;
  avdrag_middag: number;
  brutto_kr: number;
  maltidsavdrag_kr: number;
  totalt_kr: number;
  anteckning: string | null;
  created_at: string;
  updated_at: string;
};
