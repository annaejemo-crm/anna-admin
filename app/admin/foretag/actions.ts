'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const LAGEN = ['prospekt', 'kontaktad', 'offert_skickad', 'kund', 'avslutad'];

function uppdateraSidor(kundId?: string | null) {
  revalidatePath('/admin');
  revalidatePath('/admin/foretag');
  revalidatePath('/admin/kunder');
  if (kundId) revalidatePath(`/admin/kunder/${kundId}`);
}

/**
 * Nytt foretagsprospekt: en kund med ar_foretagskund = true och ett lage,
 * utan bokning. Foretagsnamn ar det enda som kravs, kontaktperson och
 * kontaktuppgifter fylls pa nar Anna har dem. Kraver migration 0012.
 */
export async function skapaProspekt(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const foretagsnamn = String(formData.get('foretagsnamn') || '').trim();
  if (!foretagsnamn) redirect('/admin/foretag?fel=' + encodeURIComponent('fyll i företagsnamn.'));

  const fornamn = String(formData.get('fornamn') || '').trim();
  const efternamn = String(formData.get('efternamn') || '').trim() || null;
  const email = String(formData.get('email') || '').trim() || null;
  const telefon = String(formData.get('telefon') || '').trim() || null;
  const hur_hittade = String(formData.get('hur_hittade') || '').trim() || null;
  const nasta_steg = String(formData.get('nasta_steg') || '').trim() || null;
  const uppfoljning_datum = String(formData.get('uppfoljning_datum') || '') || null;
  const korta_anteckningar = String(formData.get('korta_anteckningar') || '').trim() || null;
  const lageRaw = String(formData.get('prospekt_lage') || 'prospekt');
  const prospekt_lage = LAGEN.indexOf(lageRaw) !== -1 ? lageRaw : 'prospekt';

  const { data: ny, error } = await supabase.from('kunder').insert({
    user_id: user.id,
    // fornamn ar not null i databasen, foretagsnamnet visas anda overallt
    fornamn: fornamn || foretagsnamn,
    efternamn: efternamn,
    foretagsnamn: foretagsnamn,
    ar_foretagskund: true,
    email: email,
    telefon: telefon,
    hur_hittade: hur_hittade,
    korta_anteckningar: korta_anteckningar,
    prospekt_lage: prospekt_lage,
    nasta_steg: nasta_steg,
    uppfoljning_datum: uppfoljning_datum,
  }).select('id').single();

  if (error || !ny) {
    redirect('/admin/foretag?fel=' + encodeURIComponent('kunde inte spara. Är migration 0012 körd i Supabase?'));
  }

  uppdateraSidor(ny.id);
  redirect('/admin/foretag');
}

/**
 * Uppdaterar lage, nasta steg och uppfoljningsdatum for ett foretag,
 * inline fran listan eller fran kundsidan.
 */
export async function uppdateraProspekt(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  if (!id) return;

  const lageRaw = String(formData.get('prospekt_lage') || '');
  const prospekt_lage = LAGEN.indexOf(lageRaw) !== -1 ? lageRaw : null;
  const nasta_steg = String(formData.get('nasta_steg') || '').trim() || null;
  const uppfoljning_datum = String(formData.get('uppfoljning_datum') || '') || null;

  await supabase.from('kunder').update({
    prospekt_lage: prospekt_lage,
    nasta_steg: nasta_steg,
    uppfoljning_datum: uppfoljning_datum,
  }).eq('id', id);

  uppdateraSidor(id);

  const tillbaka = String(formData.get('tillbaka') || '');
  if (tillbaka === 'kund') redirect(`/admin/kunder/${id}`);
}

/**
 * Snabbknapp: flyttar ett foretag ett steg framat i floden, eller markerar
 * uppfoljningen som gjord (tar bort datumet) utan att andra laget.
 */
export async function prospektKlar(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') || '');
  if (!id) return;
  await supabase.from('kunder').update({ uppfoljning_datum: null }).eq('id', id);
  uppdateraSidor(id);
}
