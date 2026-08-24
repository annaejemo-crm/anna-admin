import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { skickaMail } from '@/lib/mail';
import { hamtaBevakning, byggPaminnelsemail, antalPoster } from '@/lib/paminnelser';

/* Daglig bevakning. Vercel Cron anropar den enligt schemat i vercel.json.
   Mejlet går alltid till Anna själv, aldrig till en kund, så systemet kan
   påminna utan att något skickas ut i hennes namn utan att hon klickat.
   Skickas bara när det faktiskt finns något att göra.

   Går också att köra manuellt: öppna adressen som inloggad i CRM:et. */

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const APP_URL = 'https://anna-admin-five.vercel.app';
const TILL = 'kontakt@annaejemo.se';

async function arTillaten(request: Request): Promise<boolean> {
  if (request.headers.get('x-vercel-cron')) return true;

  const hemlighet = process.env.CRON_SECRET;
  if (hemlighet && request.headers.get('authorization') === `Bearer ${hemlighet}`) return true;

  /* Inloggad i CRM:et räcker, så Anna kan trigga körningen själv. */
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) return true;
  } catch {
    /* ingen session */
  }

  return false;
}

export async function GET(request: Request) {
  if (!(await arTillaten(request))) {
    return NextResponse.json({ ok: false, fel: 'Ej behörig' }, { status: 401 });
  }

  const url = new URL(request.url);
  const torrkorning = url.searchParams.get('torrkor') === '1';

  const supabase = createServiceClient();
  const bevakning = await hamtaBevakning(supabase);
  const antal = antalPoster(bevakning);
  const mail = byggPaminnelsemail(bevakning, APP_URL);

  const rakning = {
    avtal_saknas: bevakning.avtalSaknas.length,
    obetald_bokningsavgift: bevakning.obetaldBokningsavgift.length,
    vantar_paketval: bevakning.vantarPaketval.length,
    obetalt_bildpaket: bevakning.obetaltBildpaket.length,
    recension: bevakning.recension.length,
  };

  if (!mail) {
    return NextResponse.json({ ok: true, antal: 0, skickat: false, rakning });
  }

  if (torrkorning) {
    return NextResponse.json({ ok: true, antal, skickat: false, rakning, forhandsvisning: mail.brodtext });
  }

  const resultat = await skickaMail({ till: TILL, amne: mail.amne, brodtext: mail.brodtext });

  return NextResponse.json({
    ok: resultat.ok,
    antal,
    skickat: resultat.ok,
    rakning,
    fel: resultat.error,
  });
}
