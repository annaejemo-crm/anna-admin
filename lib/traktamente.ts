/* =======================================================================
   Traktamente: beräkningslogik enligt Skatteverkets schablon (inrikes).

   Beloppen är årsbaserade och väljs utifrån avresedatumets år.

   Inkomstår 2025: heldag 290 kr, halvdag 145 kr, nattschablon 145 kr
                   måltidsavdrag helt traktamente: frukost 58, lunch 102, middag 102
   Inkomstår 2026: heldag 300 kr, halvdag 150 kr, nattschablon 150 kr
                   måltidsavdrag helt traktamente: frukost 60, lunch 105, middag 105

   Källa: skatteverket.se, "Traktamente" (reduceringstabellerna per inkomstår).

   OBS: För en dag med halvt traktamente reduceras måltidsavdraget
   proportionellt (hälften). Frukostar antas intas morgnarna efter varje
   övernattning; om hemkomstdagen är halv dag dras därför en av
   frukostarna med halvt belopp.
   ======================================================================= */

export type Beloppssats = {
     heldag: number;
     halvdag: number;
     natt: number;
     avdrag_frukost: number;
     avdrag_lunch: number;
     avdrag_middag: number;
};

export const TRAKTAMENTE_BELOPP_PER_AR: Record<number, Beloppssats> = {
     2025: {
            heldag: 290,
            halvdag: 145,
            natt: 145,
            avdrag_frukost: 58,
            avdrag_lunch: 102,
            avdrag_middag: 102,
     },
     2026: {
            heldag: 300,
            halvdag: 150,
            natt: 150,
            avdrag_frukost: 60,
            avdrag_lunch: 105,
            avdrag_middag: 105,
     },
};

const SENASTE_AR = Math.max(...Object.keys(TRAKTAMENTE_BELOPP_PER_AR).map(Number));

/** Returnerar beloppssatsen för det år ett datum (YYYY-MM-DD) infaller. */
export function beloppForDatum(datum: string): Beloppssats {
     const ar = parseInt(String(datum).slice(0, 4), 10);
     return TRAKTAMENTE_BELOPP_PER_AR[ar] ?? TRAKTAMENTE_BELOPP_PER_AR[SENASTE_AR];
}

/** Bakåtkompatibel export: aktuell (senaste) beloppssats. */
export const TRAKTAMENTE_BELOPP = TRAKTAMENTE_BELOPP_PER_AR[SENASTE_AR];

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
     belopp: Beloppssats;
};

/**
 * Räknar ut antal heldagar, halvdagar, nätter samt brutto, måltidsavdrag och totalbelopp.
 * Logik:
 *   Antal kalenderdagar = (hemkomst - avresa) + 1
 *   Antal nätter = (hemkomst - avresa)
 *   Mellanliggande dagar räknas alltid som hel.
 *   Avrese och hemkomstdag styrs av valet hel/halv.
 *   Beloppssats väljs utifrån avresedatumets år.
 */
export function beraknaTraktamente(input: TraktamenteIndata): TraktamenteResultat {
     const belopp = beloppForDatum(input.avresa);
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
         heldagar * belopp.heldag +
         halvdagar * belopp.halvdag +
         natter * belopp.natt;

  // Frukost: intas morgonen efter en övernattning. Om hemkomstdagen är halv
  // dag dras en av frukostarna med halvt belopp (proportionell reducering).
  let avdragFrukost = 0;
     const frukostar = Math.max(0, input.maltider_frukost);
     if (frukostar > 0) {
            const enFrukostPaHalvdag = dagarTotalt > 1 && input.hemkomstDel === 'halv';
            if (enFrukostPaHalvdag) {
                     avdragFrukost =
                                Math.round(belopp.avdrag_frukost / 2) +
                                (frukostar - 1) * belopp.avdrag_frukost;
            } else {
                     avdragFrukost = frukostar * belopp.avdrag_frukost;
            }
     }

  const avdrag =
         avdragFrukost +
         input.maltider_lunch * belopp.avdrag_lunch +
         input.maltider_middag * belopp.avdrag_middag;

  return {
         antal_heldagar: heldagar,
         antal_halvdagar: halvdagar,
         antal_natter: natter,
         brutto_kr: brutto,
         maltidsavdrag_kr: avdrag,
         totalt_kr: brutto - avdrag,
         belopp,
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
