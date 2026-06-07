import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { StatusPill } from '@/components/StatusPill';
import { harledBokningStatus } from '@/lib/types';
import { toggleKundgalleri } from '../bokningar/actions';

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`.toUpperCase();
}

export default async function KunderPage(props: { searchParams?: Promise<{ ar?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};
  const aktuelltAr = new Date().getFullYear();
  const valtAr = sp.ar ? parseInt(sp.ar, 10) : aktuelltAr;

  const start = `${valtAr}-01-01`;
  const slut = `${valtAr}-12-31`;

  const { data } = await supabase
    .from('bokningar')
    .select('*, kund:kunder(*), fotograferingstyp:fotograferingstyper(*)')
    .gte('datum', start)
    .lte('datum', slut)
    .order('datum', { ascending: true });

  const bokningar = (data || []) as any[];

  /* Gruppera per månad */
  const grouped: Record<string, any[]> = {};
  bokningar.forEach((b) => {
    if (!b.datum) {
      (grouped['utan_datum'] ||= []).push(b);
      return;
    }
    const m = MONTH_NAMES[new Date(b.datum).getMonth()];
    (grouped[m] ||= []).push(b);
  });

  let aretTotalt = 0;
  let aretInkommet = 0;
  for (const b of bokningar) {
    const avgift = b.bokningsavgift_kr || 0;
    const paket = b.bildpaket_kr || 0;
    aretTotalt += avgift + paket;
    if (b.bokningsavgift_betald) aretInkommet += avgift;
    if (b.bildpaket_betald) aretInkommet += paket;
  }

  return (
    <>
      <div className="flex justify-between items-end mb-6 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">{bokningar.length} bokningar för {valtAr}</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Kunder & bokningar</h1>
        </div>
        <Link href="/admin/kunder/ny" className="btn">+ Ny bokning</Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint">År:</span>
          <YearPill ar={2026} aktiv={valtAr === 2026} aktuellt={aktuelltAr === 2026} />
          <YearPill ar={2025} aktiv={valtAr === 2025} aktuellt={aktuelltAr === 2025} />
          <YearPill ar={2024} aktiv={valtAr === 2024} aktuellt={aktuelltAr === 2024} />
        </div>
        <div className="text-sm text-ink-muted">
          Året totalt: <strong className="text-ink font-medium">{aretTotalt.toLocaleString('sv-SE')} kr</strong>
          <span className="mx-2 text-ink-faint">·</span>
          Inkommet: <strong className="text-ink font-medium">{aretInkommet.toLocaleString('sv-SE')} kr</strong>
        </div>
      </div>

      <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 text-left border-b border-line bg-bg font-medium">Datum</th>
              <th className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 text-left border-b border-line bg-bg font-medium">Kund</th>
              <th className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 text-left border-b border-line bg-bg font-medium">Typ</th>
              <th className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 text-left border-b border-line bg-bg font-medium">Plats</th>
              <th className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 text-left border-b border-line bg-bg font-medium">Status</th>
              <th className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 text-right border-b border-line bg-bg font-medium">Pris</th>
            </tr>
          </thead>
          <tbody>
            {bokningar.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-16 text-center text-ink-faint">
                  Inga bokningar för {valtAr}.
                </td>
              </tr>
            ) : (
              MONTH_NAMES.map((m) => {
                if (!grouped[m] || grouped[m].length === 0) return null;
                const sum = grouped[m].reduce(
                  (s, b) => s + (b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0),
                  0,
                );
                return [
                  <tr key={`h-${m}`}>
                    <td colSpan={6} className="bg-bg-subtle py-3.5 px-5 border-y border-line">
                      <span className="font-mono text-[10.5px] tracking-[0.22em] uppercase font-medium">
                        {m}
                      </span>
                      <span className="font-mono text-[10px] text-ink-faint ml-3 tracking-[0.1em]">
                        {grouped[m].length} {grouped[m].length === 1 ? 'bokning' : 'bokningar'}
                      </span>
                      <span className="font-mono text-[11px] text-ink-muted float-right">
                        Månadssumma: <strong className="text-ink font-medium">{sum.toLocaleString('sv-SE')} kr</strong>
                      </span>
                    </td>
                  </tr>,
                  ...grouped[m].map((b) => {
                    const st = harledBokningStatus(b);
                    const klickbar = st === 'vantar_galleri' || st === 'galleri_skickat';
                    const hjalp = st === 'vantar_galleri' ? 'Klicka när du skickat galleriet' : 'Klicka för att backa till Väntar på galleri';
                    return (
                      <tr key={b.id} className="border-b border-line-soft hover:bg-bg cursor-pointer">
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
                        <td className="py-4 px-5">
                          {klickbar ? (
                            <form action={toggleKundgalleri} className="inline">
                              <input type="hidden" name="id" value={b.id} />
                              <input type="hidden" name="kund_id" value={b.kund_id} />
                              <button type="submit" title={hjalp} className="cursor-pointer hover:opacity-70 transition-opacity">
                                <StatusPill status={st} />
                              </button>
                            </form>
                          ) : (
                            <StatusPill status={st} />
                          )}
                        </td>
                        <td className="font-mono text-[12.5px] text-right py-4 px-5">
                          {((b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0)).toLocaleString('sv-SE')} kr
                        </td>
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

function YearPill(props: { ar: number; aktiv: boolean; aktuellt: boolean }) {
  const aktiv = props.aktiv;
  const ar = props.ar;
  return (
    <a
      href={`/admin/kunder?ar=${ar}`}
      className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${aktiv ? 'bg-ink text-bg' : 'bg-white border border-line-soft text-ink hover:border-line'}`}
    >
      {ar}{props.aktuellt ? ' · aktuellt' : ''}
    </a>
  );
}
