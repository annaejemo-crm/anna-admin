import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/* Tar emot webhooks från MailerLite-automationerna.
   Fotografer: "Simple welcome email" (gruppen Fotografer guide), utan typ-param.
   Kunder: "Gravidguide välkomstmejl" m.fl. (gruppen Gravida guide), med ?typ=kund.
   Varje automation skickar även ?guide=<slug> så vi kan visa vilka guider en
   person laddat ner. Guiderna ackumuleras per mejl i raw._guider (ingen kolumn
   behövs), så en person som laddar ner flera guider får flera taggar.
   Token skickas som query-param eftersom MailerLites webhook-steg inte stöder headers. */

const WEBHOOK_TOKEN = 'aedc0cc4c2b83205c7c1e327063a9ba9728366fbfda53292';

const GUIDE_LABELS: Record<string, string> = {
  vantan: 'Att fotografera väntan',
  seo: 'SEO-guide',
  forbered: 'Förbered dig',
  vecka: 'Vecka för vecka',
};

/* MailerLite skickar ibland subscriber direkt, ibland batchat som
   { events: [ { subscriber: {...} } ] }. Båda formaten hanteras här. */

function hittaEmail(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = hittaEmail(item);
      if (found) return found;
    }
    return null;
  }
  const o = obj as Record<string, unknown>;
  if (typeof o.email === 'string' && o.email.includes('@')) return o.email;
  for (const key of ['subscriber', 'data', 'fields', 'events']) {
    const found = hittaEmail(o[key]);
    if (found) return found;
  }
  return null;
}

function hittaNamn(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = hittaNamn(item);
      if (found) return found;
    }
    return null;
  }
  const o = obj as Record<string, unknown>;
  if (typeof o.name === 'string' && o.name.trim()) return o.name.trim();
  for (const key of ['subscriber', 'data', 'fields', 'events']) {
    const found = hittaNamn(o[key]);
    if (found) return found;
  }
  return null;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('token') !== WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  /* Källan skiljer listorna åt: Gratisguide = fotografer, Gravidguide = kunder. */
  const kalla = url.searchParams.get('typ') === 'kund' ? 'Gravidguide' : 'Gratisguide';

  /* Vilken specifik guide laddades ner. Faller tillbaka på källan om param saknas. */
  const guideSlug = url.searchParams.get('guide') || '';
  const guideLabel =
    GUIDE_LABELS[guideSlug] ||
    (kalla === 'Gravidguide' ? 'Gravidguide' : 'Att fotografera väntan');

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const email = hittaEmail(body);
  const namn = hittaNamn(body);

  /* Anrop utan email (testpingar och felaktiga payloads) sparas inte. */
  if (!email) {
    return NextResponse.json({ ok: true, skipped: 'no email in payload' });
  }

  const supabase = createServiceClient();
  const epost = email.toLowerCase();

  /* Läs befintlig rad så vi kan slå ihop guider och behålla namn. */
  const { data: existing } = await supabase
    .from('guide_leads')
    .select('namn, raw')
    .eq('email', epost)
    .maybeSingle();

  const prevRaw = (existing?.raw && typeof existing.raw === 'object' && !Array.isArray(existing.raw)
    ? (existing.raw as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const prevGuider = Array.isArray(prevRaw._guider) ? (prevRaw._guider as string[]) : [];
  const guider = Array.from(new Set([...prevGuider, guideLabel]));

  const nyRaw = Array.isArray(body)
    ? { events: body, _guider: guider }
    : { ...((body as Record<string, unknown>) || {}), _guider: guider };

  const { error } = await supabase
    .from('guide_leads')
    .upsert(
      { email: epost, namn: namn || existing?.namn || null, kalla, raw: nyRaw },
      { onConflict: 'email' },
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, guider });
}
