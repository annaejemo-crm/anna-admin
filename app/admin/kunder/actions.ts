'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { skickaMail } from '@/lib/mail';
import { beloppForDatum } from '@/lib/traktamente';

const TACKMAIL_AMNE = 'Fakturan mottagen';
const TACKMAIL_BRODTEXT = `Hej,

Jag vill bara med detta mail bekräfta att jag tagit emot betalningen och att jag ser fram emot att ses när det är dags för fotograferingen.

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
          .select('bildpaket_betald, innefattar_traktamente, datum, plats, kund_id')
          .eq('id', id)
          .maybeSingle();
        const current = data ? !!data.bildpaket_betald : false;
        const nyttVarde = !current;
        // När bildpaket markeras betald: bokningen är klar.
      // När betald-markering tas bort: bokningen är inte längre klar.
      await supabase.from('bokningar').update({
              bildpaket_betald: nyttVarde,
              bokning_klar: nyttVarde,
              bokning_klar_at: nyttVarde ? new Date().toISOString() : null,
      }).eq('id', id);

      // Skapa traktamenterad automatiskt om bokningen innefattar traktamente
      // och en sådan inte redan finns.
      if (nyttVarde && data?.innefattar_traktamente) {
              const { data: existerande } = await supabase
                .from('traktamente_poster')
                .select('id')
                .eq('bokning_id', id)
                .maybeSingle();
              if (!existerande) {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user && data.datum) {
                                    await supabase.from('traktamente_poster').insert({
                                                  user_id: user.id,
                                                  bokning_id: id,
                                                  avresa: data.datum,
                                                  hemkomst: data.datum,
                                                  destination: data.plats || 'Att fylla i',
                                                  syfte: 'Fotografering',
                                                  antal_heldagar: 1,
                                                  antal_halvdagar: 0,
                                                  antal_natter: 0,
                                                  maltider_frukost: 0,
                                                  maltider_lunch: 0,
                                                  maltider_middag: 0,
                                                  belopp_heldag: beloppForDatum(data.datum).heldag,
                                                  belopp_halvdag: beloppForDatum(data.datum).halvdag,
                                                  belopp_natt: beloppForDatum(data.datum).natt,
                                                  avdrag_frukost: beloppForDatum(data.datum).avdrag_frukost,
                                                  avdrag_lunch: beloppForDatum(data.datum).avdrag_lunch,
                                                  avdrag_middag: beloppForDatum(data.datum).avdrag_middag,
                                                  brutto_kr: beloppForDatum(data.datum).heldag,
                                                  maltidsavdrag_kr: 0,
                                                  totalt_kr: beloppForDatum(data.datum).heldag,
                                                  anteckning: 'Automatiskt skapad från bokning. Justera datum, måltider och boende.',
                                    });
                                    revalidatePath('/admin/traktamente');
                        }
              }
      }
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

  revalidatePath('/admin');
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
    revalidatePath('/admin');
    revalidatePath('/admin/kunder');
    const kundId = String(formData.get('kundId') || '');
    if (kundId) revalidatePath('/admin/kunder/' + kundId);
}
