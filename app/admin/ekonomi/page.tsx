import { createClient } from '@/lib/supabase/server';

const MONTH_SHORT = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];

export default async function EkonomiPage() {
  const supabase = await createClient();

  const { data: bsRaw } = await supabase
    .from('bokningar')
    .select('datum, bokningsavgift_kr, bildpaket_kr, bokningsavgift_betald, bildpaket_betald, fotograferingstyp:fotograferingstyper(namn), kund:kunder(foretagsnamn)');

  const bs = bsRaw || [];
  const currentYear = new Date().getFullYear();

  function statsFor(year) {
    const yearBs = bs.filter(b => b.datum && new Date(b.datum).getFullYear() === year);
    const monthly = Array(12).fill(0);
    const monthlyPaid = Array(12).fill(0);
    let total = 0, paid = 0, foretag = 0, privat = 0;
    for (const b of yearBs) {
      const t = (b.bokningsavgift_kr||0) + (b.bildpaket_kr||0);
      const p = (b.bokningsavgift_betald ? (b.bokningsavgift_kr||0) : 0) + (b.bildpaket_betald ? (b.bildpaket_kr||0) : 0);
      const m = new Date(b.datum).getMonth();
      monthly[m] += t;
      monthlyPaid[m] += p;
      total += t;
      paid += p;
      if (b.kund?.foretagsnamn) foretag++; else privat++;
    }
    return {
      year, monthly, monthlyPaid, total, paid,
      count: yearBs.length, foretag, privat,
      avg: yearBs.length > 0 ? Math.round(total / yearBs.length) : 0,
    };
  }

  const y2024 = statsFor(2024);
  const y2025 = statsFor(2025);
  const y2026 = statsFor(2026);
  const allYears = [y2024, y2025, y2026];

  const maxMonth = Math.max(1, ...allYears.flatMap(y => y.monthly));

  // Per typ för aktuellt år
  const typStats = {};
  for (const b of bs) {
    if (!b.datum || new Date(b.datum).getFullYear() !== currentYear) continue;
    const t = b.fotograferingstyp?.namn || 'Okänd';
    if (!typStats[t]) typStats[t] = { count: 0, total: 0 };
    typStats[t].count++;
    typStats[t].total += (b.bokningsavgift_kr||0) + (b.bildpaket_kr||0);
  }
  const typArr = Object.entries(typStats).map(([namn, s]) => ({ namn, ...s, avg: s.count > 0 ? Math.round(s.total/s.count) : 0 })).sort((a,b) => b.total - a.total);

  const current = y2026;
  const remaining = current.total - current.paid;

  return (
    <>
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">Räkenskapsår {currentYear}</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Ekonomi</h1>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-12">
        <Kpi label="Bokad omsättning" value={`${current.total.toLocaleString('sv-SE')} kr`} sub={`${current.count} bokningar`} />
        <Kpi label="Inkommit" value={`${current.paid.toLocaleString('sv-SE')} kr`} sub={current.total > 0 ? `${Math.round(100 * current.paid / current.total)}% av bokat` : '–'} />
        <Kpi label="Återstår" value={`${Math.max(0, remaining).toLocaleString('sv-SE')} kr`} sub="bokat minus inkommet" />
        <Kpi label="Snittpris per bokning" value={`${current.avg.toLocaleString('sv-SE')} kr`} sub={`${current.foretag} företag · ${current.privat} privat`} />
      </div>

      <section className="mb-12">
        <h2 className="font-serif text-2xl mb-1">Året mot tidigare år</h2>
        <p className="text-ink-muted text-[13px] mb-5">Snabb överblick. Den färgade tonen är aktuellt år.</p>
        <div className="grid grid-cols-3 gap-5">
          {allYears.map(y => (
            <YearCard key={y.year} year={y} current={y.year === currentYear} maxMonth={maxMonth} />
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-2xl mb-1">Månad för månad, tre år bakåt</h2>
        <p className="text-ink-muted text-[13px] mb-5">Tre staplar per månad: 2024 (ljus), 2025 (grå), 2026 (terrakotta). Hovra för exakta belopp.</p>
        <div className="bg-white border border-line-soft rounded-sm p-7">
          <CompareChart years={allYears} maxMonth={maxMonth} />
          <div className="flex gap-5 mt-5 text-[12px] text-ink-muted">
            <Legend color="var(--line, #d9d2c4)" label="2024" />
            <Legend color="var(--ink-faint, #a69f92)" label="2025" />
            <Legend color="var(--accent, #b5744d)" label="2026" />
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-2xl mb-1">Fördelning per fotograferingstyp · {currentYear}</h2>
        <p className="text-ink-muted text-[13px] mb-5">Bokad omsättning i år, grupperad per typ.</p>
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <Th right={false}>Typ</Th>
                <Th right={true}>Antal</Th>
                <Th right={true}>Snittpris</Th>
                <Th right={true}>Total</Th>
              </tr>
            </thead>
            <tbody>
              {typArr.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-ink-faint">Inga bokningar i år.</td></tr>
              ) : typArr.map(t => (
                <tr key={t.namn} className="border-b border-line-soft last:border-0">
                  <td className="font-serif text-[17px] py-4 px-5">{t.namn}</td>
                  <td className="text-right font-mono text-[13px] py-4 px-5">{t.count}</td>
                  <td className="text-right font-mono text-[13px] py-4 px-5">{t.avg.toLocaleString('sv-SE')} kr</td>
                  <td className="text-right font-mono text-[13px] py-4 px-5"><strong>{t.total.toLocaleString('sv-SE')} kr</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Kpi(props) {
  return (
    <div className="bg-white border border-line-soft rounded-sm px-7 py-6">
      <div className="eyebrow mb-3">{props.label}</div>
      <div className="font-serif text-[36px] leading-none tracking-tight">{props.value}</div>
      <div className="text-[12px] text-ink-muted mt-1.5">{props.sub}</div>
    </div>
  );
}

function YearCard(props) {
  const y = props.year;
  const isCurrent = !!props.current;
  return (
    <div className={`border rounded-sm p-6 ${isCurrent ? 'border-accent' : 'border-line-soft'} bg-white`}>
      <div className="flex justify-between items-baseline mb-3">
        <span className="eyebrow">{y.year} {isCurrent ? '· hittills' : '· helår'}</span>
        {isCurrent && <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-accent">aktuellt</span>}
      </div>
      <div className="font-serif text-[28px] font-light leading-none">{y.total.toLocaleString('sv-SE')} kr</div>
      <div className="text-[12px] text-ink-muted mt-2">{y.count} bokningar · snitt {y.avg.toLocaleString('sv-SE')} kr</div>
      <div className="text-[11px] text-ink-faint mt-1">Inkommet: {y.paid.toLocaleString('sv-SE')} kr</div>
      <div className="flex gap-1 items-end h-[60px] mt-5">
        {y.monthly.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5" title={`${MONTH_SHORT[i]}: ${v.toLocaleString('sv-SE')} kr`}>
            <div className={`w-full ${isCurrent ? 'bg-accent' : 'bg-ink-faint'} rounded-sm`} style={{ height: `${(v / Math.max(1, props.maxMonth)) * 50}px`, minHeight: v > 0 ? '2px' : '0' }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {MONTH_SHORT.map(m => <div key={m} className="flex-1 text-center font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-faint">{m.charAt(0)}</div>)}
      </div>
    </div>
  );
}

function CompareChart(props) {
  const max = Math.max(1, props.maxMonth);
  return (
    <>
      <div className="grid grid-cols-12 gap-3 items-end" style={{ height: '220px' }}>
        {MONTH_SHORT.map((m, i) => {
          const v24 = props.years[0].monthly[i];
          const v25 = props.years[1].monthly[i];
          const v26 = props.years[2].monthly[i];
          return (
            <div key={m} className="flex flex-col items-center gap-1.5 h-full">
              <div className="flex gap-1 w-full items-end justify-center" style={{ height: '180px' }}>
                <Bar value={v24} max={max} color="var(--line, #d9d2c4)" label={`2024 · ${m}: ${v24.toLocaleString('sv-SE')} kr`} />
                <Bar value={v25} max={max} color="var(--ink-faint, #a69f92)" label={`2025 · ${m}: ${v25.toLocaleString('sv-SE')} kr`} />
                <Bar value={v26} max={max} color="var(--accent, #b5744d)" label={`2026 · ${m}: ${v26.toLocaleString('sv-SE')} kr`} />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{m}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Bar(props) {
  const h = (props.value / props.max) * 180;
  return (
    <div title={props.label} className="flex-1 rounded-sm cursor-default transition-opacity hover:opacity-70" style={{ height: `${h}px`, minHeight: props.value > 0 ? '2px' : '0', backgroundColor: props.color }} />
  );
}

function Legend(props) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: props.color }}></span>
      {props.label}
    </div>
  );
}

function Th(props) {
  const right = !!props.right;
  return (
    <th className={`font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 border-b border-line bg-bg font-medium ${right ? 'text-right' : 'text-left'}`}>
      {props.children}
    </th>
  );
}
