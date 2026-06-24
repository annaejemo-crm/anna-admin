import { createClient } from '@/lib/supabase/server';
import { StatusPill } from '@/components/StatusPill';
import type { DashboardSummary, BokningExpanderad } from '@/lib/types';
import { harledBokningStatus, harledAvtalStatus } from '@/lib/types';
import { AvtalPill } from '@/components/AvtalPill';
import { gaVidare, skickaPaketPaminnelse } from './bokningar/actions';
import { setBildpaket, togglePaid } from './kunder/actions';
import Link from 'next/link';

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`.toUpperCase();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 10) return 'God morgon, Anna.';
  if (h < 14) return 'God förmiddag, Anna.';
  if (h < 18) return 'God eftermiddag, Anna.';
  return 'God kväll, Anna.';
}

function todayLongFormat(): string {
  const days = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
  const d = new Date();
  return `${days[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  /* KPI:er via RPC */
  const { data: summary } = await supabase.rpc('dashboard_summary', { p_ar: year });
  const k = (summary || {}) as DashboardSummary;

  /* Närmaste veckan: bokningar inom +/- 7 dagar */
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: upcomingRaw } = await supabase
    .from('bokningar')
    .select('*, kund:kunder(*), fotograferingstyp:fotograferingstyper(*), avtal(status)')
    .gte('datum', now.toISOString().slice(0, 10))
    .lte('datum', weekFromNow.toISOString().slice(0, 10))
    .order('datum', { ascending: true })
    .limit(10);

  const upcoming = (upcomingRaw || []) as unknown as BokningExpanderad[];

  /* Status: alla pågående kunder (fotograferade men inte klara) */
  const idag = now.toISOString().slice(0, 10);
  const { data: pagaendeRaw } = await supabase
    .from('bokningar')
    .select('id, datum, plats, kund_id, status, bildpaket_namn, bildpaket_kr, bildpaket_betald, kundgalleri_skickat, kundgalleri_skickat_at, paketval_paminnelse_skickat_at, bokning_klar, kund:kunder(fornamn, efternamn, foretagsnamn), fotograferingstyp:fotograferingstyper(namn), avtal(status)')
    .lt('datum', idag)
    .eq('bokning_klar', false)
    .order('datum', { ascending: false })
    .limit(30);

  const pagaende = ((pagaendeRaw || []) as any[]).filter(function(b: any) {
    return harledBokningStatus(b) !== 'klar';
  });

  /* Bildpaket-lista för inline-val på pågående-tabellen */
  const { data: paketLista } = await supabase
    .from('bildpaket')
    .select('id, namn, pris_kr')
    .order('ordning');
  const paket = (paketLista || []) as any[];

  function dagarSedan(datum: string | null): number {
    if (!datum) return 0;
    const d = new Date(datum);
    const diffMs = now.getTime() - d.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  return (
    <>
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">{todayLongFormat()}</div>
          <h1 className="font-serif text-[42px] leading-[1.1] font-light tracking-tight">
            {greeting()}
          </h1>
        </div>
        <Link href="/admin/kunder/ny" className="btn">+ Ny bokning</Link>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-12">
        <Kpi label="Bokningar 2026" value={String(k.antal_bokningar || 0)} sub={`${k.antal_privat || 0} privat · ${k.antal_foretag || 0} företag`} />
        <Kpi label="Bokad omsättning" value={`${(k.bokad_omsattning_kr || 0).toLocaleString('sv-SE')} kr`} sub="totalt avtalat 2026" />
        <Kpi label="Inkommit hittills" value={`${(k.inkommit_kr || 0).toLocaleString('sv-SE')} kr`} sub="registrerade betalningar" />
        <Kpi label="Väntar på paketval" value={String(k.vantar_paketval || 0)} sub="kunder som sett bilder" />
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-serif mb-1">Den närmaste veckan</h2>
        <p className="text-ink-muted text-[13px] mb-5">
          Bokningar med datum mellan idag och om sju dagar.
        </p>
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          {upcoming.length === 0 ? (
            <div className="p-10 text-center text-ink-faint text-sm">
              Inga bokningar den närmaste veckan.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Datum</Th><Th>Kund</Th><Th>Typ</Th><Th>Plats</Th><Th>Avtal</Th><Th>Status</Th><Th right>Pris</Th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((b) => (
                  <tr key={b.id} className="border-b border-line-soft last:border-0 hover:bg-bg cursor-pointer">
                    <Td className="font-mono text-[12px] text-ink-muted whitespace-nowrap">{formatDate(b.datum)}</Td>
                    <Td className="font-serif text-[17px]">
                      <Link href={`/admin/kunder/${b.kund_id}`}>{b.kund?.foretagsnamn || `${b.kund?.fornamn || ''} ${b.kund?.efternamn || ''}`.trim()}</Link>
                    </Td>
                    <Td>{b.fotograferingstyp?.namn || '–'}</Td>
                    <Td>{b.plats || '–'}</Td>
                    <Td><AvtalPill status={harledAvtalStatus(b)} /></Td>
                    <Td><StatusPill status={harledBokningStatus(b)} /></Td>
                    <Td right className="font-mono text-[12.5px]">{b.bokningsavgift_kr || b.bildpaket_kr ? `${((b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0)).toLocaleString('sv-SE')} kr` : '–'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {pagaende.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-serif mb-1">Status</h2>
          <p className="text-ink-muted text-[13px] mb-5">
            Kunder som är pågående: fotade men väntar på galleri, paketval eller betalning. Klicka på status-pillet eller välj paket inline för att gå vidare.
          </p>
          <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Datum</Th><Th>Kund</Th><Th>Typ</Th><Th>Plats</Th><Th>Avtal</Th><Th>Status</Th><Th>Paket</Th><Th right>Dagar sen galleri</Th><Th right>Dagar sen foto</Th><Th />
                </tr>
              </thead>
              <tbody>
                {pagaende.map(function(b: any) {
                  const dgr = dagarSedan(b.datum);
                  const dgrGalleri = b.kundgalleri_skickat_at ? dagarSedan(b.kundgalleri_skickat_at.slice(0, 10)) : null;
                  const namn = b.kund?.foretagsnamn || `${b.kund?.fornamn || ''} ${b.kund?.efternamn || ''}`.trim();
                  const st = harledBokningStatus(b);
                  const visaPaminnelseKnapp = st === 'galleri_skickat' && !b.bildpaket_namn;
                  const paminnelseSkickad = b.paketval_paminnelse_skickat_at;
                  const klickbar = st === 'vantar_galleri' || st === 'galleri_skickat' || st === 'faktura_skickad';
                  const hjalp = st === 'vantar_galleri'
                    ? 'Klicka när du skickat galleriet'
                    : st === 'galleri_skickat'
                      ? 'Välj paket i nästa kolumn'
                      : st === 'faktura_skickad'
                        ? 'Klicka när kunden betalat'
                        : '';
                  return (
                    <tr key={b.id} className="border-b border-line-soft last:border-0 hover:bg-bg">
                      <Td className="font-mono text-[12px] text-ink-muted whitespace-nowrap">{formatDate(b.datum)}</Td>
                      <Td className="font-serif text-[17px]">
                        <Link href={`/admin/kunder/${b.kund_id}`}>{namn}</Link>
                      </Td>
                      <Td>{b.fotograferingstyp?.namn || '–'}</Td>
                      <Td>{b.plats || '–'}</Td>
                      <Td><AvtalPill status={harledAvtalStatus(b)} /></Td>
                      <Td>
                        {klickbar && st !== 'faktura_skickad' ? (
                          <form action={gaVidare} className="inline">
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="kund_id" value={b.kund_id} />
                            <button type="submit" title={hjalp} className="cursor-pointer hover:opacity-70 transition-opacity">
                              <StatusPill status={st} />
                            </button>
                          </form>
                        ) : klickbar && st === 'faktura_skickad' ? (
                          <form action={togglePaid} className="inline">
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="kind" value="paket" />
                            <input type="hidden" name="kundId" value={b.kund_id} />
                            <button type="submit" title={hjalp} className="cursor-pointer hover:opacity-70 transition-opacity">
                              <StatusPill status={st} />
                            </button>
                          </form>
                        ) : (
                          <StatusPill status={st} />
                        )}
                      </Td>
                      <Td>
                        {b.bildpaket_namn && b.bildpaket_kr ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px]">{b.bildpaket_namn}</span>
                            <span className="text-[11px] text-ink-muted font-mono">{Number(b.bildpaket_kr).toLocaleString('sv-SE')} kr</span>
                          </div>
                        ) : (
                          <form action={setBildpaket} className="flex gap-1.5 items-center">
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="kundId" value={b.kund_id} />
                            <select name="paketId" defaultValue="" className="px-2 py-1 text-[12px] bg-white border border-line-soft rounded-sm">
                              <option value="">Välj paket…</option>
                              {paket.map(function(p: any) {
                                return <option key={p.id} value={p.id}>{p.namn} ({Number(p.pris_kr).toLocaleString('sv-SE')} kr)</option>;
                              })}
                            </select>
                            <button type="submit" className="text-[11px] px-2 py-1 bg-ink text-bg rounded-sm">Sätt</button>
                          </form>
                        )}
                      </Td>
                      <Td right className={`font-mono text-[12.5px] ${dgrGalleri !== null && dgrGalleri > 7 ? 'text-accent' : 'text-ink-muted'}`}>
                        {dgrGalleri !== null ? `${dgrGalleri} dgr` : '–'}
                      </Td>
                      <Td right className={`font-mono text-[12.5px] ${dgr > 14 ? 'text-accent' : 'text-ink-muted'}`}>{dgr} dgr</Td>
                      <Td>
                        {visaPaminnelseKnapp ? (
                          paminnelseSkickad ? (
                            <span className="text-[11px] text-ink-faint">Påminnelse skickad</span>
                          ) : (
                            <form action={skickaPaketPaminnelse}>
                              <input type="hidden" name="id" value={b.id} />
                              <input type="hidden" name="kund_id" value={b.kund_id} />
                              <button type="submit" className="text-[11px] px-2.5 py-1 border border-line-soft rounded-sm hover:border-ink hover:bg-bg whitespace-nowrap">
                                Skicka påminnelse
                              </button>
                            </form>
                          )
                        ) : null}
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

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-line-soft rounded-sm px-7 py-6">
      <div className="eyebrow mb-3">{label}</div>
      <div className="font-serif text-[38px] leading-none tracking-tight">{value}</div>
      <div className="text-[12px] text-ink-muted mt-1.5">{sub}</div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
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
