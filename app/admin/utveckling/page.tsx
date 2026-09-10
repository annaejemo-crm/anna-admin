import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Utveckling: hur verksamheten gar manad for manad, raknat fran matstarten.
 * Principen ar att CRM:et byggs framat. Inget fran fore matstarten raknas
 * som inkommet, men fotograferingar med datum efter matstarten raknas
 * aven om bokningen lades in tidigare. FAM har 2026 som basar.
 */
const MATSTART = '2026-09-01';
const FAM_BASAR = 2026;

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

/* Statusar som inte ar en riktig bokning */
const EJ_BOKNING = ['forfragan', 'tackade_nej', 'avbokad'];

type Manad = { nyckel: string; ar: number; man: number; label: string };

function manadsnyckel(iso: string): string {
  return String(iso).slice(0, 7);
}

function manadsLabel(nyckel: string): string {
  const ar = parseInt(nyckel.slice(0, 4), 10);
  const man = parseInt(nyckel.slice(5, 7), 10) - 1;
  const namn = MONTH_NAMES[man] || '';
  return `${namn.charAt(0).toUpperCase()}${namn.slice(1)} ${ar}`;
}

/* Alla manader fran matstart till och med innevarande manad, senaste forst */
function manaderSedanStart(nu: Date): Manad[] {
  const lista: Manad[] = [];
  let ar = parseInt(MATSTART.slice(0, 4), 10);
  let man = parseInt(MATSTART.slice(5, 7), 10);
  const slutAr = nu.getFullYear();
  const slutMan = nu.getMonth() + 1;
  while (ar < slutAr || (ar === slutAr && man <= slutMan)) {
    const nyckel = `${ar}-${String(man).padStart(2, '0')}`;
    lista.push({ nyckel, ar, man, label: manadsLabel(nyckel) });
    man += 1;
    if (man > 12) { man = 1; ar += 1; }
  }
  return lista.reverse();
}

function kr(n: number): string {
  return `${Math.round(n).toLocaleString('sv-SE')} kr`;
}

function procent(del: number, av: number): string {
  if (!av) return '–';
  return `${Math.round((del / av) * 100)} %`;
}

export default async function UtvecklingPage() {
  const supabase = await createClient();
  const nu = new Date();
  const manader = manaderSedanStart(nu);

  /* Bokningar som antingen kom in efter matstart eller har fotodatum efter matstart */
  const { data: bokningarRaw } = await supabase
    .from('bokningar')
    .select('id, created_at, datum, status, kalla, bokningsavgift_kr, bildpaket_kr, bokningsavgift_betald, bildpaket_betald, fotograferingstyp:fotograferingstyper(namn), kund:kunder(ar_foretagskund, foretagsnamn)')
    .or(`created_at.gte.${MATSTART},datum.gte.${MATSTART}`);
  const bokningar = (bokningarRaw || []) as any[];

  function arForetag(b: any): boolean {
    return !!(b.kund?.ar_foretagskund || (b.kund?.foretagsnamn && String(b.kund.foretagsnamn).trim()));
  }
  function arRiktig(b: any): boolean {
    return EJ_BOKNING.indexOf(b.status) === -1;
  }
  function belopp(b: any): number {
    return (Number(b.bokningsavgift_kr) || 0) + (Number(b.bildpaket_kr) || 0);
  }

  /* Per manad */
  type Rad = {
    manad: Manad;
    inkomna: number; bokade: number; tackadeNej: number; oppna: number;
    foton: number; privat: number; foretag: number;
    omsattning: number; inkommet: number;
  };
  const rader: Rad[] = manader.map(function(m) {
    const inkomnaLista = bokningar.filter(function(b) { return b.created_at && manadsnyckel(b.created_at) === m.nyckel && b.created_at >= MATSTART && b.status !== 'avbokad'; });
    const fotoLista = bokningar.filter(function(b) { return b.datum && manadsnyckel(b.datum) === m.nyckel && arRiktig(b); });
    let omsattning = 0; let inkommet = 0; let privat = 0; let foretag = 0;
    fotoLista.forEach(function(b) {
      omsattning += belopp(b);
      if (b.bokningsavgift_betald) inkommet += Number(b.bokningsavgift_kr) || 0;
      if (b.bildpaket_betald) inkommet += Number(b.bildpaket_kr) || 0;
      if (arForetag(b)) foretag += 1; else privat += 1;
    });
    return {
      manad: m,
      inkomna: inkomnaLista.length,
      bokade: inkomnaLista.filter(arRiktig).length,
      tackadeNej: inkomnaLista.filter(function(b) { return b.status === 'tackade_nej'; }).length,
      oppna: inkomnaLista.filter(function(b) { return b.status === 'forfragan'; }).length,
      foton: fotoLista.length,
      privat, foretag, omsattning, inkommet,
    };
  });

  const denna = rader[0];
  const forra = rader[1];

  /* Kallor per manad, bara det som kommit in efter matstart */
  const sedanStart = bokningar.filter(function(b) { return b.created_at && b.created_at >= MATSTART && b.status !== 'avbokad'; });
  const kallor: string[] = [];
  sedanStart.forEach(function(b) { const k = b.kalla || 'Okänd'; if (kallor.indexOf(k) === -1) kallor.push(k); });
  kallor.sort(function(a, b) {
    const na = sedanStart.filter(function(x) { return (x.kalla || 'Okänd') === a; }).length;
    const nb = sedanStart.filter(function(x) { return (x.kalla || 'Okänd') === b; }).length;
    return nb - na;
  });

  /* Typer per manad, fotograferingar med datum efter matstart */
  const slutDennaManad = `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, '0')}-31`;
  const fotoSedanStart = bokningar.filter(function(b) { return b.datum && b.datum >= MATSTART && b.datum <= slutDennaManad && arRiktig(b); });
  /* Inbokat framat: fotodatum efter innevarande manad, visas separat sa totalerna stammer med tabellen */
  const framat = bokningar.filter(function(b) { return b.datum && b.datum > slutDennaManad && arRiktig(b); });
  const framatKr = framat.reduce(function(s, b) { return s + belopp(b); }, 0);
  const typer: string[] = [];
  fotoSedanStart.forEach(function(b) { const t = b.fotograferingstyp?.namn || 'Utan typ'; if (typer.indexOf(t) === -1) typer.push(t); });
  typer.sort(function(a, b) {
    const na = fotoSedanStart.filter(function(x) { return (x.fotograferingstyp?.namn || 'Utan typ') === a; }).length;
    const nb = fotoSedanStart.filter(function(x) { return (x.fotograferingstyp?.namn || 'Utan typ') === b; }).length;
    return nb - na;
  });

  /* FAM per konferensar, 2026 ar basar */
  const { data: konferenserRaw } = await supabase.from('fam_konferenser').select('id, ar').order('ar', { ascending: false });
  const konferenser = (konferenserRaw || []) as any[];
  const { data: deltagareRaw } = await supabase.from('fam_deltagare').select('konferens_id, pris, betald');
  const { data: talareRaw } = await supabase.from('fam_talare').select('konferens_id');
  const { data: sponsorerRaw } = await supabase.from('fam_sponsorer').select('konferens_id');
  const deltagare = (deltagareRaw || []) as any[];
  const talare = (talareRaw || []) as any[];
  const sponsorer = (sponsorerRaw || []) as any[];

  const famRader = konferenser
    .filter(function(k) { return k.ar >= FAM_BASAR; })
    .map(function(k) {
      const d = deltagare.filter(function(x) { return x.konferens_id === k.id; });
      const betalda = d.filter(function(x) { return x.betald; });
      return {
        ar: k.ar,
        deltagare: d.length,
        betalda: betalda.length,
        intakt: betalda.reduce(function(s, x) { return s + (Number(x.pris) || 0); }, 0),
        talare: talare.filter(function(x) { return x.konferens_id === k.id; }).length,
        sponsorer: sponsorer.filter(function(x) { return x.konferens_id === k.id; }).length,
      };
    });

  return (
    <>
      <div className="flex justify-between items-end mb-6 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">Mätstart {manadsLabel(MATSTART.slice(0, 7)).toLowerCase()} · {manader.length} {manader.length === 1 ? 'månad' : 'månader'}</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Utveckling</h1>
        </div>
      </div>

      <p className="text-sm text-ink-muted mb-8 max-w-[640px]">
        Månad för månad från mätstarten. Inkomna är allt som lagts in som ny bokning eller förfrågan den månaden, bokade är de av dem som blev bokning. Fotograferingar och omsättning räknas på fotodatum. Sidan fylls på av sig själv, den ser tunn ut de första veckorna.
      </p>

      <div className="grid grid-cols-4 gap-6 mb-12">
        <Kpi label={`Inkomna ${denna.manad.label.split(' ')[0].toLowerCase()}`} value={String(denna.inkomna)} sub={jamfor(denna.inkomna, forra?.inkomna, 'st')} />
        <Kpi label="Blev bokning" value={procent(denna.bokade, denna.inkomna)} sub={`${denna.bokade} av ${denna.inkomna} inkomna`} />
        <Kpi label="Fotograferingar" value={String(denna.foton)} sub={jamfor(denna.foton, forra?.foton, 'st')} />
        <Kpi label="Omsättning" value={kr(denna.omsattning)} sub={jamfor(denna.omsattning, forra?.omsattning, 'kr')} />
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-serif mb-1">Månad för månad</h2>
        <p className="text-ink-muted text-[13px] mb-5">Senaste månaden överst. Omsättning är avtalat belopp (bokningsavgift och bildpaket) för fotograferingar den månaden, inkommet är det som markerats betalt.</p>
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Månad</Th><Th right>Inkomna</Th><Th right>Bokade</Th><Th right>Tackade nej</Th><Th right>Öppna</Th><Th right>Foton</Th><Th right>Privat</Th><Th right>Företag</Th><Th right>Omsättning</Th><Th right>Inkommet</Th><Th right>Mot förra</Th>
              </tr>
            </thead>
            <tbody>
              {rader.map(function(r, i) {
                const f = rader[i + 1];
                return (
                  <tr key={r.manad.nyckel} className="border-b border-line-soft last:border-0 hover:bg-bg">
                    <Td className="font-serif text-[17px]">{r.manad.label}</Td>
                    <Td right className="font-mono text-[12.5px]">{r.inkomna}</Td>
                    <Td right className="font-mono text-[12.5px]">{r.bokade}{r.inkomna > 0 && <span className="text-ink-faint"> · {procent(r.bokade, r.inkomna)}</span>}</Td>
                    <Td right className="font-mono text-[12.5px] text-ink-muted">{r.tackadeNej}</Td>
                    <Td right className={`font-mono text-[12.5px] ${r.oppna > 0 ? 'text-accent' : 'text-ink-muted'}`}>{r.oppna}</Td>
                    <Td right className="font-mono text-[12.5px]">{r.foton}</Td>
                    <Td right className="font-mono text-[12.5px] text-ink-muted">{r.privat}</Td>
                    <Td right className="font-mono text-[12.5px] text-ink-muted">{r.foretag}</Td>
                    <Td right className="font-mono text-[12.5px]">{kr(r.omsattning)}</Td>
                    <Td right className="font-mono text-[12.5px] text-ink-muted">{kr(r.inkommet)}</Td>
                    <Td right className="font-mono text-[12.5px]"><Delta nu={r.omsattning} forra={f ? f.omsattning : undefined} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-6 mb-12">
        <section>
          <h2 className="text-2xl font-serif mb-1">Var kommer de ifrån</h2>
          <p className="text-ink-muted text-[13px] mb-5">Källa på allt som kommit in sedan mätstarten, förfrågningar och bokningar.</p>
          <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
            {kallor.length === 0 ? (
              <div className="p-10 text-center text-ink-faint text-sm">Inget inkommet än.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr><Th>Källa</Th>{manader.map(function(m) { return <Th key={m.nyckel} right>{m.label.slice(0, 3)}</Th>; })}<Th right>Totalt</Th><Th right>Bokade</Th></tr>
                </thead>
                <tbody>
                  {kallor.map(function(k) {
                    const mina = sedanStart.filter(function(b) { return (b.kalla || 'Okänd') === k; });
                    return (
                      <tr key={k} className="border-b border-line-soft last:border-0 hover:bg-bg">
                        <Td>{k}</Td>
                        {manader.map(function(m) {
                          const n = mina.filter(function(b) { return manadsnyckel(b.created_at) === m.nyckel; }).length;
                          return <Td key={m.nyckel} right className={`font-mono text-[12.5px] ${n ? '' : 'text-ink-faint'}`}>{n || '·'}</Td>;
                        })}
                        <Td right className="font-mono text-[12.5px]">{mina.length}</Td>
                        <Td right className="font-mono text-[12.5px] text-ink-muted">{procent(mina.filter(arRiktig).length, mina.length)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-serif mb-1">Vad fotograferas</h2>
          <p className="text-ink-muted text-[13px] mb-5">Fotograferingar per typ, på fotodatum sedan mätstarten.</p>
          <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
            {typer.length === 0 ? (
              <div className="p-10 text-center text-ink-faint text-sm">Inga fotograferingar än.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr><Th>Typ</Th>{manader.map(function(m) { return <Th key={m.nyckel} right>{m.label.slice(0, 3)}</Th>; })}<Th right>Totalt</Th><Th right>Omsättning</Th></tr>
                </thead>
                <tbody>
                  {typer.map(function(t) {
                    const mina = fotoSedanStart.filter(function(b) { return (b.fotograferingstyp?.namn || 'Utan typ') === t; });
                    return (
                      <tr key={t} className="border-b border-line-soft last:border-0 hover:bg-bg">
                        <Td>{t}</Td>
                        {manader.map(function(m) {
                          const n = mina.filter(function(b) { return manadsnyckel(b.datum) === m.nyckel; }).length;
                          return <Td key={m.nyckel} right className={`font-mono text-[12.5px] ${n ? '' : 'text-ink-faint'}`}>{n || '·'}</Td>;
                        })}
                        <Td right className="font-mono text-[12.5px]">{mina.length}</Td>
                        <Td right className="font-mono text-[12.5px] text-ink-muted">{kr(mina.reduce(function(s, b) { return s + belopp(b); }, 0))}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {framat.length > 0 && (
            <p className="text-ink-muted text-[12.5px] mt-3">Dessutom {framat.length} inbokade efter den här månaden, {kr(framatKr)}.</p>
          )}
        </section>
      </div>

      <section className="mb-12">
        <div className="flex items-end justify-between mb-1">
          <h2 className="text-2xl font-serif">Family and Meetings</h2>
          <Link href="/admin/fam" className="text-sm text-ink-muted hover:text-ink">Till FAM</Link>
        </div>
        <p className="text-ink-muted text-[13px] mb-5">{FAM_BASAR} är basår. Kommande år jämförs mot det.</p>
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          {famRader.length === 0 ? (
            <div className="p-10 text-center text-ink-faint text-sm">Ingen konferens från {FAM_BASAR} och framåt i systemet än.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr><Th>År</Th><Th right>Deltagare</Th><Th right>Betalda</Th><Th right>Intäkt biljetter</Th><Th right>Talare</Th><Th right>Sponsorer</Th><Th right>Deltagare mot basår</Th></tr>
              </thead>
              <tbody>
                {famRader.map(function(r) {
                  const bas = famRader.find(function(x) { return x.ar === FAM_BASAR; });
                  return (
                    <tr key={r.ar} className="border-b border-line-soft last:border-0 hover:bg-bg">
                      <Td className="font-serif text-[17px]">{r.ar}{r.ar === FAM_BASAR && <span className="pill text-ink-faint ml-2">basår</span>}</Td>
                      <Td right className="font-mono text-[12.5px]">{r.deltagare}</Td>
                      <Td right className="font-mono text-[12.5px] text-ink-muted">{r.betalda}</Td>
                      <Td right className="font-mono text-[12.5px]">{kr(r.intakt)}</Td>
                      <Td right className="font-mono text-[12.5px] text-ink-muted">{r.talare}</Td>
                      <Td right className="font-mono text-[12.5px] text-ink-muted">{r.sponsorer}</Td>
                      <Td right className="font-mono text-[12.5px]">{r.ar === FAM_BASAR ? '–' : <Delta nu={r.deltagare} forra={bas ? bas.deltagare : undefined} />}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}

function jamfor(nu: number, forra: number | undefined, enhet: string): string {
  if (forra === undefined) return 'första mätmånaden';
  const diff = nu - forra;
  if (diff === 0) return 'samma som förra månaden';
  const tecken = diff > 0 ? '+' : '−';
  const varde = enhet === 'kr' ? Math.abs(diff).toLocaleString('sv-SE') + ' kr' : Math.abs(diff) + ' ' + enhet;
  return `${tecken}${varde} mot förra månaden`;
}

function Delta(props: { nu: number; forra: number | undefined }) {
  if (props.forra === undefined) return <span className="text-ink-faint">–</span>;
  if (props.forra === 0 && props.nu === 0) return <span className="text-ink-faint">0 %</span>;
  if (props.forra === 0) return <span className="text-positive">ny</span>;
  const p = Math.round(((props.nu - props.forra) / props.forra) * 100);
  const farg = p > 0 ? 'text-positive' : p < 0 ? 'text-danger' : 'text-ink-muted';
  return <span className={farg}>{p > 0 ? '+' : ''}{p} %</span>;
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

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
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
