import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { nyKalenderNyckel, stangAvKalender } from './actions';
import { arKalenderbokning } from '@/lib/ics';

export const dynamic = 'force-dynamic';

const APP_URL = 'https://anna-admin-five.vercel.app';
const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const VECKODAGAR = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

function idagStockholm(): string {
  const delar = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const h = (t: string) => (delar.find((p) => p.type === t) || { value: '' }).value;
  return `${h('year')}-${h('month')}-${h('day')}`;
}

function manadsnyckel(ar: number, man: number): string {
  return `${ar}-${String(man).padStart(2, '0')}`;
}

/**
 * Kalender: manadsvy over fotograferingarna, och prenumerationen som
 * lagger dem i Annas vanliga kalender. Forfragningar utan datum syns
 * inte har, de ligger under Forfragningar.
 */
export default async function KalenderPage(props: { searchParams?: Promise<{ m?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};
  const idag = idagStockholm();

  let ar = parseInt(idag.slice(0, 4), 10);
  let man = parseInt(idag.slice(5, 7), 10);
  if (sp.m && /^\d{4}-\d{2}$/.test(sp.m)) {
    ar = parseInt(sp.m.slice(0, 4), 10);
    man = parseInt(sp.m.slice(5, 7), 10);
  }
  const nyckel = manadsnyckel(ar, man);
  const forra = man === 1 ? manadsnyckel(ar - 1, 12) : manadsnyckel(ar, man - 1);
  const nasta = man === 12 ? manadsnyckel(ar + 1, 1) : manadsnyckel(ar, man + 1);

  const forstaDag = new Date(Date.UTC(ar, man - 1, 1));
  const antalDagar = new Date(Date.UTC(ar, man, 0)).getUTCDate();
  /* Mandag forst: JS ger sondag = 0 */
  const startOffset = (forstaDag.getUTCDay() + 6) % 7;

  const { data: bokningarRaw } = await supabase
    .from('bokningar')
    .select('id, kund_id, datum, tid, plats, status, kund:kunder(fornamn, efternamn, foretagsnamn, ar_foretagskund), fotograferingstyp:fotograferingstyper(namn)')
    .gte('datum', `${nyckel}-01`)
    .lte('datum', `${nyckel}-${String(antalDagar).padStart(2, '0')}`)
    .order('datum', { ascending: true })
    .order('tid', { ascending: true, nullsFirst: false });

  const bokningar = ((bokningarRaw || []) as any[]).filter(arKalenderbokning);
  const perDag: Record<string, any[]> = {};
  bokningar.forEach(function(b) { (perDag[b.datum] ||= []).push(b); });

  const { data: pren } = await supabase.from('kalender_prenumeration').select('nyckel').maybeSingle();
  const prenUrl = pren?.nyckel ? `${APP_URL}/api/kalender/${pren.nyckel}` : null;
  const prenWebcal = prenUrl ? prenUrl.replace(/^https:/, 'webcal:') : null;

  const celler: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) celler.push(null);
  for (let d = 1; d <= antalDagar; d++) celler.push(d);
  while (celler.length % 7 !== 0) celler.push(null);

  return (
    <>
      <div className="flex justify-between items-end mb-6 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">{bokningar.length} {bokningar.length === 1 ? 'fotografering' : 'fotograferingar'} i {MONTH_NAMES[man - 1]}</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Kalender</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/kalender?m=${forra}`} className="px-3 py-2 text-sm border border-line-soft rounded-sm hover:border-ink bg-white">← Förra</Link>
          <Link href="/admin/kalender" className="px-3 py-2 text-sm border border-line-soft rounded-sm hover:border-ink bg-white">I dag</Link>
          <Link href={`/admin/kalender?m=${nasta}`} className="px-3 py-2 text-sm border border-line-soft rounded-sm hover:border-ink bg-white">Nästa →</Link>
        </div>
      </div>

      <h2 className="font-serif text-2xl mb-4">{MONTH_NAMES[man - 1].charAt(0).toUpperCase()}{MONTH_NAMES[man - 1].slice(1)} {ar}</h2>

      <div className="bg-white border border-line-soft rounded-sm overflow-hidden mb-12">
        <div className="grid grid-cols-7 border-b border-line bg-bg">
          {VECKODAGAR.map(function(v) {
            return <div key={v} className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-2.5 px-3">{v}</div>;
          })}
        </div>
        <div className="grid grid-cols-7">
          {celler.map(function(d, i) {
            if (d === null) return <div key={i} className="min-h-[110px] border-b border-r border-line-soft bg-bg/40" />;
            const datum = `${nyckel}-${String(d).padStart(2, '0')}`;
            const arIdag = datum === idag;
            const arHelg = i % 7 >= 5;
            const dagens = perDag[datum] || [];
            return (
              <div key={i} className={`min-h-[110px] border-b border-r border-line-soft p-2 ${arHelg ? 'bg-bg/30' : ''}`}>
                <div className={`font-mono text-[11px] mb-1.5 ${arIdag ? 'inline-block bg-ink text-bg rounded-sm px-1.5 py-0.5' : 'text-ink-faint'}`}>{d}</div>
                <div className="space-y-1">
                  {dagens.map(function(b) {
                    const namn = b.kund?.foretagsnamn || `${b.kund?.fornamn || ''} ${b.kund?.efternamn || ''}`.trim();
                    const foretag = !!(b.kund?.ar_foretagskund || b.kund?.foretagsnamn);
                    return (
                      <Link
                        key={b.id}
                        href={`/admin/kunder/${b.kund_id}`}
                        className={`block text-[12px] leading-snug rounded-sm px-1.5 py-1 hover:opacity-80 ${foretag ? 'bg-sage/15 text-ink' : 'bg-accent/15 text-ink'}`}
                        title={`${namn}${b.fotograferingstyp?.namn ? ' · ' + b.fotograferingstyp.namn : ''}${b.plats ? ' · ' + b.plats : ''}`}
                      >
                        {b.tid && <span className="font-mono text-[10.5px] text-ink-muted mr-1">{String(b.tid).slice(0, 5)}</span>}
                        {namn}
                        {b.fotograferingstyp?.namn && <span className="text-ink-muted"> · {b.fotograferingstyp.namn}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="mb-12 max-w-3xl">
        <h2 className="text-2xl font-serif mb-1">I din egen kalender</h2>
        <p className="text-ink-muted text-[13px] mb-5">
          Prenumerera så dyker varje fotografering upp i kalendern på mobilen och datorn, med kund, tid och plats. Kalendern hämtar själv nya bokningar, ungefär varje timme. Adressen är hemlig, dela den inte. Byt den om den hamnat fel.
        </p>
        <div className="bg-white border border-line-soft rounded-sm p-6 space-y-5">
          {prenUrl ? (
            <>
              <div>
                <div className="eyebrow mb-2">Adress att prenumerera på</div>
                <code className="block text-[12.5px] bg-bg border border-line-soft rounded-sm px-3 py-2.5 break-all select-all">{prenUrl}</code>
              </div>
              <div className="text-[13px] text-ink-muted space-y-2">
                <p><strong className="text-ink font-medium">iPhone:</strong> Inställningar, Appar, Kalender, Konton, Lägg till konto, Annat, Lägg till prenumererad kalender. Klistra in adressen.</p>
                <p><strong className="text-ink font-medium">Mac:</strong> Kalender, Arkiv, Ny kalenderprenumeration. Klistra in adressen.</p>
                <p><strong className="text-ink font-medium">Google Kalender:</strong> på datorn, plustecknet vid Andra kalendrar, Från webbadress. Klistra in adressen.</p>
                <p>Snabbväg på iPhone och Mac: <a href={prenWebcal || '#'} className="underline underline-offset-2 hover:text-ink">öppna som webcal</a>.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <form action={nyKalenderNyckel}>
                  <button type="submit" className="text-[12px] px-3 py-1.5 border border-line-soft rounded-sm hover:border-ink">Byt adress</button>
                </form>
                <form action={stangAvKalender}>
                  <button type="submit" className="text-[12px] px-3 py-1.5 text-ink-muted hover:text-danger">Stäng av</button>
                </form>
              </div>
            </>
          ) : (
            <form action={nyKalenderNyckel} className="flex items-center justify-between gap-6">
              <p className="text-sm text-ink-muted">Ingen prenumeration än. Skapa en adress och lägg in den i din kalender.</p>
              <button type="submit" className="px-5 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 whitespace-nowrap">Skapa adress</button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
