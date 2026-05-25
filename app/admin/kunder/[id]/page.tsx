import { createClient } from '@/lib/supabase/server';
import { StatusPill } from '@/components/StatusPill';
import { notFound } from 'next/navigation';

export default async function KundDetaljPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: kund } = await supabase
    .from('kunder')
    .select('*')
    .eq('id', id)
    .single();

  if (!kund) notFound();

  const { data: bokningar } = await supabase
    .from('bokningar')
    .select('*, fotograferingstyp:fotograferingstyper(*)')
    .eq('kund_id', id)
    .order('datum', { ascending: false });

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">{kund.foretagsnamn ? 'Företagskund' : 'Privatkund'}</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">
          {kund.foretagsnamn || `${kund.fornamn} ${kund.efternamn || ''}`.trim()}
        </h1>
        <div className="mt-3 flex gap-6 text-sm text-ink-muted">
          {kund.email && <span>{kund.email}</span>}
          {kund.telefon && <span>{kund.telefon}</span>}
        </div>
      </div>

      <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted mb-8">
        <p className="font-serif text-xl mb-2 text-ink">Fullständig detaljvy byggs nästa session</p>
        <p className="text-sm">
          Här kommer flikar för översikt, tidslinje, mailhistorik, anteckningar,<br />
          avtal och ekonomi (som i prototypen).
        </p>
      </div>

      <h2 className="font-serif text-2xl mb-4">Bokningar</h2>
      <div className="bg-white border border-line-soft rounded-sm">
        {(bokningar || []).length === 0 ? (
          <div className="p-10 text-center text-ink-faint text-sm">Inga bokningar för denna kund.</div>
        ) : (
          (bokningar || []).map((b: any) => (
            <div key={b.id} className="flex items-center justify-between p-5 border-b border-line-soft last:border-0">
              <div className="font-mono text-[12px] text-ink-muted w-24">
                {b.datum || 'inget datum'}
              </div>
              <div className="font-serif text-lg flex-1 px-4">
                {b.fotograferingstyp?.namn || 'Fotografering'} · {b.plats || ''}
              </div>
              <StatusPill status={b.status} />
              <div className="font-mono text-[12.5px] ml-6 w-24 text-right">
                {((b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0)).toLocaleString('sv-SE')} kr
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
