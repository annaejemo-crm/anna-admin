import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { avgorForfragan } from '../bokningar/actions';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

function formatDatum(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`.toUpperCase();
}

function dagarSedan(iso: string | null, nu: Date): number {
  if (!iso) return 0;
  return Math.floor((nu.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function kundNamn(k: any): string {
  return k?.foretagsnamn || `${k?.fornamn || ''} ${k?.efternamn || ''}`.trim() || '–';
}

/**
 * Forfragningar ar bokningar med status forfragan. De saknar oftast datum,
 * darfor syns de inte i Kunder och bokningar (som listar per ar) utan har.
 * Avgjorda forfragningar visas 60 dagar bakat sa Anna ser vad som hant.
 */
export default async function ForfragningarPage() {
  const supabase = await createClient();
  const nu = new Date();
  const sextioDagarSedan = new Date(nu.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const { data: oppnaRaw } = await supabase
    .from('bokningar')
    .select('id, created_at, datum, tid, plats, kalla, intern_anteckning, kund_id, kund:kunder(fornamn, efternamn, foretagsnamn, email, telefon, ar_foretagskund), fotograferingstyp:fotograferingstyper(namn)')
    .eq('status', 'forfragan')
    .order('created_at', { ascending: false });

  const { data: avgjordaRaw } = await supabase
    .from('bokningar')
    .select('id, created_at, updated_at, datum, status, kalla, kund_id, kund:kunder(fornamn, efternamn, foretagsnamn), fotograferingstyp:fotograferingstyper(namn)')
    .in('status', ['tackade_nej'])
    .gte('updated_at', sextioDagarSedan)
    .order('updated_at', { ascending: false })
    .limit(30);

  const oppna = (oppnaRaw || []) as any[];
  const avgjorda = (avgjordaRaw || []) as any[];

  return (
    <>
      <div className="flex justify-between items-end mb-6 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">{oppna.length} öppna</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Förfrågningar</h1>
        </div>
        <Link href="/admin/bokningar/ny?status=forfragan" className="btn">+ Ny förfrågan</Link>
      </div>

      <p className="text-sm text-ink-muted mb-8 max-w-[640px]">
        Kunder som hört av sig men inte bokat än. Klistra in mejlet under Ny förfrågan så fylls uppgifterna i. När kunden bokar klickar du Boka in och sätter datum, annars Tackade nej. Inget raderas, så statistiken kan räkna hur många förfrågningar som blir bokningar.
      </p>

      <section className="mb-12">
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          {oppna.length === 0 ? (
            <div className="p-10 text-center text-ink-faint text-sm">Inga öppna förfrågningar.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Inkom</Th><Th>Kund</Th><Th>Typ</Th><Th>Källa</Th><Th>Önskat datum</Th><Th>Anteckning</Th><Th right>Dagar</Th><Th />
                </tr>
              </thead>
              <tbody>
                {oppna.map(function(b: any) {
                  const dagar = dagarSedan(b.created_at, nu);
                  return (
                    <tr key={b.id} className="border-b border-line-soft last:border-0 hover:bg-bg align-top">
                      <Td className="font-mono text-[12px] text-ink-muted whitespace-nowrap">{formatDatum(b.created_at)}</Td>
                      <Td className="font-serif text-[17px]">
                        <Link href={`/admin/kunder/${b.kund_id}`}>{kundNamn(b.kund)}</Link>
                        <div className="text-[12px] text-ink-muted font-sans mt-0.5">
                          {[b.kund?.email, b.kund?.telefon].filter(Boolean).join(' · ')}
                        </div>
                      </Td>
                      <Td>{b.fotograferingstyp?.namn || '–'}</Td>
                      <Td>{b.kalla || '–'}</Td>
                      <Td className="whitespace-nowrap">{b.datum ? formatDatum(b.datum) + (b.tid ? ' ' + String(b.tid).slice(0, 5) : '') : '–'}</Td>
                      <Td className="text-[12.5px] text-ink-muted max-w-[260px]">
                        <div className="line-clamp-3 whitespace-pre-line">{b.intern_anteckning || ''}</div>
                      </Td>
                      <Td right className={`font-mono text-[12.5px] ${dagar >= 7 ? 'text-accent' : 'text-ink-muted'}`}>{dagar}</Td>
                      <Td>
                        <div className="flex gap-2 justify-end whitespace-nowrap">
                          <form action={avgorForfragan}>
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="beslut" value="bokad" />
                            <button type="submit" className="text-[11px] px-2.5 py-1 bg-ink text-bg rounded-sm hover:bg-ink/90">Boka in</button>
                          </form>
                          <form action={avgorForfragan}>
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="beslut" value="tackade_nej" />
                            <button type="submit" className="text-[11px] px-2.5 py-1 border border-line-soft rounded-sm hover:border-ink hover:bg-bg">Tackade nej</button>
                          </form>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {avgjorda.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-serif mb-1">Tackade nej</h2>
          <p className="text-ink-muted text-[13px] mb-5">De senaste 60 dagarna. Ångra om det blev fel, då öppnas förfrågan igen.</p>
          <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Inkom</Th><Th>Kund</Th><Th>Typ</Th><Th>Källa</Th><Th>Avgjord</Th><Th />
                </tr>
              </thead>
              <tbody>
                {avgjorda.map(function(b: any) {
                  return (
                    <tr key={b.id} className="border-b border-line-soft last:border-0 hover:bg-bg">
                      <Td className="font-mono text-[12px] text-ink-muted whitespace-nowrap">{formatDatum(b.created_at)}</Td>
                      <Td className="font-serif text-[17px]"><Link href={`/admin/kunder/${b.kund_id}`}>{kundNamn(b.kund)}</Link></Td>
                      <Td>{b.fotograferingstyp?.namn || '–'}</Td>
                      <Td>{b.kalla || '–'}</Td>
                      <Td className="font-mono text-[12px] text-ink-muted whitespace-nowrap">{formatDatum(b.updated_at)}</Td>
                      <Td>
                        <form action={avgorForfragan} className="flex justify-end">
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="beslut" value="forfragan" />
                          <button type="submit" className="text-[11px] px-2.5 py-1 border border-line-soft rounded-sm hover:border-ink hover:bg-bg">Ångra</button>
                        </form>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 border-b border-line bg-bg font-medium ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function Td({ children, right, className = '' }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return (
    <td className={`py-4 px-5 text-[13.5px] align-middle ${right ? 'text-right' : ''} ${className}`}>
      {children}
    </td>
  );
}
