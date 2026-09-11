import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { byggIcs } from '@/lib/ics';

/* Kalenderprenumeration. Adressen innehaller en hemlig nyckel som Anna
   skapar under Kalender i CRM:et. Nyckeln ar det enda skyddet, sa den
   ska inte delas, och den gar att byta nar som helst. Ingen inloggning,
   eftersom kalenderprogram inte kan logga in. */

export const dynamic = 'force-dynamic';

const APP_URL = 'https://anna-admin-five.vercel.app';

export async function GET(_request: Request, ctx: { params: Promise<{ nyckel: string }> }) {
  const { nyckel } = await ctx.params;
  if (!nyckel || nyckel.length < 16) {
    return new NextResponse('Ej behörig', { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: pren } = await supabase
    .from('kalender_prenumeration')
    .select('user_id')
    .eq('nyckel', nyckel)
    .maybeSingle();

  if (!pren) {
    return new NextResponse('Ej behörig', { status: 401 });
  }

  /* Ett ar bakat och allt framat. Aldre behovs inte i kalendern. */
  const fran = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const { data: bokningar } = await supabase
    .from('bokningar')
    .select('id, kund_id, datum, tid, plats, adress, status, bokningsavgift_kr, bildpaket_kr, intern_anteckning, kund:kunder(fornamn, efternamn, foretagsnamn, email, telefon), fotograferingstyp:fotograferingstyper(namn)')
    .eq('user_id', pren.user_id)
    .gte('datum', fran)
    .order('datum', { ascending: true });

  const ics = byggIcs((bokningar || []) as any[], APP_URL);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="fotograferingar.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
