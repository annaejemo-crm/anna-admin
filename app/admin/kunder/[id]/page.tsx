import { createClient } from '@/lib/supabase/server';
import { StatusPill } from '@/components/StatusPill';
import { notFound } from 'next/navigation';

export default async function KundDetaljPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: kund } = await supabase.from('kunder').select('*').eq('id', id).single();
  if (!kund) notFound();

  const { data: bokningar } = await supabase
    .from('bokningar')
    .select('*, fotograferingstyp:fotograferingstyper(*)')
    .eq('kund_id', id)
    .order('datum', { ascending: false });

  const bs = bokningar || [];

  const totals = bs.reduce((acc, b) => {
    const a = b.bokningsavgift_kr || 0;
    const p = b.bildpaket_kr || 0;
    return {
      avgift: acc.avgift + a,
      avgiftPaid: acc.avgiftPaid + (b.bokningsavgift_betald ? a : 0),
      paket: acc.paket + p,
      paketPaid: acc.paketPaid + (b.bildpaket_betald ? p : 0),
    };
  }, { avgift: 0, avgiftPaid: 0, paket: 0, paketPaid: 0 });

  const total = totals.avgift + totals.paket;
  const totalPaid = totals.avgiftPaid + totals.paketPaid;

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">{kund.foretagsnamn ? 'Företagskund' : 'Privatkund'}</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">
          {kund.foretagsnamn || `${kund.fornamn} ${kund.efternamn || ''}`.trim()}
        </h1>
        <div className="mt-3 flex gap-6 text-sm text-ink-muted">
          {kund.email && <span>{kund.email}</span>}
          {kund.telefon && <span>{kund.telefon}</span>}
          <span>{bs.length} bokning{bs.length === 1 ? '' : 'ar'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <SumCard label="Bokningsavgifter" total={totals.avgift} paid={totals.avgiftPaid} primary={false} />
        <SumCard label="Bildpaket" total={totals.paket} paid={totals.paketPaid} primary={false} />
        <SumCard label="Totalt" total={total} paid={totalPaid} primary={true} />
      </div>

      <h2 className="font-serif text-2xl mb-4">Bokningar</h2>
      <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Datum</Th><Th>Typ</Th><Th>Plats</Th><Th>Status</Th>
              <Th right>Avgift</Th><Th right>Bildpaket</Th><Th right>Totalt</Th>
            </tr>
          </thead>
          <tbody>
            {bs.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center text-ink-faint">Inga bokningar än.</td></tr>
            ) : bs.map(b => {
              const tot = (b.bokningsavgift_kr||0) + (b.bildpaket_kr||0);
              return (
                <tr key={b.id} className="border-b border-line-soft last:border-0">
                  <td className="font-mono text-[12px] text-ink-muted py-4 px-5">{b.datum || '–'}</td>
                  <td className="py-4 px-5 font-serif text-[15px]">{b.fotograferingstyp?.namn || 'Fotografering'}</td>
                  <td className="py-4 px-5 text-[13.5px]">{b.plats || '–'}</td>
                  <td className="py-4 px-5"><StatusPill status={b.status} /></td>
                  <td className="text-right py-4 px-5"><PriceCell amount={b.bokningsavgift_kr} paid={b.bokningsavgift_betald} /></td>
                  <td className="text-right py-4 px-5"><PriceCell amount={b.bildpaket_kr} paid={b.bildpaket_betald} /></td>
                  <td className="font-mono text-[12.5px] text-right py-4 px-5">{tot.toLocaleString('sv-SE')} kr</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SumCard(props) {
  const { label, total, paid } = props;
  const primary = !!props.primary;
  const remaining = total - paid;
  return (
    <div className={`border rounded-sm p-5 ${primary ? 'bg-ink text-bg border-ink' : 'bg-white border-line-soft'}`}>
      <div className={`eyebrow mb-2 ${primary ? 'opacity-70' : ''}`}>{label}</div>
      <div className="font-serif text-[28px] leading-none mb-1">{total.toLocaleString('sv-SE')} kr</div>
      <div className={`text-[11.5px] mt-2 ${primary ? 'opacity-80' : 'text-ink-muted'}`}>
        Inkommet: <strong>{paid.toLocaleString('sv-SE')} kr</strong>
        {remaining > 0 && (<><br />Återstår: <strong>{remaining.toLocaleString('sv-SE')} kr</strong></>)}
      </div>
    </div>
  );
}

function PriceCell(props) {
  const amount = props.amount;
  const paid = !!props.paid;
  if (!amount) return <span className="text-ink-faint text-[12.5px]">–</span>;
  return (
    <span className={`font-mono text-[12.5px] inline-flex items-center gap-1.5 ${paid ? 'text-positive' : 'text-ink-muted'}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${paid ? 'bg-positive' : 'bg-line'}`}></span>
      {amount.toLocaleString('sv-SE')} kr
    </span>
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
