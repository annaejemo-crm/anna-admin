import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { skickaMail } from '@/lib/mail';
import { hamtaBevakning, byggPaminnelsemail, antalPoster } from '@/lib/paminnelser';
import { skickaDagensPaminnelser, DAGAR_FORE } from '@/lib/kundpaminnelse';

/* Daglig bevakning. Vercel Cron anropar den enligt schemat i vercel.json.
   Två saker händer: kundpåminnelser inför fotograferingar om DAGAR_FORE
   dagar går ut till kunderna (beslut 2026-09-11, det enda som går till kund
   utan klick, Anna ser och kan skippa dem i förväg på dashboarden), och
   sedan mejlas Anna själv en lista över vad som ligger och väntar.
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

  /* Kundpåminnelser först, så listan till Anna kan berätta vad som gick ut. */
  const kundpaminnelser = await skickaDagensPaminnelser(supabase, undefined, torrkorning);

  const bevakning = await hamtaBevakning(supabase);
  const antal = antalPoster(bevakning);
  const mail = byggPaminnelsemail(bevakning, APP_URL);

  const rakning = {
    kundpaminnelser: kundpaminnelser.length,
    avtal_saknas: bevakning.avtalSaknas.length,
    obetald_bokningsavgift: bevakning.obetaldBokningsavgift.length,
    vantar_paketval: bevakning.vantarPaketval.length,
    obetalt_bildpaket: bevakning.obetaltBildpaket.length,
    recension: bevakning.recension.length,
  };

  let extra = '';
  if (kundpaminnelser.length > 0) {
    extra = `Påminnelser till kunder, ${DAGAR_FORE} dagar före fotografering (${kundpaminnelser.length})\n` +
      kundpaminnelser.map((p) => `  ${p.kund} · ${p.datum} · ${p.resultat}`).join('\n') + '\n\n';
  }

  if (!mail && !extra) {
    return NextResponse.json({ ok: true, antal: 0, skickat: false, rakning });
  }

  const amne = mail ? mail.amne : `Påminnelser skickade till ${kundpaminnelser.length} kunder`;
  const brodtext = extra + (mail ? mail.brodtext : `Öppna CRM: ${APP_URL}/admin\n`);

  if (torrkorning) {
    return NextResponse.json({ ok: true, antal, skickat: false, rakning, kundpaminnelser, forhandsvisning: brodtext });
  }

  const resultat = await skickaMail({ till: TILL, amne, brodtext });

  return NextResponse.json({
    ok: resultat.ok,
    antal,
    skickat: resultat.ok,
    rakning,
    kundpaminnelser,
    fel: resultat.error,
  });
}
