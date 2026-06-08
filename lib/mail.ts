// Trigger redeploy efter RESEND_API_KEY-add
'use server';

/**
 * Skickar mail via Resend.
 * AvsÃ¤ndare: Anna Ejemo <kontakt@annaejemo.se>
 * Reply-To: kontakt@fotografannaejemo.se (sÃ¥ svar landar i Annas vanliga inkorg)
 */
export async function skickaMail(opts: {
  till: string;
  amne: string;
  brodtext: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY saknas' };
  if (!opts.till) return { ok: false, error: 'Mottagare saknas' };

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Anna Ejemo <kontakt@annaejemo.se>',
        to: [opts.till],
        reply_to: 'kontakt@fotografannaejemo.se',
        subject: opts.amne,
        text: opts.brodtext,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: 'Resend ' + r.status + ': ' + t };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e) };
  }
}
