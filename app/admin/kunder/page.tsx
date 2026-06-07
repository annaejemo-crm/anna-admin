import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { StatusPill } from '@/components/StatusPill';
import { harledBokningStatus } from '@/lib/types';

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`.toUpperCase();
}

export default async function KunderPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('bokningar')
    .select('*, kund:kunder(*), fotograferingstyp:fotograferingstyper(*)')
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

  return (
    <>
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">{bokningar.length} bokningar för 2026</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Kunder & bokningar</h1>
        </div>
        <Link href="/admin/kunder/ny" className="btn">+ Ny bokning</Link>
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
                  Inga bokningar än. Klicka på "+ Ny bokning" för att skapa din första.
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
                  ...grouped[m].map((b) => (
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
                      <td className="py-4 px-5"><StatusPill status={harledBokningStatus(b)} /></td>
                      <td className="font-mono text-[12.5px] text-right py-4 px-5">
                        {((b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0)).toLocaleString('sv-SE')} kr
                      </td>
                    </tr>
                  )),
                ];
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
