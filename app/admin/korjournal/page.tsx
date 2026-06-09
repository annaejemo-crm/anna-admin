import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { raderaKorjournalpost } from './actions';

const MILERSATTNING_KR_PER_MIL = 25;
const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

export default async function KorjournalPage(props: { searchParams?: Promise<{ ar?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};
  const aktuelltAr = new Date().getFullYear();
  const valtAr = sp.ar ? parseInt(sp.ar, 10) : aktuelltAr;

  const start = `${valtAr}-01-01`;
  const slut = `${valtAr}-12-31`;

  const { data: instRaw } = await supabase
    .from('installningar')
    .select('milersattning_kr')
    .maybeSingle();
  const milersattningKrPerMil = instRaw?.milersattning_kr ? Number(instRaw.milersattning_kr) : MILERSATTNING_KR_PER_MIL;

  const { data } = await supabase
    .from('korjournal')
    .select('*')
    .gte('datum', start)
    .lte('datum', slut)
    .order('datum', { ascending: false });

  const poster = (data || []) as any[];

  // Gruppera per månad (key 0-11)
  const grupperat: Record<number, any[]> = {};
  for (const p of poster) {
    const m = new Date(p.datum).getMonth();
    (grupperat[m] ||= []).push(p);
  }

  let aretKm = 0;
  for (const p of poster) aretKm += Number(p.antal_km) || 0;
  const aretMil = aretKm / 10;
  const aretKr = aretMil * milersattningKrPerMil;

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="flex justify-between items-end">
          <div>
            <div className="eyebrow mb-1.5">Arbete</div>
            <h1 className="font-serif text-[42px] font-light leading-tight">Körjournal</h1>
            <p className="text-sm text-ink-muted mt-3 max-w-xl">
              Resor fyllls i automatiskt när en bokning markeras KLAR och har avstånd. Skicka filen till din revisor i slutet av månaden.
            </p>
          </div>
          <a
            href={`/admin/korjournal/export?ar=${valtAr}`}
            className="text-sm px-4 py-2 border border-line-soft rounded-sm hover:border-ink transition-colors"
          >
            Exportera till Excel
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint">År:</span>
          <YearPill ar={2026} aktiv={valtAr === 2026} aktuellt={aktuelltAr === 2026} />
          <YearPill ar={2025} aktiv={valtAr === 2025} aktuellt={aktuelltAr === 2025} />
          <YearPill ar={2024} aktiv={valtAr === 2024} aktuellt={aktuelltAr === 2024} />
        </div>
        <div className="text-sm text-ink-muted">
          Året totalt: <strong className="text-ink font-medium">{aretKm.toLocaleString('sv-SE')} km</strong>
          <span className="mx-2 text-ink-faint">·</span>
          <strong className="text-ink font-medium">{aretKr.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</strong>
          <span className="text-ink-faint"> ({milersattningKrPerMil.toLocaleString('sv-SE')} kr/mil)</span>
        </div>
      </div>

      {poster.length === 0 ? (
        <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted">
          <p className="font-serif text-xl mb-2 text-ink">Inga resor för {valtAr} än</p>
          <p className="text-sm">
            När du markerar en bokning som KLAR och den har en plats med avstånd, dyker resan upp här automatiskt.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {MONTH_NAMES.map((mNamn, mIdx) => {
            const matchande = grupperat[mIdx];
            if (!matchande || matchande.length === 0) return null;
            const mKm = matchande.reduce((s, p) => s + (Number(p.antal_km) || 0), 0);
            const mKr = (mKm / 10) * milersattningKrPerMil;
            return (
              <section key={mIdx} className="bg-white border border-line-soft rounded-sm overflow-hidden">
                <header className="bg-bg-subtle px-5 py-3 border-b border-line flex justify-between items-center">
                  <span className="font-mono text-[10.5px] tracking-[0.22em] uppercase font-medium">
                    {mNamn}
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {matchande.length} {matchande.length === 1 ? 'resa' : 'resor'}
                    <span className="mx-3 text-ink-faint">·</span>
                    <strong className="text-ink font-medium">{mKm.toLocaleString('sv-SE')} km</strong>
                    <span className="mx-3 text-ink-faint">·</span>
                    <strong className="text-ink font-medium">{mKr.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</strong>
                  </span>
                </header>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
                      <th className="px-5 py-2.5 font-medium">Datum</th>
                      <th className="px-5 py-2.5 font-medium">Syfte</th>
                      <th className="px-5 py-2.5 font-medium">Plats</th>
                      <th className="px-5 py-2.5 font-medium text-right">Km (T/R)</th>
                      <th className="px-5 py-2.5 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {matchande.map((p: any) => (
                      <tr key={p.id} className="border-t border-line-soft">
                        <td className="px-5 py-3 font-mono text-[12px] text-ink-muted whitespace-nowrap">
                          {new Date(p.datum).toLocaleDateString('sv-SE')}
                        </td>
                        <td className="px-5 py-3">{p.syfte}</td>
                        <td className="px-5 py-3 text-ink-muted">
                          {p.plats_namn || '—'}
                          {p.plats_adress && (
                            <span className="text-[11px] text-ink-faint ml-1">({p.plats_adress})</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[12.5px]">
                          {Number(p.antal_km).toLocaleString('sv-SE')} km
                        </td>
                        <td className="px-5 py-3 text-right">
                          <form action={raderaKorjournalpost} className="inline">
                            <input type="hidden" name="id" value={p.id} />
                            <button
                              type="submit"
                              className="text-[11px] text-ink-faint hover:text-danger"
                              title="Radera denna rad"
                            >
                              Radera
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function YearPill(props: { ar: number; aktiv: boolean; aktuellt: boolean }) {
  return (
    <a
      href={`/admin/korjournal?ar=${props.ar}`}
      className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
        props.aktiv ? 'bg-ink text-bg' : 'bg-white border border-line-soft text-ink hover:border-line'
      }`}
    >
      {props.ar}{props.aktuellt ? ' · aktuellt' : ''}
    </a>
  );
}
