import { createClient } from '@/lib/supabase/server';
import { NyBokningForm } from './NyBokningForm';

export default async function NyBokningPage(props: { searchParams?: Promise<{ kund?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};

  const { data: kunderRaw } = await supabase
    .from('kunder')
    .select('id, fornamn, efternamn, foretagsnamn')
    .order('fornamn');
  const { data: typerRaw } = await supabase
    .from('fotograferingstyper')
    .select('id, namn')
    .order('ordning');

  const kunder = (kunderRaw || []).map(function(k: any) {
    return {
      id: k.id,
      label: k.foretagsnamn || `${k.fornamn} ${k.efternamn || ''}`.trim(),
    };
  });
  const typer = (typerRaw || []) as { id: string; namn: string }[];

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">Lägg in en ny bokning</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Ny bokning</h1>
      </div>

      <NyBokningForm kunder={kunder} typer={typer} valdKundId={sp.kund || null} />
    </>
  );
}
