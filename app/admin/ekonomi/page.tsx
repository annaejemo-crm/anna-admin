import { createClient } from '@/lib/supabase/server';

type BokningRow = {
  id: string;
  kund_id: string;
  datum: string | null;
  bokningsavgift_kr: number | null;
  bildpaket_kr: number | null;
  bokningsavgift_betald: boolean | null;
  bildpaket_betald: boolean | null;
  status: string;
  fotograferingstyp_id: string | null;
  kalla: string | null;
};

type TypRow = { id: string; namn: string };
type KundRow = { id: string; foretagsnamn: string | null; ar_foretagskund: boolean | null };

type ManadStat = { manad: number; total: number; paid: number; count: number };
type ArStat = {
  ar: number;
  total: number;
  paid: number;
  count: number;
  foretag: number;
  privat: number;
  manader: ManadStat[];
};

type TypStat = { count: number; total: number };

const MANADER = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];

const TYP_FARGER: Record<string, string> = {
  'Gravid': 'bg-accent',
  'Nyfödd': 'bg-sage',
  'Familj': 'bg-positive',
  'Porträtt': 'bg-warn',
  'Företag': 'bg-ink-faint',
  'Bröllop': 'bg-danger',
  'Övrigt': 'bg-line',
};

export default async function EkonomiPage(props: { searchParams?: Promise<{ ar?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};
  const valtAr = sp.ar ? parseInt(sp.ar, 10) : new Date().getFullYear();

  const { data: bokningarRaw } = await supabase
    .from('bokningar')
    .select('id, kund_id, datum, bokningsavgift_kr, bildpaket_kr, bokningsavgift_betald, bildpaket_betald, status, fotograferingstyp_id, kalla');
  const { data: typerRaw } = await supabase
    .from('fotograferingstyper')
    .select('id, namn');
  const { data: kunderRaw } = await supabase
    .from('kunder')
    .select('id, foretagsnamn, ar_foretagskund');

  const bokningar: BokningRow[] = (bokningarRaw || []) as BokningRow[];
  const typer: TypRow[] = (typerRaw || []) as TypRow[];
  const kunder: KundRow[] = (kunderRaw || []) as KundRow[];

  const typNamn: Record<string, string> = {};
  for (let i = 0; i < typer.length; i++) {
    typNamn[typer[i].id] = typer[i].namn;
  }

  const foretagSet: Record<string, boolean> = {};
  for (let i = 0; i < kunder.length; i++) {
    if (kunder[i].ar_foretagskund || kunder[i].foretagsnamn) foretagSet[kunder[i].id] = true;
  }

  function statsFor(ar: number): ArStat {
    const manader: ManadStat[] = [];
    for (let m = 0; m < 12; m++) {
      manader.push({ manad: m, total: 0, paid: 0, count: 0 });
    }
    let total = 0;
    let paid = 0;
    let count = 0;
    let foretag = 0;
    let privat = 0;

    for (let i = 0; i < bokningar.length; i++) {
      const b = bokningar[i];
      if (!b.datum) continue;
      if (b.status === 'avbokad') continue;
      const d = new Date(b.datum);
      if (d.getFullYear() !== ar) continue;
      const summa = (b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0);
      let betalt = 0;
      if (b.bokningsavgift_betald) betalt += b.bokningsavgift_kr || 0;
      if (b.bildpaket_betald) betalt += b.bildpaket_kr || 0;
      const m = d.getMonth();
      manader[m].total += summa;
      manader[m].paid += betalt;
      manader[m].count += 1;
      total += summa;
      paid += betalt;
      count += 1;
      if (foretagSet[b.kund_id]) foretag += 1; else privat += 1;
    }
    return { ar: ar, total: total, paid: paid, count: count, foretag: foretag, privat: privat, manader: manader };
  }

  const stat2024 = statsFor(2024);
  const stat2025 = statsFor(2025);
  const stat2026 = statsFor(2026);
  const valtStat = valtAr === 2024 ? stat2024 : valtAr === 2025 ? stat2025 : stat2026;

  const typStats: Record<string, TypStat> = {};
  for (let i = 0; i < bokningar.length; i++) {
    const b = bokningar[i];
    if (!b.datum) continue;
    if (b.status === 'avbokad') continue;
    const d = new Date(b.datum);
    if (d.getFullYear() !== valtAr) continue;
    const namn = b.fotograferingstyp_id ? (typNamn[b.fotograferingstyp_id] || 'Övrigt') : 'Övrigt';
    if (!typStats[namn]) typStats[namn] = { count: 0, total: 0 };
    typStats[namn].count += 1;
    typStats[namn].total += (b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0);
  }

  const typArr: { namn: string; count: number; total: number; avg: number }[] = [];
  const typNycklar = Object.keys(typStats);
  for (let i = 0; i < typNycklar.length; i++) {
    const namn = typNycklar[i];
    const s = typStats[namn];
    typArr.push({ namn: namn, count: s.count, total: s.total, avg: s.count > 0 ? Math.round(s.total / s.count) : 0 });
  }
  typArr.sort(function(a, b) { return b.total - a.total; });

  const snitt = valtStat.count > 0 ? Math.round(valtStat.total / valtStat.count) : 0;

  // Källfördelning för valt år
  const kallaStats: Record<string, number> = {};
  let kallaUtanVarde = 0;
  for (let i = 0; i < bokningar.length; i++) {
    const b = bokningar[i];
    if (!b.datum) continue;
    if (b.status === 'avbokad') continue;
    const d = new Date(b.datum);
    if (d.getFullYear() !== valtAr) continue;
    if (b.kalla) {
      if (!kallaStats[b.kalla]) kallaStats[b.kalla] = 0;
      kallaStats[b.kalla] += 1;
    } else {
      kallaUtanVarde += 1;
    }
  }
  const kallaArr: { namn: string; count: number; andel: number }[] = [];
  const kallaTotal = Object.values(kallaStats).reduce(function(s, n) { return s + n; }, 0);
  const kallaNycklar = Object.keys(kallaStats);
  for (let i = 0; i < kallaNycklar.length; i++) {
    const namn = kallaNycklar[i];
    const c = kallaStats[namn];
    kallaArr.push({ namn: namn, count: c, andel: kallaTotal > 0 ? Math.round((c / kallaTotal) * 100) : 0 });
  }
  kallaArr.sort(function(a, b) { return b.count - a.count; });

  const manadTyp: Record<number, Record<string, number>> = {};
  for (let m = 0; m < 12; m++) manadTyp[m] = {};
  for (let i = 0; i < bokningar.length; i++) {
    const b = bokningar[i];
    if (!b.datum) continue;
    if (b.status === 'avbokad') continue;
    const d = new Date(b.datum);
    if (d.getFullYear() !== valtAr) continue;
    const namn = b.fotograferingstyp_id ? (typNamn[b.fotograferingstyp_id] || 'Övrigt') : 'Övrigt';
    if (!manadTyp[d.getMonth()][namn]) manadTyp[d.getMonth()][namn] = 0;
    manadTyp[d.getMonth()][namn] += 1;
  }
  const aktivaTyper: string[] = [];
  for (let i = 0; i < typArr.length; i++) {
    if (typArr[i].count > 0) aktivaTyper.push(typArr[i].namn);
  }

  return (
    <>
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">Räkenskapsår {valtAr}</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Ekonomi</h1>
        </div>
        <div className="flex gap-1.5">
          <YearPill ar={2024} aktiv={valtAr === 2024} />
          <YearPill ar={2025} aktiv={valtAr === 2025} />
          <YearPill ar={2026} aktiv={valtAr === 2026} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-12">
        <Kpi label="Bokad omsättning" value={`${valtStat.total.toLocaleString('sv-SE')} kr`} sub={`${valtStat.count} bokningar`} />
        <Kpi label="Inkommit" value={`${valtStat.paid.toLocaleString('sv-SE')} kr`} sub="bokningsavgift + paket" />
        <Kpi label="Återstår" value={`${Math.max(0, valtStat.total - valtStat.paid).toLocaleString('sv-SE')} kr`} sub="ej betalt än" />
        <Kpi label="Snittpris" value={`${snitt.toLocaleString('sv-SE')} kr`} sub="per bokning" />
      </div>

      <div className="mb-12">
        <div className="eyebrow mb-4">Årsjämförelse</div>
        <div className="grid grid-cols-3 gap-6">
          <YearCard stat={stat2024} />
          <YearCard stat={stat2025} />
          <YearCard stat={stat2026} />
        </div>
      </div>

      <div className="mb-12">
        <div className="flex justify-between items-end mb-4">
          <div className="eyebrow">Månadsfördelning {valtAr}</div>
          <div className="text-[11px] text-ink-muted">Antal bokningar per kategori</div>
        </div>
        <MonthCategoryChart manadTyp={manadTyp} typer={aktivaTyper} />
      </div>

      <div className="mb-12">
        <div className="flex justify-between items-end mb-4">
          <div className="eyebrow">Omsättning per månad {valtAr}</div>
          <div className="text-[11px] text-ink-muted">Bokad omsättning och inkommit i kronor</div>
        </div>
        <MonthRevenueChart manader={valtStat.manader} />
      </div>

      <div className="mb-12">
        <div className="flex justify-between items-end mb-4">
          <div className="eyebrow">Var bokningarna kom ifrån {valtAr}</div>
          <div className="text-[11px] text-ink-muted">{kallaTotal} bokningar med källa · {kallaUtanVarde} utan</div>
        </div>
        <div className="bg-white border border-line-soft rounded-sm p-6">
          {kallaArr.length === 0 ? (
            <div className="text-center text-ink-muted text-sm py-4">Ingen källa ifylld för {valtAr} ännu. Fyll i källa när du skapar nya bokningar.</div>
          ) : (
            <div className="space-y-3">
              {kallaArr.map(function(k) {
                return (
                  <div key={k.namn} className="grid grid-cols-[180px_1fr_80px] gap-4 items-center">
                    <div className="text-sm font-medium">{k.namn}</div>
                    <div className="h-6 bg-bg-subtle rounded-sm overflow-hidden">
                      <div className="h-full bg-accent/70" style={{ width: `${k.andel}%` }} />
                    </div>
                    <div className="text-right tabular-nums text-sm">
                      <span className="font-medium">{k.count} st</span>
                      <span className="text-ink-muted ml-1.5">({k.andel}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mb-12">
        <div className="eyebrow mb-4">Per fotograferingstyp {valtAr}</div>
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle">
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-3 font-medium">Typ</th>
                <th className="px-5 py-3 font-medium text-right">Antal</th>
                <th className="px-5 py-3 font-medium text-right">Snittpris</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {typArr.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-ink-muted">Ingen data för {valtAr}</td></tr>
              ) : typArr.map(function(t, i) {
                return (
                  <tr key={i} className="border-t border-line-soft">
                    <td className="px-5 py-3.5 font-medium">{t.namn}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{t.count}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-ink-muted">{t.avg.toLocaleString('sv-SE')} kr</td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-medium">{t.total.toLocaleString('sv-SE')} kr</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function YearPill(props: { ar: number; aktiv: boolean }) {
  const aktiv = props.aktiv;
  const ar = props.ar;
  return (
    <a
      href={`/admin/ekonomi?ar=${ar}`}
      className={`px-4 py-2 text-sm rounded-sm transition-colors ${aktiv ? 'bg-ink text-bg' : 'bg-white border border-line-soft text-ink hover:border-line'}`}
    >
      {ar}
    </a>
  );
}

function Kpi(props: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-line-soft rounded-sm px-7 py-6">
      <div className="eyebrow mb-3">{props.label}</div>
      <div className="font-serif text-[38px] leading-none tracking-tight">{props.value}</div>
      <div className="text-[12px] text-ink-muted mt-1.5">{props.sub}</div>
    </div>
  );
}

function YearCard(props: { stat: ArStat }) {
  const stat = props.stat;
  let max = 0;
  for (let i = 0; i < stat.manader.length; i++) {
    if (stat.manader[i].total > max) max = stat.manader[i].total;
  }
  return (
    <div className="bg-white border border-line-soft rounded-sm p-6">
      <div className="flex justify-between items-baseline mb-1">
        <div className="font-serif text-2xl">{stat.ar}</div>
        <div className="text-[11px] text-ink-muted uppercase tracking-wider">{stat.count} bokningar</div>
      </div>
      <div className="font-serif text-[28px] tracking-tight mb-1">{stat.total.toLocaleString('sv-SE')} kr</div>
      <div className="text-[12px] text-ink-muted mb-5">
        {stat.paid.toLocaleString('sv-SE')} kr inkommit · {stat.foretag} företag · {stat.privat} privat
      </div>
      <div className="flex items-end gap-1 h-20">
        {stat.manader.map(function(m, i) {
          const h = max > 0 ? Math.round((m.total / max) * 100) : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${MANADER[i]}: ${m.total.toLocaleString('sv-SE')} kr`}>
              <div className="w-full bg-accent/70 rounded-t-sm" style={{ height: `${h}%`, minHeight: m.total > 0 ? '2px' : '0' }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-ink-faint mt-1.5 px-0.5">
        <span>jan</span><span>apr</span><span>jul</span><span>okt</span><span>dec</span>
      </div>
    </div>
  );
}

function MonthCategoryChart(props: { manadTyp: Record<number, Record<string, number>>; typer: string[] }) {
  const manadTyp = props.manadTyp;
  const typer = props.typer;
  let max = 0;
  for (let m = 0; m < 12; m++) {
    let summa = 0;
    for (let i = 0; i < typer.length; i++) {
      summa += manadTyp[m][typer[i]] || 0;
    }
    if (summa > max) max = summa;
  }
  return (
    <div className="bg-white border border-line-soft rounded-sm p-6">
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5 text-xs">
        {typer.map(function(t) {
          return <Legend key={t} color={TYP_FARGER[t] || 'bg-line'} label={t} />;
        })}
      </div>
      <div className="flex items-end gap-2 h-80">
        {MANADER.map(function(namn, m) {
          let summa = 0;
          for (let i = 0; i < typer.length; i++) summa += manadTyp[m][typer[i]] || 0;
          const titel = typer.map(function(t) {
            const v = manadTyp[m][t] || 0;
            return v > 0 ? `${t}: ${v}` : null;
          }).filter(function(x) { return x !== null; }).join('\n');
          const stapelH = max > 0 ? (summa / max) * 100 : 0;
          return (
            <div key={m} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="text-[10px] text-ink-muted mb-1 tabular-nums h-3">{summa > 0 ? summa : ''}</div>
              <div className="w-full flex flex-col-reverse" style={{ height: `${stapelH}%` }} title={`${namn}\n${titel || 'inga bokningar'}`}>
                {typer.map(function(t, ti) {
                  const v = manadTyp[m][t] || 0;
                  if (v === 0) return null;
                  const andel = summa > 0 ? (v / summa) * 100 : 0;
                  const isLast = ti === typer.length - 1;
                  return (
                    <div
                      key={t}
                      className={`${TYP_FARGER[t] || 'bg-line'} ${isLast ? 'rounded-t-sm' : ''} flex-shrink-0`}
                      style={{ height: `${andel}%`, minHeight: v > 0 ? '4px' : '0' }}
                    />
                  );
                })}
              </div>
              <div className="text-[10px] text-ink-faint mt-1.5">{namn}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompareChart(props: { stat2024: ArStat; stat2025: ArStat; stat2026: ArStat }) {
  let max = 0;
  const alla = [props.stat2024, props.stat2025, props.stat2026];
  for (let a = 0; a < alla.length; a++) {
    for (let i = 0; i < 12; i++) {
      if (alla[a].manader[i].total > max) max = alla[a].manader[i].total;
    }
  }
  return (
    <div className="bg-white border border-line-soft rounded-sm p-6">
      <div className="flex gap-6 mb-5 text-xs">
        <Legend color="bg-ink-faint" label="2024" />
        <Legend color="bg-sage" label="2025" />
        <Legend color="bg-accent" label="2026" />
      </div>
      <div className="flex items-end gap-2 h-48">
        {MANADER.map(function(namn, m) {
          const v24 = props.stat2024.manader[m].total;
          const v25 = props.stat2025.manader[m].total;
          const v26 = props.stat2026.manader[m].total;
          const h24 = max > 0 ? (v24 / max) * 100 : 0;
          const h25 = max > 0 ? (v25 / max) * 100 : 0;
          const h26 = max > 0 ? (v26 / max) * 100 : 0;
          return (
            <div key={m} className="flex-1 flex flex-col items-center">
              <div className="flex items-end gap-0.5 w-full h-full justify-center">
                <div className="w-1/3 bg-ink-faint rounded-t-sm" style={{ height: `${h24}%`, minHeight: v24 > 0 ? '2px' : '0' }} title={`2024: ${v24.toLocaleString('sv-SE')} kr`} />
                <div className="w-1/3 bg-sage rounded-t-sm" style={{ height: `${h25}%`, minHeight: v25 > 0 ? '2px' : '0' }} title={`2025: ${v25.toLocaleString('sv-SE')} kr`} />
                <div className="w-1/3 bg-accent rounded-t-sm" style={{ height: `${h26}%`, minHeight: v26 > 0 ? '2px' : '0' }} title={`2026: ${v26.toLocaleString('sv-SE')} kr`} />
              </div>
              <div className="text-[10px] text-ink-faint mt-1.5">{namn}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthRevenueChart(props: { manader: ManadStat[] }) {
  const manader = props.manader;
  let max = 0;
  for (let m = 0; m < 12; m++) {
    if (manader[m].total > max) max = manader[m].total;
  }
  const totalAr = manader.reduce(function(s, m) { return s + m.total; }, 0);
  const paidAr = manader.reduce(function(s, m) { return s + m.paid; }, 0);

  function formatKr(v: number): string {
    if (v >= 1000) return `${Math.round(v / 100) / 10} tkr`;
    return `${v.toLocaleString('sv-SE')} kr`;
  }

  return (
    <div className="bg-white border border-line-soft rounded-sm p-6">
      <div className="flex justify-between items-end mb-5">
        <div className="flex gap-5 text-xs">
          <Legend color="bg-accent/70" label="Bokad omsättning" />
          <Legend color="bg-sage" label="Inkommit" />
        </div>
        <div className="text-[12px] text-ink-muted">
          År totalt: <strong className="text-ink font-medium">{totalAr.toLocaleString('sv-SE')} kr</strong>
          <span className="mx-2 text-ink-faint">·</span>
          inkommit: <strong className="text-ink font-medium">{paidAr.toLocaleString('sv-SE')} kr</strong>
        </div>
      </div>
      <div className="flex items-end gap-2 h-80">
        {MANADER.map(function(namn, m) {
          const v = manader[m].total;
          const p = manader[m].paid;
          const h = max > 0 ? (v / max) * 100 : 0;
          const ph = max > 0 ? (p / max) * 100 : 0;
          return (
            <div key={m} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="text-[10px] text-ink-muted mb-1 tabular-nums h-3">{v > 0 ? formatKr(v) : ''}</div>
              <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: 'calc(100% - 24px)' }}>
                <div
                  className="w-1/2 bg-accent/70 rounded-t-sm"
                  style={{ height: `${h}%`, minHeight: v > 0 ? '2px' : '0' }}
                  title={`${namn}: ${v.toLocaleString('sv-SE')} kr bokat`}
                />
                <div
                  className="w-1/2 bg-sage rounded-t-sm"
                  style={{ height: `${ph}%`, minHeight: p > 0 ? '2px' : '0' }}
                  title={`${namn}: ${p.toLocaleString('sv-SE')} kr inkommit`}
                />
              </div>
              <div className="text-[10px] text-ink-faint mt-1.5">{namn}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend(props: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-sm ${props.color}`} />
      <span className="text-ink-muted">{props.label}</span>
    </div>
  );
}
