import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const BILJETT_LABEL: Record<string, string> = {
  forst_till_kvarn: 'Först till kvarn',
  boka_tidigt: 'Boka tidigt',
  ordinarie: 'Ordinarie',
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ar = parseInt(url.searchParams.get('ar') || String(new Date().getFullYear()), 10);
  const typ = url.searchParams.get('typ') || 'deltagare';

  const supabase = await createClient();
  const { data: konf } = await supabase
    .from('fam_konferenser')
    .select('id')
    .eq('ar', ar)
    .maybeSingle();
  if (!konf) return new NextResponse('Ingen konferens hittades', { status: 404 });

  let rows: string[] = [];
  let filename = `fam-${typ}-${ar}.csv`;

  if (typ === 'deltagare') {
    const { data } = await supabase
      .from('fam_deltagare')
      .select('*')
      .eq('konferens_id', konf.id)
      .order('namn');
    rows.push(`FAM ${ar} – Deltagare`);
    rows.push('');
    rows.push(['Namn', 'Email', 'Telefon', 'Hemsida', 'Biljettyp', 'Pris (kr)', 'Betald', 'Betald datum', 'Lunchval', 'Allergier', 'Anteckning'].join(';'));
    for (const d of (data || []) as any[]) {
      rows.push([
        csv(d.namn), csv(d.email), csv(d.telefon), csv(d.fotograf_hemsida),
        csv(BILJETT_LABEL[d.biljettyp] || d.biljettyp),
        d.pris ? String(d.pris) : '',
        d.betald ? 'Ja' : 'Nej',
        d.betald_datum || '',
        csv(d.lunchval), csv(d.allergier), csv(d.anteckning),
      ].join(';'));
    }
  } else if (typ === 'talare') {
    const { data } = await supabase
      .from('fam_talare')
      .select('*')
      .eq('konferens_id', konf.id)
      .order('namn');
    rows.push(`FAM ${ar} – Talare`);
    rows.push('');
    rows.push(['Namn', 'Föreläsningstitel', 'Ämne', 'Hemsida', 'Email', 'Telefon', 'Arvode (kr)', 'Status', 'Anteckning'].join(';'));
    for (const t of (data || []) as any[]) {
      rows.push([
        csv(t.namn), csv(t.forelasning_titel), csv(t.amne), csv(t.hemsida),
        csv(t.email), csv(t.telefon),
        t.arvode ? String(t.arvode) : '',
        csv(t.status), csv(t.anteckning),
      ].join(';'));
    }
  }

  const csvText = '﻿' + rows.join('\n');
  return new NextResponse(csvText, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function csv(s: string | null | undefined): string {
  if (!s) return '';
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
