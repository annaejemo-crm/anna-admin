import { createClient } from '@/lib/supabase/server';
import { NyBokningForm } from './NyBokningForm';

export default async function NyKundPage() {
  const supabase = await createClient();

  const { data: kunderRaw } = await supabase
    .from('kunder')
    .select('id, fornamn, efternamn, foretagsnamn, email')
    .order('fornamn', { ascending: true });

  const { data: typerRaw } = await supabase
    .from('fotograferingstyper')
    .select('id, namn')
    .order('namn', { ascending: true });

  const kunder = (kunderRaw || []).map((k: any) => ({
    id: k.id,
    label: k.foretagsnamn
      ? k.foretagsnamn
      : `${k.fornamn || ''} ${k.efternamn || ''}`.trim(),
    email: k.email || '',
  }));

  const typer = (typerRaw || []).map((t: any) => ({ id: t.id, namn: t.namn }));

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">Ny kund och bokning</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Skapa ny bokning</h1>
      </div>
      <NyBokningForm kunder={kunder} typer={typer} />
    </>
  );
}
