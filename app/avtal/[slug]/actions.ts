'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createHash } from 'crypto';
import { skickaMail } from '@/lib/mail';

const APP_URL = 'https://anna-admin-five.vercel.app';

export async function signera(formData: FormData) {
  const supabase = createServiceClient();
  const avtal_id = String(formData.get('avtal_id') || '');
  const bokning_id = String(formData.get('bokning_id') || '');
  const typed_name = String(formData.get('typed_name') || '').trim();

  if (!avtal_id || !typed_name) return;

  const h = await headers();
  const ip = h.get('x-forwarded-for') || h.get('x-real-ip') || null;
  const ua = h.get('user-agent') || null;

  const { data: avtal } = await supabase
    .from('avtal')
    .select('user_id, slug, klausuler, detaljer, status, bokning:bokningar(fotograferingstyp:fotograferingstyper(namn))')
    .eq('id', avtal_id)
    .single();

  if (!avtal || avtal.status === 'signat' || avtal.status === 'avbruten') return;

  const signerad_at = new Date().toISOString();

  await supabase.from('avtal_signaturer').insert({
    user_id: avtal.user_id,
    avtal_id: avtal_id,
    namn: typed_name,
    typed_name: typed_name,
    metod: 'esign',
    ip_adress: ip,
    user_agent: ua,
    signerad_at: signerad_at,
  });

  // Räkna alla signaturer för avtalet
  const { data: alla } = await supabase
    .from('avtal_signaturer')
    .select('id, metod')
    .eq('avtal_id', avtal_id);

  const signaturer = alla || [];
  const harFotograf = signaturer.some(function(s: any) { return s.metod === 'fotograf_godkand'; });
  const kundSignaturer = signaturer.filter(function(s: any) { return s.metod !== 'fotograf_godkand'; }).length;

  const b: any = (avtal as any).bokning;
  const typNamn = b && b.fotograferingstyp ? String(b.fotograferingstyp.namn || '').toLowerCase() : '';
  const arBrollop = typNamn.indexOf('br') === 0 || typNamn.indexOf('bröll') === 0;
  const kravdaKundSignaturer = arBrollop ? 2 : 1;

  const alltSignerat = harFotograf && kundSignaturer >= kravdaKundSignaturer;

  if (alltSignerat) {
    const hashInput = JSON.stringify({
      avtal_id: avtal_id,
      klausuler: avtal.klausuler,
      detaljer: avtal.detaljer,
      signaturer: signaturer.length,
      signerad_at: signerad_at,
    });
    const kontrakts_hash = createHash('sha256').update(hashInput).digest('hex');

    await supabase.from('avtal').update({
      status: 'signat',
      signerat_at: signerad_at,
      kontrakts_hash: kontrakts_hash,
    }).eq('id', avtal_id);

    if (bokning_id) {
      await supabase.from('bokningar').update({
        status: 'signat',
      }).eq('id', bokning_id);
    }

    // Skicka kopia till mottagaren och en notis till Anna.
    const det: any = avtal.detaljer || {};
    const slug = (avtal as any).slug;
    const lank = `${APP_URL}/avtal/${slug}`;
    const rubrik = det.typ_label || 'Avtal';
    const fnamn = String(det.kund_namn || '').trim().split(' ')[0] || 'hej';

    if (det.kund_email) {
      try {
        await skickaMail({
          till: det.kund_email,
          amne: `Din kopia: ${rubrik.toLowerCase()} signerat`,
          brodtext:
            `Hej ${fnamn}!\n\n` +
            `Tack, ditt ${rubrik.toLowerCase()} är nu signerat. Du kan läsa det när du vill här:\n\n` +
            `${lank}\n\n` +
            `Varma hälsningar,\nAnna`,
        });
      } catch (e) {
        // Mejlfel ska inte stoppa signeringen.
      }
    }

    try {
      await skickaMail({
        till: 'kontakt@annaejemo.se',
        amne: `Avtal signerat: ${typed_name}`,
        brodtext:
          `${typed_name} har signerat sitt ${rubrik.toLowerCase()}.\n\n` +
          `${lank}`,
      });
    } catch (e) {
      // Notisfel ska inte stoppa signeringen.
    }
  }

  revalidatePath(`/admin/avtal/${avtal_id}`);
  revalidatePath('/admin/avtal');
}
