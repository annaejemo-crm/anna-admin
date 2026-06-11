import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Exporterar körjournalen som CSV med samma upplägg som Annas befintliga Excel.
 * Excel öppnar filen direkt eftersom semikolon används som separator.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ar = url.searchParams.get('ar') || new Date().getFullYear().toString();
  const bil = url.searchParams.get('bil') || 'TMX76G';
  const start = `${ar}-01-01`;
  const slut = `${ar}-12-31`;

  const supabase = await createClient();

  const { data: inst } = await supabase
    .from('installningar')
    .select('milersattning_kr, hemadress')
    .maybeSingle();
  const sats = inst?.milersattning_kr ? Number(inst.milersattning_kr) : 25;
  const hemadress = inst?.hemadress || 'Glasyrvägen 33';

  const { data: matar } = await supabase
    .from('matarstallning')
    .select('borjan_km, slut_km')
    .eq('ar', parseInt(ar, 10))
    .eq('bil', bil)
    .maybeSingle();

  const { data } = await supabase
    .from('korjournal')
    .select('*')
    .eq('bil', bil)
    .gte('datum', start)
    .lte('datum', slut)
    .order('datum', { ascending: true });

  const poster = (data || []) as any[];

  const rader: string[] = [];

  // Header som matchar Annas Excel
  rader.push(`KÖRJOURNAL ${ar} - ${bil} - ANNA EJEMO AB`);
  if (matar?.borjan_km != null || matar?.slut_km != null) {
    const borjan = matar?.borjan_km != null ? `${Number(matar.borjan_km).toLocaleString('sv-SE')} km` : '—';
    const slut = matar?.slut_km != null ? `${Number(matar.slut_km).toLocaleString('sv-SE')} km` : '—';
    rader.push(`Bilens mätarställning vid årets början ${borjan} och slut ${slut}`);
  }
  rader.push('');

  // Kolumnrubriker
  rader.push(
    ['Datum', 'Syfte', 'Adresser & sträckor', 'Km (T/R)', 'Kund', 'Mil', `Milersättning (${sats} kr/mil)`].join(';'),
  );

  let totalKm = 0;
  for (const p of poster) {
    const km = Number(p.antal_km) || 0;
    totalKm += km;
    const mil = km / 10;
    const kr = mil * sats;

    // Bygg "Från - Till - Från" så Anna kan styra från-adress per rad
    const fran = p.fran_adress || hemadress;
    const till = p.plats_adress || p.plats_namn || '';
    const adresserStrang = till
      ? `${fran} - ${till} - ${fran}`
      : '';

    rader.push(
      [
        new Date(p.datum).toLocaleDateString('sv-SE'),
        csvSafe(p.syfte),
        csvSafe(adresserStrang),
        km.toLocaleString('sv-SE'),
        csvSafe(p.medfoljande || ''),
        mil.toLocaleString('sv-SE', { maximumFractionDigits: 2 }),
        kr.toLocaleString('sv-SE', { maximumFractionDigits: 2 }),
      ].join(';'),
    );
  }

  // Summeringsrad
  const totalMil = totalKm / 10;
  const totalKr = totalMil * sats;
  rader.push('');
  rader.push(
    ['', 'ANTAL KM:', '', totalKm.toLocaleString('sv-SE'), '', totalMil.toLocaleString('sv-SE', { maximumFractionDigits: 2 }), totalKr.toLocaleString('sv-SE', { maximumFractionDigits: 2 })].join(';'),
  );

  // BOM för att Excel ska tolka UTF-8 korrekt
  const csv = '﻿' + rader.join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="korjournal-${ar}-${bil}.csv"`,
    },
  });
}

function csvSafe(s: string): string {
  if (!s) return '';
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
