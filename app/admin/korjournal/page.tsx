import { createClient } from '@/lib/supabase/server';
import { raderaKorjournalpost, skapaKorjournalpost, sparaMatarstallning } from './actions';

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

  const { data: matar } = await supabase
    .from('matarstallning')
    .select('*')
    .eq('ar', valtAr)
    .maybeSingle();

  const { data } = await supabase
    .from('korjournal')
    .select('*')
    .gte('datum', start)
    .lte('datum', slut)
    .order('datum', { ascending: false });

  const poster = (data || []) as any[];

  const grupperat: Record<number, any[]> = {};
  for (const p of poster) {
    const m = new Date(p.datum).getMonth();
    (grupperat[m] ||= []).push(p);
  }

  let aretKm = 0;
  for (const p of poster) aretKm += Number(p.antal_km) || 0;
  const aretMil = aretKm / 10;
  const aretKr = aretMil * milersattningKrPerMil;

  const idagDatum = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="flex justify-between items-end">
          <div>
            <div className="eyebrow mb-1.5">Arbete</div>
            <h1 className="font-serif text-[42px] font-light leading-tight">Körjournal</h1>
            <p className="text-sm text-ink-muted mt-3 max-w-xl">
              Resor fylls i automatiskt när en bokning markeras KLAR och har avstånd. Du kan också lägga till manuella resor nedan. Skicka filen till din revisor i slutet av månaden.
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

      {/* Mätarställning */}
      <section className="bg-white border border-line-soft rounded-sm p-5 mb-6">
        <details>
          <summary className="cursor-pointer flex justify-between items-center text-sm">
            <span className="eyebrow">Mätarställning {valtAr}</span>
            <span className="text-ink-muted text-[12px]">
              {matar?.borjan_km != null && `Början: ${Number(matar.borjan_km).toLocaleString('sv-SE')} km`}
              {matar?.borjan_km != null && matar?.slut_km != null && ' · '}
              {matar?.slut_km != null && `Slut: ${Number(matar.slut_km).toLocaleString('sv-SE')} km`}
              {matar?.borjan_km == null && matar?.slut_km == null && 'Ej ifyllt'}
            </span>
          </summary>
          <form action={sparaMatarstallning} className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
            <input type="hidden" name="ar" value={valtAr} />
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">
                Mätarställning vid årets början (km)
              </label>
              <input
                type="text"
                name="borjan_km"
                defaultValue={matar?.borjan_km != null ? String(matar.borjan_km) : ''}
                inputMode="decimal"
                className="w-full px-3 py-2 bg-white border border-line-soft rounded-sm text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">
                Mätarställning vid årets slut (km)
              </label>
              <input
                type="text"
                name="slut_km"
                defaultValue={matar?.slut_km != null ? String(matar.slut_km) : ''}
                inputMode="decimal"
                className="w-full px-3 py-2 bg-white border border-line-soft rounded-sm text-sm"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-ink text-bg text-sm rounded-sm">
              Spara
            </button>
          </form>
        </details>
      </section>

      {/* Manuell post */}
      <section className="bg-white border border-line-soft rounded-sm p-5 mb-8">
        <details>
          <summary className="cursor-pointer text-sm">
            <span className="eyebrow">+ Lägg till resa manuellt</span>
            <span className="text-ink-muted text-[12px] ml-3">
              För resor som inte kommer från bokningar (möte, hämta material osv)
            </span>
          </summary>
          <form action={skapaKorjournalpost} className="mt-5 space-y-4">
            <div className="grid grid-cols-[160px_1fr] gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">Datum</label>
                <input type="date" name="datum" required defaultValue={idagDatum} className="w-full px-3 py-2 border border-line-soft rounded-sm text-sm" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">Syfte</label>
                <input type="text" name="syfte" required placeholder="t.ex. Möte med kund, Hämta material" className="w-full px-3 py-2 border border-line-soft rounded-sm text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">Plats (namn)</label>
                <input type="text" name="plats_namn" placeholder="t.ex. Frölundavägen 3" className="w-full px-3 py-2 border border-line-soft rounded-sm text-sm" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">Adress</label>
                <input type="text" name="plats_adress" placeholder="Gata, ort" className="w-full px-3 py-2 border border-line-soft rounded-sm text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-[200px_1fr] gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">Antal km (tur och retur)</label>
                <input type="text" name="antal_km" required inputMode="decimal" placeholder="t.ex. 15,2" className="w-full px-3 py-2 border border-line-soft rounded-sm text-sm" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">Medföljande (valfritt)</label>
                <input type="text" name="medfoljande" placeholder="t.ex. Sophie Annik" className="w-full px-3 py-2 border border-line-soft rounded-sm text-sm" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="px-5 py-2 bg-ink text-bg text-sm rounded-sm">
                Spara resa
              </button>
            </div>
          </form>
        </details>
      </section>

      {poster.length === 0 ? (
        <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted">
          <p className="font-serif text-xl mb-2 text-ink">Inga resor för {valtAr} än</p>
          <p className="text-sm">
            När du markerar en bokning som KLAR och den har en plats med avstånd, dyker resan upp här automatiskt. Eller lägg till en resa manuellt ovan.
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
                      <th className="px-5 py-2.5 font-medium">Plats / Adress</th>
                      <th className="px-5 py-2.5 font-medium">Medföljande</th>
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
                        <td className="px-5 py-3 text-ink-muted text-[12.5px]">{p.medfoljande || '—'}</td>
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
