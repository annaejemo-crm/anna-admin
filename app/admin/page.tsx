import { createClient } from '@/lib/supabase/server';
import { StatusPill } from '@/components/StatusPill';
import type { DashboardSummary, BokningExpanderad } from '@/lib/types';
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
    .select('*, kund:kunder(*), fotograferingstyp:fotograferingstyper(*)')
    .gte('datum', now.toISOString().slice(0, 10))
    .lte('datum', weekFromNow.toISOString().slice(0, 10))
    .order('datum', { ascending: true })
    .limit(10);

  const upcoming = (upcomingRaw || []) as unknown as BokningExpanderad[];

  /* Väntar på galleri: bokningar i förgången tid där kundgalleri ej är skickat */
  const idag = now.toISOString().slice(0, 10);
  const { data: vantarGalleriRaw } = await supabase
    .from('bokningar')
    .select('id, datum, plats, kund_id, kund:kunder(fornamn, efternamn, foretagsnamn), fotograferingstyp:fotograferingstyper(namn)')
    .lt('datum', idag)
    .eq('kundgalleri_skickat', false)
    .order('datum', { ascending: false })
    .limit(15);

  const vantarGalleri = (vantarGalleriRaw || []) as any[];

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

      {vantarGalleri.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-serif mb-1">Väntar på galleri</h2>
          <p className="text-ink-muted text-[13px] mb-5">
            Fotograferingar där du inte markerat att galleriet är skickat. Klicka på pricken hos kunden när du är klar så försvinner bokningen härifrån.
          </p>
          <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Datum</Th><Th>Kund</Th><Th>Typ</Th><Th>Plats</Th><Th right>Dagar sedan</Th>
                </tr>
              </thead>
              <tbody>
                {vantarGalleri.map(function(b: any) {
                  const dgr = dagarSedan(b.datum);
                  const namn = b.kund?.foretagsnamn || `${b.kund?.fornamn || ''} ${b.kund?.efternamn || ''}`.trim();
                  return (
                    <tr key={b.id} className="border-b border-line-soft last:border-0 hover:bg-bg">
                      <Td className="font-mono text-[12px] text-ink-muted whitespace-nowrap">{formatDate(b.datum)}</Td>
                      <Td className="font-serif text-[17px]">
                        <Link href={`/admin/kunder/${b.kund_id}`}>{namn}</Link>
                      </Td>
                      <Td>{b.fotograferingstyp?.namn || '–'}</Td>
                      <Td>{b.plats || '–'}</Td>
                      <Td right className={`font-mono text-[12.5px] ${dgr > 14 ? 'text-accent' : 'text-ink-muted'}`}>{dgr} dgr</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
                  <Th>Datum</Th><Th>Kund</Th><Th>Typ</Th><Th>Plats</Th><Th>Status</Th><Th right>Pris</Th>
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
                    <Td><StatusPill status={b.status} /></Td>
                    <Td right className="font-mono text-[12.5px]">{b.bokningsavgift_kr || b.bildpaket_kr ? `${((b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0)).toLocaleString('sv-SE')} kr` : '–'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
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
