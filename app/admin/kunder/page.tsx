import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { StatusPill } from '@/components/StatusPill';

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

function formatDate(dateStr) {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`.toUpperCase();
}

export default async function KunderPage({ searchParams }) {
  const params = await searchParams;
  const year = parseInt(params?.year || '2026');
  const supabase = await createClient();

  const { data } = await supabase
    .from('bokningar')
    .select('*, kund:kunder(*), fotograferingstyp:fotograferingstyper(*)')
    .gte('datum', `${year}-01-01`)
    .lte('datum', `${year}-12-31`)
    .order('datum', { ascending: true });

  const bokningar = data || [];

  const grouped = {};
  bokningar.forEach((b) => {
    if (!b.datum) return;
    const m = MONTH_NAMES[new Date(b.datum).getMonth()];
    (grouped[m] ||= []).push(b);
  });

  const yearTotal = bokningar.reduce((s, b) => s + (b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0), 0);
  const yearPaid = bokningar.reduce((s, b) =>
    s + (b.bokningsavgift_betald ? (b.bokningsavgift_kr || 0) : 0) +
        (b.bildpaket_betald ? (b.bildpaket_kr || 0) : 0), 0);

  const years = [2026, 2025, 2024];

  return (
    <>
      <div className="flex justify-between items-end mb-6 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">{bokningar.length} bokningar för {year}</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Kunder & bokningar</h1>
        </div>
        <Link href="/admin/kunder/ny" className="btn">+ Ny bokning</Link>
      </div>

      <div className="flex gap-2 mb-6 items-center flex-wrap">
        <span className="eyebrow mr-2">År:</span>
        {years.map(y => (
          <Link
            key={y}
            href={`/admin/kunder?year=${y}`}
            className={`px-3 py-1.5 rounded-full text-[11.5px] border transition-colors ${
              y === year ? 'bg-ink text-bg border-ink font-medium' : 'bg-bg text-ink-muted border-line hover:border-ink-faint'
            }`}
          >
            {y}{y === 2026 ? ' · aktuellt' : ''}
          </Link>
        ))}
        <div className="ml-auto text-[12px] text-ink-muted font-mono">
          Året totalt: <strong className="text-ink font-medium">{yearTotal.toLocaleString('sv-SE')} kr</strong> · Inkommet: <strong style={{color: 'var(--positive, #5e7a5a)'}}>{yearPaid.toLocaleString('sv-SE')} kr</strong>
        </div>
      </div>

      <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Datum</Th><Th>Kund</Th><Th>Typ</Th><Th>Plats</Th><Th>Status</Th>
              <Th right>Avgift</Th><Th right>Bildpaket</Th><Th right>Totalt</Th>
            </tr>
          </thead>
          <tbody>
            {bokningar.length === 0 ? (
              <tr><td colSpan={8} className="p-16 text-center text-ink-faint">Inga bokningar för {year}.</td></tr>
            ) : (
              MONTH_NAMES.map((m) => {
                if (!grouped[m] || grouped[m].length === 0) return null;
                const sum = grouped[m].reduce((s, b) => s + (b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0), 0);
                return [
                  <tr key={`h-${m}`}>
                    <td colSpan={8} className="bg-bg-subtle py-3.5 px-5 border-y border-line">
                      <span className="font-mono text-[10.5px] tracking-[0.22em] uppercase font-medium">{m}</span>
                      <span className="font-mono text-[10px] text-ink-faint ml-3 tracking-[0.1em]">
                        {grouped[m].length} {grouped[m].length === 1 ? 'bokning' : 'bokningar'}
                      </span>
                      <span className="font-mono text-[11px] text-ink-muted float-right">
                        <strong className="text-ink font-medium">{sum.toLocaleString('sv-SE')} kr</strong>
                      </span>
                    </td>
                  </tr>,
                  ...grouped[m].map((b) => {
                    const tot = (b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0);
                    return (
                      <tr key={b.id} className="border-b border-line-soft hover:bg-bg">
                        <td className="font-mono text-[12px] text-ink-muted whitespace-nowrap py-4 px-5">
                          <Link href={`/admin/kunder/${b.kund_id}`}>{formatDate(b.datum)}</Link>
                        </td>
                        <td className="font-serif text-[17px] py-4 px-5">
                          <Link href={`/admin/kunder/${b.kund_id}`}>
                            {b.kund?.foretagsnamn || `${b.kund?.fornamn || ''} ${b.kund?.efternamn || ''}`.trim()}
                          </Link>
                        </td>
                        <td className="py-4 px-5 text-[13.5px]">{b.fotograferingstyp?.namn || '–'}</td>
                        <td className="py-4 px-5 text-[13.5px]">{b.plats || '–'}</td>
                        <td className="py-4 px-5"><StatusPill status={b.status} /></td>
                        <td className="py-4 px-5 text-right"><PriceCell amount={b.bokningsavgift_kr} paid={b.bokningsavgift_betald} /></td>
                        <td className="py-4 px-5 text-right"><PriceCell amount={b.bildpaket_kr} paid={b.bildpaket_betald} /></td>
                        <td className="font-mono text-[12.5px] text-right py-4 px-5">{tot > 0 ? `${tot.toLocaleString('sv-SE')} kr` : '–'}</td>
                      </tr>
                    );
                  }),
                ];
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PriceCell({ amount, paid }) {
  if (!amount) return <span className="text-ink-faint text-[12.5px]">–</span>;
  return (
    <span className={`font-mono text-[12.5px] inline-flex items-center gap-1.5 ${paid ? 'text-positive' : 'text-ink-muted'}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${paid ? 'bg-positive' : 'bg-line'}`}></span>
      {amount.toLocaleString('sv-SE')} kr
    </span>
  );
}

function Th({ children, right }) {
  return (
    <th className={`font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 border-b border-line bg-bg font-medium ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}
