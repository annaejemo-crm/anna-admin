import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { skickaAvtal, raderaAvtal } from '../actions';
import { LankCopy } from './LankCopy';

const STATUS_FARG: Record<string, string> = {
  utkast: 'bg-line-soft text-ink-muted',
  skickat: 'bg-warn/20 text-warn',
  signat: 'bg-positive/20 text-positive',
  avbruten: 'bg-danger/20 text-danger',
};

const STATUS_LABEL: Record<string, string> = {
  utkast: 'Utkast',
  skickat: 'Skickat',
  signat: 'Signat',
  avbruten: 'Avbruten',
};

export default async function AvtalDetaljPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();

  const { data: avtal } = await supabase
    .from('avtal')
    .select('*, bokning:bokningar(id, datum, kund_id, kund:kunder(id, fornamn, efternamn, foretagsnamn, email))')
    .eq('id', params.id)
    .single();

  if (!avtal) notFound();

  const { data: signaturer } = await supabase
    .from('avtal_signaturer')
    .select('*')
    .eq('avtal_id', avtal.id)
    .order('signerad_at', { ascending: false });

  const b: any = avtal.bokning;
  const k: any = b ? b.kund : null;
  const kundNamn = k ? (k.foretagsnamn || `${k.fornamn} ${k.efternamn || ''}`.trim()) : '—';
  const klausuler: any[] = Array.isArray(avtal.klausuler) ? avtal.klausuler : [];
  const detaljer: any = avtal.detaljer || {};

  const farg = STATUS_FARG[avtal.status] || STATUS_FARG.utkast;
  const label = STATUS_LABEL[avtal.status] || avtal.status;

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">
          {k && <Link href={`/admin/kunder/${k.id}`} className="hover:underline">{kundNamn}</Link>}
          {' / Avtal'}
        </div>
        <div className="flex justify-between items-end">
          <h1 className="font-serif text-[42px] font-light leading-tight">Avtal</h1>
          <span className={`inline-block px-3 py-1.5 text-[12px] uppercase tracking-wider rounded-sm ${farg}`}>{label}</span>
        </div>
      </div>

      <div className="space-y-6 max-w-3xl">
        {avtal.status === 'utkast' && (
          <div className="bg-white border border-line-soft rounded-sm p-7">
            <div className="eyebrow mb-3">Klart att skicka</div>
            <p className="text-sm text-ink-muted mb-5">
              Klicka på Skicka för att markera avtalet som skickat och få en länk att skicka till kunden via mail.
            </p>
            <form action={skickaAvtal} className="flex justify-end">
              <input type="hidden" name="id" value={avtal.id} />
              <input type="hidden" name="bokning_id" value={avtal.bokning_id} />
              <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">
                Skicka avtal
              </button>
            </form>
          </div>
        )}

        {avtal.status === 'skickat' && (
          <div className="bg-white border border-line-soft rounded-sm p-7">
            <div className="eyebrow mb-3">Länk till kunden</div>
            <p className="text-sm text-ink-muted mb-4">
              Skicka denna länk till {detaljer.kund_email || 'kunden'} via mail. Kunden öppnar länken, läser igenom och signerar med sitt namn.
            </p>
            <LankCopy slug={avtal.slug} />
            {avtal.skickat_at && (
              <p className="text-[12px] text-ink-faint mt-3 font-mono">Skickat {avtal.skickat_at.substring(0, 16).replace('T', ' ')}</p>
            )}
          </div>
        )}

        {avtal.status === 'signat' && (
          <div className="bg-white border border-positive/30 bg-positive/5 rounded-sm p-7">
            <div className="eyebrow mb-3 text-positive">Signat</div>
            {signaturer && signaturer.length > 0 ? (
              <div className="space-y-3">
                {signaturer.map(function(s: any) {
                  return (
                    <div key={s.id} className="text-sm">
                      <div className="font-medium">{s.typed_name}</div>
                      <div className="text-[12px] text-ink-muted font-mono">
                        {s.signerad_at ? s.signerad_at.substring(0, 16).replace('T', ' ') : ''} · {s.metod || 'typed_name'} · IP {s.ip_adress || '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Signaturinfo saknas.</p>
            )}
            {avtal.kontrakts_hash && (
              <p className="text-[11px] text-ink-faint mt-4 font-mono break-all">Kontrakts-hash: {avtal.kontrakts_hash}</p>
            )}
          </div>
        )}

        <div className="bg-white border border-line-soft rounded-sm p-7">
          <div className="eyebrow mb-4">Detaljer</div>
          <dl className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Kund</dt>
              <dd>{detaljer.kund_namn || kundNamn}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Email</dt>
              <dd className="font-mono text-[12.5px]">{detaljer.kund_email || '—'}</dd>
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

        <div className="bg-white border border-line-soft rounded-sm p-7">
          <div className="eyebrow mb-4">Klausuler ({klausuler.length} st)</div>
          <div className="space-y-5">
            {klausuler.map(function(kl: any, i: number) {
              return (
                <div key={i} className="border-l-2 border-line-soft pl-5">
                  <div className="font-medium mb-1">{kl.titel}</div>
                  <div className="text-sm text-ink-muted whitespace-pre-line">{kl.brodtext}</div>
                </div>
              );
            })}
          </div>
        </div>

        {avtal.status === 'utkast' && (
          <div className="pt-4 border-t border-line">
            <form action={raderaAvtal} className="flex justify-end">
              <input type="hidden" name="id" value={avtal.id} />
              <button type="submit" className="px-4 py-2 border border-danger text-danger text-sm rounded-sm hover:bg-danger hover:text-bg transition-colors">
                Radera utkast
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
