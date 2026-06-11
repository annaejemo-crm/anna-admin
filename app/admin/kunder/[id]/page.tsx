import { createClient } from '@/lib/supabase/server';
import { StatusPill } from '@/components/StatusPill';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { togglePaid, setBildpaket } from '../actions';
import { toggleKundgalleri, gaVidare, skickaRecensionsmail } from '../../bokningar/actions';
import { harledBokningStatus, harledAvtalStatus } from '@/lib/types';
import { AvtalPill } from '@/components/AvtalPill';

export default async function KundDetaljPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  const supabase = await createClient();

  const { data: kund } = await supabase
    .from('kunder')
    .select('*')
    .eq('id', id)
    .single();

  if (!kund) notFound();

  const { data: bokningarRaw } = await supabase
    .from('bokningar')
    .select('*, fotograferingstyp:fotograferingstyper(namn), avtal(status)')
    .eq('kund_id', id)
    .order('datum', { ascending: false });

  const { data: paketRaw } = await supabase
    .from('bildpaket')
    .select('id, namn, pris_kr')
    .order('ordning');

  const bokningar = bokningarRaw || [];
  const paket = paketRaw || [];

  let sumAvgift = 0;
  let sumAvgiftPaid = 0;
  let sumPaket = 0;
  let sumPaketPaid = 0;
  for (let i = 0; i < bokningar.length; i++) {
    const b: any = bokningar[i];
    sumAvgift += b.bokningsavgift_kr || 0;
    if (b.bokningsavgift_betald) sumAvgiftPaid += b.bokningsavgift_kr || 0;
    sumPaket += b.bildpaket_kr || 0;
    if (b.bildpaket_betald) sumPaketPaid += b.bildpaket_kr || 0;
  }
  const total = sumAvgift + sumPaket;
  const totalPaid = sumAvgiftPaid + sumPaketPaid;

  const kundNamn = kund.foretagsnamn || `${kund.fornamn} ${kund.efternamn || ''}`.trim();
  const arForetagskund = !!kund.ar_foretagskund;
  const momsBelopp = arForetagskund ? Math.round(total * 0.25) : 0;
  const totalInkMoms = arForetagskund ? total + momsBelopp : total;

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="flex justify-between items-start">
          <div>
            <div className="eyebrow mb-1.5">{arForetagskund ? 'Företagskund (priser ex moms)' : 'Privatkund'}</div>
            <h1 className="font-serif text-[42px] font-light leading-tight">{kundNamn}</h1>
            <div className="mt-3 text-sm text-ink-muted">{bokningar.length} bokningar</div>
            <div className="mt-2 flex gap-6 text-sm text-ink-muted">
              {kund.email && <span>{kund.email}</span>}
              {kund.telefon && <span>{kund.telefon}</span>}
            </div>
          </div>
          <Link
            href={`/admin/kunder/${kund.id}/redigera`}
            className="text-sm px-4 py-2 border border-line-soft rounded-sm hover:border-ink transition-colors"
          >
            Redigera kund
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-3">
        <SumCard label={arForetagskund ? 'Bokningsavgifter (ex moms)' : 'Bokningsavgifter'} total={sumAvgift} inkommet={sumAvgiftPaid} />
        <SumCard label={arForetagskund ? 'Bildpaket (ex moms)' : 'Bildpaket'} total={sumPaket} inkommet={sumPaketPaid} />
        <SumCard label={arForetagskund ? 'Totalt ex moms' : 'Totalt'} total={total} inkommet={totalPaid} />
      </div>
      {arForetagskund && (
        <div className="mb-12 px-1 text-sm text-ink-muted font-mono">
          + {momsBelopp.toLocaleString('sv-SE')} kr moms = <strong className="text-ink font-medium">{totalInkMoms.toLocaleString('sv-SE')} kr inkl moms</strong> totalt
        </div>
      )}
      {!arForetagskund && <div className="mb-12" />}

      <div className="flex justify-between items-end mb-4">
        <h2 className="font-serif text-2xl">Bokningar</h2>
        <p className="text-xs text-ink-muted">Klicka på prickarna för att toggla betald-status. Klicka på Redigera för att ändra datum, plats eller pris.</p>
      </div>

      <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-subtle">
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
              <th className="px-4 py-3 font-medium">Datum</th>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="px-4 py-3 font-medium">Plats</th>
              <th className="px-4 py-3 font-medium">Avtal</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Avgift</th>
              <th className="px-4 py-3 font-medium">Bildpaket</th>
              <th className="px-4 py-3 font-medium">Galleri</th>
              <th className="px-4 py-3 font-medium text-right">Totalt</th>
              <th className="px-4 py-3 font-medium text-right" />
            </tr>
          </thead>
          <tbody>
            {bokningar.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-ink-faint">Inga bokningar för denna kund.</td></tr>
            ) : bokningar.map(function(b: any) {
              return (
                <tr key={b.id} className="border-t border-line-soft hover:bg-bg-subtle/40">
                  <td className="px-4 py-3.5 font-mono text-[12px] text-ink-muted">{b.datum || 'inget datum'}</td>
                  <td className="px-4 py-3.5">{b.fotograferingstyp?.namn || ''}</td>
                  <td className="px-4 py-3.5 text-ink-muted">{b.plats || ''}</td>
                  <td className="px-4 py-3.5">
                    <AvtalPill status={harledAvtalStatus(b)} />
                  </td>
                  <td className="px-4 py-3.5">
                    {(() => {
                      const st = harledBokningStatus(b);
                      const klickbar = st === 'vantar_galleri' || st === 'galleri_skickat' || st === 'klar';
                      if (!klickbar) return <StatusPill status={st} />;
                      const hjalp = st === 'vantar_galleri'
                        ? 'Klicka när du skickat galleriet'
                        : st === 'galleri_skickat'
                          ? 'Klicka när allt är klart'
                          : 'Klicka för att börja om från Väntar på galleri';
                      return (
                        <form action={gaVidare} className="inline">
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="kund_id" value={kund.id} />
                          <button type="submit" title={hjalp} className="cursor-pointer hover:opacity-70 transition-opacity">
                            <StatusPill status={st} />
                          </button>
                        </form>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <PaidCell id={b.id} kundId={kund.id} kind="avgift" belopp={b.bokningsavgift_kr || 0} betald={!!b.bokningsavgift_betald} fakturerad={!!b.bokningsavgift_fakturerad} />
                  </td>
                  <td className="px-4 py-3.5">
                    <BildpaketCell bokning={b} kundId={kund.id} paketLista={paket} />
                  </td>
                  <td className="px-4 py-3.5">
                    <GalleriCell id={b.id} kundId={kund.id} skickat={!!b.kundgalleri_skickat} skickatAt={b.kundgalleri_skickat_at} />
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-[12.5px]">
                    {((b.bokningsavgift_kr || 0) + (b.bildpaket_kr || 0)).toLocaleString('sv-SE')} kr
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex gap-3 justify-end items-center">
                      <RecensionsLank b={b} kundId={kund.id} kundEmail={kund.email} />
                      <Link
                        href={`/admin/bokningar/${b.id}/avtal`}
                        className="text-[12px] text-ink-muted hover:text-ink underline underline-offset-2"
                      >
                        Avtal
                      </Link>
                      <Link
                        href={`/admin/bokningar/${b.id}/mail`}
                        className="text-[12px] text-ink-muted hover:text-ink underline underline-offset-2"
                      >
                        Mail
                      </Link>
                      <Link
                        href={`/admin/bokningar/${b.id}/redigera`}
                        className="text-[12px] text-ink-muted hover:text-ink underline underline-offset-2"
                      >
                        Redigera
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SumCard(props: { label: string; total: number; inkommet: number }) {
  return (
    <div className="bg-white border border-line-soft rounded-sm px-7 py-6">
      <div className="eyebrow mb-3">{props.label}</div>
      <div className="font-serif text-[34px] leading-none tracking-tight">{props.total.toLocaleString('sv-SE')} kr</div>
      <div className="text-[12px] text-ink-muted mt-1.5">Inkommet: {props.inkommet.toLocaleString('sv-SE')} kr</div>
    </div>
  );
}

function PaidCell(props: { id: string; kundId: string; kind: 'avgift' | 'paket'; belopp: number; betald: boolean; fakturerad?: boolean }) {
  if (props.belopp === 0) return <span className="text-ink-faint text-[12px]">—</span>;
  let dotColor: string;
  let hjalp: string;
  if (props.kind === 'avgift') {
    if (props.betald) {
      dotColor = 'bg-positive';
      hjalp = 'Betald. Klicka för att börja om.';
    } else if (props.fakturerad) {
      dotColor = 'bg-warn';
      hjalp = 'Faktura skickad. Klicka när betalningen är mottagen — då skickas ett tackmail till kunden automatiskt.';
    } else {
      dotColor = 'bg-line';
      hjalp = 'Inget gjort. Klicka när du skickat fakturan.';
    }
  } else {
    dotColor = props.betald ? 'bg-positive' : 'bg-line';
    hjalp = props.betald ? 'Betald (klicka för att avmarkera)' : 'Ej betald (klicka för att markera)';
  }
  return (
    <form action={togglePaid} className="inline-flex items-center gap-2 justify-end">
      <input type="hidden" name="id" value={props.id} />
      <input type="hidden" name="kind" value={props.kind} />
      <input type="hidden" name="kundId" value={props.kundId} />
      <span className="font-mono text-[12.5px]">{props.belopp.toLocaleString('sv-SE')} kr</span>
      <button type="submit" title={hjalp} className={`w-2.5 h-2.5 rounded-full ${dotColor} hover:scale-125 transition-transform`} />
    </form>
  );
}

function GalleriCell(props: { id: string; kundId: string; skickat: boolean; skickatAt: string | null }) {
  const dotColor = props.skickat ? 'bg-sage' : 'bg-line';
  const titel = props.skickat
    ? `Galleri skickat${props.skickatAt ? ' ' + new Date(props.skickatAt).toLocaleDateString('sv-SE') : ''}. Klicka för att avmarkera.`
    : 'Galleri ej skickat. Klicka när du har skickat.';
  return (
    <form action={toggleKundgalleri} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={props.id} />
      <input type="hidden" name="kund_id" value={props.kundId} />
      <button type="submit" title={titel} className={`w-2.5 h-2.5 rounded-full ${dotColor} hover:scale-125 transition-transform`} />
      <span className="text-[11.5px] text-ink-muted">{props.skickat ? 'Skickat' : 'Ej skickat'}</span>
    </form>
  );
}

function RecensionsLank(props: { b: any; kundId: string; kundEmail: string | null }) {
  if (!props.b.bokning_klar) return null;
  if (!props.kundEmail) {
    return (
      <span className="text-[12px] text-ink-faint italic" title="Kunden saknar email">
        Saknar email
      </span>
    );
  }
  if (props.b.recension_mail_skickat_at) {
    const datum = new Date(props.b.recension_mail_skickat_at).toLocaleDateString('sv-SE');
    return (
      <span className="text-[12px] text-sage" title={`Recensionsmail skickat ${datum}`}>
        Recension skickad
      </span>
    );
  }
  return (
    <form action={skickaRecensionsmail} className="inline">
      <input type="hidden" name="id" value={props.b.id} />
      <input type="hidden" name="kund_id" value={props.kundId} />
      <button
        type="submit"
        title="Skickar ett mail till kunden med Google-recensionslänken"
        className="text-[12px] text-ink-muted hover:text-ink underline underline-offset-2"
      >
        Be om recension
      </button>
    </form>
  );
}

function BildpaketCell(props: { bokning: any; kundId: string; paketLista: any[] }) {
  const b = props.bokning;
  if (b.bildpaket_namn && b.bildpaket_kr) {
    return (
      <PaidCell id={b.id} kundId={props.kundId} kind="paket" belopp={b.bildpaket_kr} betald={!!b.bildpaket_betald} />
    );
  }
  return (
    <form action={setBildpaket} className="flex gap-2 items-center">
      <input type="hidden" name="id" value={b.id} />
      <input type="hidden" name="kundId" value={props.kundId} />
      <select name="paketId" defaultValue="" className="px-2 py-1 text-[12px] bg-white border border-line-soft rounded-sm">
        <option value="">Välj paket…</option>
        {props.paketLista.map(function(p: any) {
          return <option key={p.id} value={p.id}>{p.namn} ({p.pris_kr.toLocaleString('sv-SE')} kr)</option>;
        })}
      </select>
      <button type="submit" className="text-[11px] px-2 py-1 bg-ink text-bg rounded-sm">Sätt</button>
    </form>
  );
}
