import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/* Tar emot webhooks från MailerLite-automationerna.
   Fotografer: "Simple welcome email" (gruppen Fotografer guide), utan typ-param.
   Kunder: "Gravidguide välkomstmejl" (gruppen Gravida guide), med ?typ=kund.
   Token skickas som query-param eftersom MailerLites webhook-steg inte stöder egna headers. */

const WEBHOOK_TOKEN = 'aedc0cc4c2b83205c7c1e327063a9ba9728366fbfda53292';

function hittaEmail(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.email === 'string' && o.email.includes('@')) return o.email;
  for (const key of ['subscriber', 'data', 'fields']) {
    const found = hittaEmail(o[key]);
    if (found) return found;
  }
  return null;
}

function hittaNamn(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.name === 'string' && o.name.trim()) return o.name.trim();
  for (const key of ['subscriber', 'data', 'fields']) {
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

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const email = hittaEmail(body);
  const namn = hittaNamn(body);

  const supabase = createServiceClient();

  if (email) {
    const { error } = await supabase
      .from('guide_leads')
      .upsert(
        { email: email.toLowerCase(), namn, kalla, raw: body },
        { onConflict: 'email' },
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    /* Ingen email hittad i payloaden. Spara raw ändå så inget tappas bort. */
    const { error } = await supabase.from('guide_leads').insert({ raw: body, kalla });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
