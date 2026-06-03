import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { SigneraForm } from './SigneraForm';

export default async function PublikAvtalPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const supabase = createServiceClient();

  const { data: avtal } = await supabase
    .from('avtal')
    .select('*, foretag:foretag_installningar!inner(foretagsnamn, orgnr)')
    .eq('slug', params.slug)
    .single();

  if (!avtal) {
    const { data: avtal2 } = await supabase
      .from('avtal')
      .select('*')
      .eq('slug', params.slug)
      .single();
    if (!avtal2) notFound();
    return <Render avtal={avtal2} foretag={null} />;
  }

  return <Render avtal={avtal} foretag={avtal.foretag} />;
}

function Render(props: { avtal: any; foretag: any }) {
  const avtal = props.avtal;
  const foretag = props.foretag;
  const klausuler: any[] = Array.isArray(avtal.klausuler) ? avtal.klausuler : [];
  const detaljer: any = avtal.detaljer || {};
  const signat = avtal.status === 'signat';
  const avbruten = avtal.status === 'avbruten';

  const foretagsnamn = (foretag && foretag.foretagsnamn) || 'Fotograf Anna Ejemo AB';
  const orgnr = foretag && foretag.orgnr;

  return (
    <div className="max-w-2xl mx-auto bg-white border border-line-soft rounded-sm p-10 sm:p-14">
      <div className="text-center mb-10 pb-8 border-b border-line">
        <img src="/logo.svg" alt={foretagsnamn} className="w-24 h-24 mx-auto mb-5" />
        <div className="eyebrow mb-2">Fotograferingsavtal</div>
        <h1 className="font-serif text-[32px] font-light leading-tight">{foretagsnamn}</h1>
        {orgnr && <div className="font-mono text-[12px] text-ink-muted mt-1">Org.nr {orgnr}</div>}
      </div>

      {avbruten && (
        <div className="bg-danger/10 border border-danger/30 rounded-sm p-5 mb-8 text-sm text-danger">
          Detta avtal är avbrutet och kan inte längre signeras.
        </div>
      )}

      {avtal.personligt_meddelande && (
        <div className="mb-8 italic text-ink-muted whitespace-pre-line">
          {avtal.personligt_meddelande}
        </div>
      )}

      <div className="mb-8">
        <div className="eyebrow mb-4">Detaljer</div>
        <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Kund</dt>
            <dd>{detaljer.kund_namn || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Email</dt>
            <dd className="font-mono text-[12.5px] break-all">{detaljer.kund_email || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Datum & tid</dt>
            <dd className="font-mono text-[12.5px]">{detaljer.datum || '—'} {detaljer.tid || ''}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Plats</dt>
            <dd>{detaljer.plats || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Bokningsavgift</dt>
            <dd>{detaljer.bokningsavgift_kr ? `${detaljer.bokningsavgift_kr.toLocaleString('sv-SE')} kr` : '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Bildpaket</dt>
            <dd>{detaljer.bildpaket_text || '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="mb-10">
        <div className="eyebrow mb-4">Villkor</div>
        <div className="space-y-6">
          {klausuler.map(function(kl: any, i: number) {
            return (
              <div key={i}>
                <div className="font-medium mb-1.5">{i + 1}. {kl.titel}</div>
                <div className="text-sm text-ink-muted whitespace-pre-line leading-relaxed">{kl.brodtext}</div>
              </div>
            );
          })}
        </div>
      </div>

      {signat ? (
        <div className="bg-positive/10 border border-positive/30 rounded-sm p-6 text-center">
          <div className="eyebrow mb-2 text-positive">Avtalet är signerat</div>
          <p className="text-sm text-ink-muted">
            Tack! Avtalet är digitalt signerat och en kopia är arkiverad hos Anna Ejemo.
            {avtal.signerat_at && <span className="block mt-2 font-mono text-[12px] text-ink-faint">Signerat {avtal.signerat_at.substring(0, 16).replace('T', ' ')}</span>}
          </p>
        </div>
      ) : avbruten ? null : (
        <SigneraForm avtalId={avtal.id} bokningId={avtal.bokning_id} forhandnamn={detaljer.kund_namn || ''} />
      )}
    </div>
  );
}
