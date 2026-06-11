import { createClient } from '@/lib/supabase/server';
import { NyBokningForm } from './NyBokningForm';

export default async function NyBokningPage(props: { searchParams?: Promise<{ kund?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};

  const { data: kunderRaw } = await supabase
    .from('kunder')
    .select('id, fornamn, efternamn, foretagsnamn, ar_foretagskund')
    .order('fornamn');
  const { data: typerRaw } = await supabase
    .from('fotograferingstyper')
    .select('id, namn')
    .order('ordning');

  const { data: platserRaw } = await supabase
    .from('platser')
    .select('id, namn, avstand_km_enkel')
    .eq('aktiv', true)
    .order('namn');

  const kunder = (kunderRaw || []).map(function(k: any) {
    return {
      id: k.id,
      label: k.foretagsnamn || `${k.fornamn} ${k.efternamn || ''}`.trim(),
      arForetagskund: !!k.ar_foretagskund,
    };
  });
  const typer = (typerRaw || []) as { id: string; namn: string }[];
  const platser = (platserRaw || []).map(function(p: any) {
    return { id: p.id, namn: p.namn, avstand_km_enkel: p.avstand_km_enkel };
  });

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">Lägg in en ny bokning</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Ny bokning</h1>
      </div>

      <NyBokningForm kunder={kunder} typer={typer} platser={platser} valdKundId={sp.kund || null} />
    </>
  );
}
