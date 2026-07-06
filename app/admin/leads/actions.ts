'use server';

import { createClient } from '@/lib/supabase/server';
import { skickaMail } from '@/lib/mail';
import { revalidatePath } from 'next/cache';

const FOOTER =
  '\n\nDu får det här mejlet för att du laddade ner min guide Att fotografera väntan. ' +
  'Vill du inte ha fler mejl från mig? Svara avregistrera så tar jag bort dig.';

export type UtskickResultat = {
  ok: boolean;
  skickade?: number;
  fel?: string;
} | null;

/* Skickar ett mejl till valda guideleads. {namn} i ämne och meddelande
   byts mot personens förnamn (eller inget om namn saknas). */
export async function skickaLeadsMejl(
  _prev: UtskickResultat,
  formData: FormData,
): Promise<UtskickResultat> {
  const amne = String(formData.get('amne') || '').trim();
  const meddelande = String(formData.get('meddelande') || '').trim();
  const ids = formData.getAll('lead').map(String).filter(Boolean);

  if (!amne || !meddelande) {
    return { ok: false, fel: 'Skriv både ämne och meddelande.' };
  }
  if (ids.length === 0) {
    return { ok: false, fel: 'Välj minst en mottagare.' };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('guide_leads')
    .select('id, namn, email')
    .in('id', ids)
    .eq('avregistrerad', false)
    .not('email', 'is', null);

  const leads = (data || []) as { id: string; namn: string | null; email: string }[];
  if (leads.length === 0) {
    return { ok: false, fel: 'Inga giltiga mottagare bland de valda.' };
  }

  let skickade = 0;
  const misslyckade: string[] = [];

  for (const lead of leads) {
    const fornamn = (lead.namn || '').trim().split(/\s+/)[0] || '';
    const personligtAmne = amne.replaceAll('{namn}', fornamn).trim();
    const personligText = meddelande.replaceAll('{namn}', fornamn).trim() + FOOTER;

    const res = await skickaMail({
      till: lead.email,
      amne: personligtAmne,
      brodtext: personligText,
    });

    if (res.ok) {
      skickade++;
      await supabase
        .from('guide_leads')
        .update({ senast_mejlad_at: new Date().toISOString() })
        .eq('id', lead.id);
    } else {
      misslyckade.push(lead.email);
    }
  }

  revalidatePath('/admin/leads');

  if (misslyckade.length > 0) {
    return {
      ok: skickade > 0,
      skickade,
      fel: 'Gick inte att skicka till: ' + misslyckade.join(', '),
    };
  }
  return { ok: true, skickade };
}

/* Växlar avregistrerad på en lead. Avregistrerade får inga utskick. */
export async function toggleAvregistrerad(id: string) {
  if (!id) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from('guide_leads')
    .select('avregistrerad')
    .eq('id', id)
    .maybeSingle();
  if (!data) return;
  await supabase
    .from('guide_leads')
    .update({ avregistrerad: !data.avregistrerad })
    .eq('id', id);
  revalidatePath('/admin/leads');
}
