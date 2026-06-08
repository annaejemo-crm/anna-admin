'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { skickaMail } from '@/lib/mail';

const TACKMAIL_AMNE = 'Fakturan mottagen';
const TACKMAIL_BRODTEXT = `Hej,

Bara med detta mail bekräfta att jag tagit emot betalningen och att jag ser fram emot att ses när det är dags för fotograferingen.

Om det dyker upp några funderingar är det bara att höra av sig.

Varma hälsningar
Anna`;

/**
 * Togglar betald-status på avgift eller bildpaket.
 * För avgift: cyklar nothing → fakturerad (gul) → betald (grön) → reset.
 * Vid övergång till betald skickas ett tackmail automatiskt till kunden.
 * För paket: traditionell true/false-toggle.
 */
export async function togglePaid(formData: FormData) {
  const id = String(formData.get('id') || '');
  const kind = String(formData.get('kind') || '');
  if (!id || (kind !== 'avgift' && kind !== 'paket')) return;
  const supabase = await createClient();

  if (kind === 'paket') {
    const { data } = await supabase
      .from('bokningar')
      .select('bildpaket_betald')
      .eq('id', id)
      .maybeSingle();
    const current = data ? !!data.bildpaket_betald : false;
    await supabase.from('bokningar').update({ bildpaket_betald: !current }).eq('id', id);
  } else {
    // avgift: 3-läges cykel
    const { data } = await supabase
      .from('bokningar')
      .select('bokningsavgift_fakturerad, bokningsavgift_betald, kund_id')
      .eq('id', id)
      .maybeSingle();

    if (!data) return;

    const fakturerad = !!data.bokningsavgift_fakturerad;
    const betald = !!data.bokningsavgift_betald;

    if (!fakturerad && !betald) {
      // Inget gjort → fakturerad
      await supabase.from('bokningar').update({
        bokningsavgift_fakturerad: true,
        bokningsavgift_fakturerad_at: new Date().toISOString(),
      }).eq('id', id);
    } else if (fakturerad && !betald) {
      // Fakturerad → betald + skicka tackmail
      await supabase.from('bokningar').update({
        bokningsavgift_betald: true,
      }).eq('id', id);

      // Hämta kundens email
      const kundIdLokal = data.kund_id;
      if (kundIdLokal) {
        const { data: kund } = await supabase
          .from('kunder')
          .select('email')
          .eq('id', kundIdLokal)
          .maybeSingle();
        if (kund && kund.email) {
          console.log('[automail] försöker skicka till', kund.email);
          const mailRes = await skickaMail({
            till: kund.email,
            amne: TACKMAIL_AMNE,
            brodtext: TACKMAIL_BRODTEXT,
          });
          console.log('[automail] resultat', JSON.stringify(mailRes));
        } else {
          console.log('[automail] hoppar - ingen kund-email', { kundIdLokal, hasKund: !!kund });
        }
      }
    } else {
      // Betald (eller bara fakturerad utan flagga) → reset
      await supabase.from('bokningar').update({
        bokningsavgift_fakturerad: false,
        bokningsavgift_fakturerad_at: null,
        bokningsavgift_betald: false,
      }).eq('id', id);
    }
  }

  revalidatePath('/admin/kunder');
  const kundId = String(formData.get('kundId') || '');
  if (kundId) revalidatePath('/admin/kunder/' + kundId);
}

export async function setBildpaket(formData: FormData) {
  const id = String(formData.get('id') || '');
  const paketId = String(formData.get('paketId') || '');
  if (!id) return;
  const supabase = await createClient();
  if (paketId === 'clear' || !paketId) {
    await supabase.from('bokningar').update({
      bildpaket_namn: null,
      bildpaket_kr: null,
      bildpaket_betald: false,
    }).eq('id', id);
  } else {
    const { data: paket } = await supabase
      .from('bildpaket')
      .select('namn,pris_kr')
      .eq('id', paketId)
      .maybeSingle();
    if (paket) {
      await supabase.from('bokningar').update({
        bildpaket_namn: paket.namn,
        bildpaket_kr: paket.pris_kr,
      }).eq('id', id);
    }
  }
  revalidatePath('/admin/kunder');
  const kundId = String(formData.get('kundId') || '');
  if (kundId) revalidatePath('/admin/kunder/' + kundId);
}
