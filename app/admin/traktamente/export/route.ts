import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Exporterar traktamente-poster som CSV (öppnas direkt i Excel).
 * Semikolon-separator + BOM för svensk UTF-8 i Excel.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ar = url.searchParams.get('ar') || new Date().getFullYear().toString();
  const start = `${ar}-01-01`;
  const slut = `${ar}-12-31`;

  const supabase = await createClient();

  const { data } = await supabase
    .from('traktamente_poster')
    .select('*')
    .gte('avresa', start)
    .lte('avresa', slut)
    .order('avresa', { ascending: true });

  const poster = (data || []) as any[];

  const rader: string[] = [];

  rader.push(`TRAKTAMENTE ${ar} - FOTOGRAF ANNA EJEMO AB`);
  rader.push('Skattefritt traktamente enligt Skatteverkets schablon.');
  rader.push('');

  rader.push(
    [
      'Avresa',
      'Hemkomst',
      'Destination',
      'Syfte',
      'Heldagar',
      'Halvdagar',
      'Nätter',
      'Frukost (antal)',
      'Lunch (antal)',
      'Middag (antal)',
      'Brutto (kr)',
      'Måltidsavdrag (kr)',
      'Att betala ut (kr)',
      'Anteckning',
    ].join(';'),
  );

  let totBrutto = 0;
  let totAvdrag = 0;
  let totTotalt = 0;
  let totHel = 0;
  let totHalv = 0;
  let totNatt = 0;

  for (const p of poster) {
    const brutto = Number(p.brutto_kr) || 0;
    const avdrag = Number(p.maltidsavdrag_kr) || 0;
    const totalt = Number(p.totalt_kr) || 0;

    totBrutto += brutto;
    totAvdrag += avdrag;
    totTotalt += totalt;
    totHel += Number(p.antal_heldagar) || 0;
    totHalv += Number(p.antal_halvdagar) || 0;
    totNatt += Number(p.antal_natter) || 0;

    rader.push(
      [
        formatDate(p.avresa),
        formatDate(p.hemkomst),
        csvSafe(p.destination),
        csvSafe(p.syfte),
        String(p.antal_heldagar || 0),
        String(p.antal_halvdagar || 0),
        String(p.antal_natter || 0),
        String(p.maltider_frukost || 0),
        String(p.maltider_lunch || 0),
        String(p.maltider_middag || 0),
        brutto.toLocaleString('sv-SE'),
        avdrag.toLocaleString('sv-SE'),
        totalt.toLocaleString('sv-SE'),
        csvSafe(p.anteckning || ''),
      ].join(';'),
    );
  }

  rader.push('');
  rader.push(
    [
      '',
      'TOTALT:',
      '',
      '',
      String(totHel),
      String(totHalv),
      String(totNatt),
      '',
      '',
      '',
      totBrutto.toLocaleString('sv-SE'),
      totAvdrag.toLocaleString('sv-SE'),
      totTotalt.toLocaleString('sv-SE'),
      '',
    ].join(';'),
  );

  const csv = '﻿' + rader.join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="traktamente-${ar}.csv"`,
    },
  });
}

function formatDate(d: string | null): string {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('sv-SE');
}

function csvSafe(s: string): string {
  if (!s) return '';
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
