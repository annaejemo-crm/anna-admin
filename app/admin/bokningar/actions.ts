'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateBokning(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get('id') || '');
  const kund_id = String(formData.get('kund_id') || '');
  const datum = String(formData.get('datum') || '') || null;
  const tid = String(formData.get('tid') || '') || null;
  const plats = String(formData.get('plats') || '') || null;
  const adress = String(formData.get('adress') || '') || null;
  const fotograferingstyp_id = String(formData.get('fotograferingstyp_id') || '') || null;
  const status = String(formData.get('status') || 'bokad');

  const bokningsavgiftRaw = String(formData.get('bokningsavgift_kr') || '');
  const bildpaketKrRaw = String(formData.get('bildpaket_kr') || '');
  const bildpaketNamn = String(formData.get('bildpaket_namn') || '') || null;

  const bokningsavgift_kr = bokningsavgiftRaw ? parseInt(bokningsavgiftRaw, 10) : null;
  const bildpaket_kr = bildpaketKrRaw ? parseInt(bildpaketKrRaw, 10) : null;

  const bokningsavgift_betald = formData.get('bokningsavgift_betald') === 'on';
  const bildpaket_betald = formData.get('bildpaket_betald') === 'on';

  const intern_anteckning = String(formData.get('intern_anteckning') || '') || null;
  const visma_fakturanr = String(formData.get('visma_fakturanr') || '') || null;

  await supabase.from('bokningar').update({
    datum: datum,
    tid: tid,
    plats: plats,
    adress: adress,
    fotograferingstyp_id: fotograferingstyp_id,
    status: status,
    bokningsavgift_kr: bokningsavgift_kr,
    bildpaket_namn: bildpaketNamn,
    bildpaket_kr: bildpaket_kr,
    bokningsavgift_betald: bokningsavgift_betald,
    bildpaket_betald: bildpaket_betald,
    intern_anteckning: intern_anteckning,
    visma_fakturanr: visma_fakturanr,
  }).eq('id', id);

  revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin/kunder');
  revalidatePath('/admin/ekonomi');
  redirect(`/admin/kunder/${kund_id}`);
}

export async function toggleKundgalleri(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const kund_id = String(formData.get('kund_id') || '');

  const { data: bokning } = await supabase
    .from('bokningar')
    .select('kundgalleri_skickat')
    .eq('id', id)
    .single();

  if (!bokning) return;

  const nyttVarde = !bokning.kundgalleri_skickat;
  await supabase.from('bokningar').update({
    kundgalleri_skickat: nyttVarde,
    kundgalleri_skickat_at: nyttVarde ? new Date().toISOString() : null,
  }).eq('id', id);

  if (kund_id) revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin');
  revalidatePath('/admin/kunder');
}

/**
 * Cyklar status framåt: väntar på galleri → galleri skickat → klar → väntar på galleri.
 * Klar betyder bokning_klar = true. Anna kan klicka tillbaka från klar om hon vill rätta.
 */
export async function gaVidare(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const kund_id = String(formData.get('kund_id') || '');

  const { data: b } = await supabase
    .from('bokningar')
    .select('kundgalleri_skickat, bokning_klar')
    .eq('id', id)
    .single();

  if (!b) return;

  if (b.bokning_klar) {
    await supabase.from('bokningar').update({
      bokning_klar: false,
      kundgalleri_skickat: false,
      kundgalleri_skickat_at: null,
    }).eq('id', id);
  } else if (b.kundgalleri_skickat) {
    await supabase.from('bokningar').update({
      bokning_klar: true,
    }).eq('id', id);
  } else {
    await supabase.from('bokningar').update({
      kundgalleri_skickat: true,
      kundgalleri_skickat_at: new Date().toISOString(),
    }).eq('id', id);
  }

  if (kund_id) revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin');
  revalidatePath('/admin/kunder');
}

export async function deleteBokning(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const kund_id = String(formData.get('kund_id') || '');
  await supabase.from('bokningar').delete().eq('id', id);
  revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin/kunder');
  revalidatePath('/admin/ekonomi');
  redirect(`/admin/kunder/${kund_id}`);
}

export async function skapaBokning(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const kund_lage = String(formData.get('kund_lage') || 'ny');
  let kund_id: string | null = null;

  if (kund_lage === 'existerande') {
    kund_id = String(formData.get('kund_id') || '') || null;
  } else {
    const fornamn = String(formData.get('fornamn') || '');
    const efternamn = String(formData.get('efternamn') || '') || null;
    const foretagsnamn = String(formData.get('foretagsnamn') || '') || null;
    const email = String(formData.get('email') || '') || null;
    const telefon = String(formData.get('telefon') || '') || null;
    const hur_hittade = String(formData.get('hur_hittade') || '') || null;

    const { data: nyKund } = await supabase.from('kunder').insert({
      user_id: user.id,
      fornamn: fornamn,
      efternamn: efternamn,
      foretagsnamn: foretagsnamn,
      email: email,
      telefon: telefon,
      hur_hittade: hur_hittade,
    }).select('id').single();

    if (nyKund) kund_id = nyKund.id;
  }

  if (!kund_id) return;

  const datum = String(formData.get('datum') || '') || null;
  const tid = String(formData.get('tid') || '') || null;
  const plats = String(formData.get('plats') || '') || null;
  const adress = String(formData.get('adress') || '') || null;
  const fotograferingstyp_id = String(formData.get('fotograferingstyp_id') || '') || null;
  const status = String(formData.get('status') || 'bokad');

  const bokningsavgiftRaw = String(formData.get('bokningsavgift_kr') || '');
  const bokningsavgift_kr = bokningsavgiftRaw ? parseInt(bokningsavgiftRaw, 10) : null;
  const bokningsavgift_betald = formData.get('bokningsavgift_betald') === 'on';
  const intern_anteckning = String(formData.get('intern_anteckning') || '') || null;

  await supabase.from('bokningar').insert({
    user_id: user.id,
    kund_id: kund_id,
    datum: datum,
    tid: tid,
    plats: plats,
    adress: adress,
    fotograferingstyp_id: fotograferingstyp_id,
    status: status,
    bokningsavgift_kr: bokningsavgift_kr,
    bokningsavgift_betald: bokningsavgift_betald,
    bildpaket_betald: false,
    intern_anteckning: intern_anteckning,
  });

  revalidatePath('/admin/kunder');
  revalidatePath(`/admin/kunder/${kund_id}`);
  revalidatePath('/admin/ekonomi');
  redirect(`/admin/kunder/${kund_id}`);
}

export async function updateKund(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  const fornamn = String(formData.get('fornamn') || '');
  const efternamn = String(formData.get('efternamn') || '') || null;
  const foretagsnamn = String(formData.get('foretagsnamn') || '') || null;
  const email = String(formData.get('email') || '') || null;
  const telefon = String(formData.get('telefon') || '') || null;
  const hur_hittade = String(formData.get('hur_hittade') || '') || null;
  const korta_anteckningar = String(formData.get('korta_anteckningar') || '') || null;

  await supabase.from('kunder').update({
    fornamn: fornamn,
    efternamn: efternamn,
    foretagsnamn: foretagsnamn,
    email: email,
    telefon: telefon,
    hur_hittade: hur_hittade,
    korta_anteckningar: korta_anteckningar,
  }).eq('id', id);

  revalidatePath(`/admin/kunder/${id}`);
  revalidatePath('/admin/kunder');
  redirect(`/admin/kunder/${id}`);
}
