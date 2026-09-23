import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { WEBB_LAGEN, WEBB_LABELS, WEBB_TYPER, WEBB_TYP_LABELS, WEBB_RIKTIGA, type WebbLage, type WebbTyp, type Webbuppdrag } from '@/lib/types';
import { skapaWebbuppdrag, uppdateraWebbuppdrag, webbUppfoljningKlar } from './actions';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

function formatDatum(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`.toUpperCase();
}

function kr(n: number | null): string {
  if (n === null || n === undefined) return '–';
  return `${Math.round(n).toLocaleString('sv-SE')} kr`;
}

const LAGE_ORDNING: Record<string, number> = { pagar: 0, klar: 1, fakturerad: 2, offert_skickad: 3, forfragan: 4, betald: 5, tackade_nej: 6 };

type Rad = Webbuppdrag & { kund: { id: string; fornamn: string | null; efternamn: string | null; foretagsnamn: string | null; email: string | null } | null };

function kundNamn(k: Rad['kund']): string {
  if (!k) return '–';
  return k.foretagsnamn || `${k.fornamn || ''} ${k.efternamn || ''}`.trim() || '–';
}

/**
 * Webbuppdrag: Annas webb- och SEO-jobb at andra foretagare, mest fotografer
 * i Norge. Gors hemifran, sa de ar inga bokningar. Varje uppdrag har lage,
 * pris och datum for start, klar, faktura och betalning. Migration 0014.
 */
export default async function WebbuppdragPage(props: { searchParams?: Promise<{ fel?: string; visa?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};
  const idag = new Date().toISOString().slice(0, 10);
  const visaAlla = sp.visa === 'alla';

  const { data: uppdragRaw, error } = await supabase
    .from('webbuppdrag')
    .select('*, kund:kunder(id, fornamn, efternamn, foretagsnamn, email)')
    .order('created_at', { ascending: false });

  const migrationSaknas = !!error && /webbuppdrag|ar_webbkund/.test(error.message || '');

  const { data: kunderRaw } = await supabase
    .from('kunder')
    .select('id, fornamn, efternamn, foretagsnamn, ar_webbkund')
    .order('foretagsnamn', { ascending: true, nullsFirst: false })
    .order('efternamn');

  const kunder = ((kunderRaw || []) as any[]).map(function(k: any) {
    return { id: k.id as string, label: (k.foretagsnamn || `${k.fornamn || ''} ${k.efternamn || ''}`.trim()) + (k.ar_webbkund ? ' · webbkund' : '') };
  });

  const alla = ((uppdragRaw || []) as Rad[]);
  const avslutade = function(u: Rad) { return u.lage === 'betald' || u.lage === 'tackade_nej'; };

  const attFoljaUpp = alla.filter(function(u) { return u.uppfoljning_datum && u.uppfoljning_datum <= idag && !avslutade(u); });
  const attFakturera = alla.filter(function(u) { return u.lage === 'klar'; });
  const vantarBetalning = alla.filter(function(u) { return u.lage === 'fakturerad'; });

  const lista = alla
    .filter(function(u) { return visaAlla || !avslutade(u); })
    .sort(function(a, b) {
      const la = LAGE_ORDNING[a.lage] ?? 9;
      const lb = LAGE_ORDNING[b.lage] ?? 9;
      if (la !== lb) return la - lb;
      return String(b.created_at).localeCompare(String(a.created_at));
    });

  const antalPerLage: Record<string, number> = {};
  alla.forEach(function(u) { antalPerLage[u.lage] = (antalPerLage[u.lage] || 0) + 1; });
  const antalAvslutade = alla.filter(avslutade).length;

  const nuAr = new Date().getFullYear();
  const aretsRiktiga = alla.filter(function(u) {
    const d = u.klar_datum || u.start_datum || u.created_at;
    return WEBB_RIKTIGA.indexOf(u.lage) !== -1 && String(d).slice(0, 4) === String(nuAr);
  });
  const aretsKr = aretsRiktiga.reduce(function(s, u) { return s + (u.pris_kr || 0); }, 0);
  const aretsBetalt = aretsRiktiga.filter(function(u) { return u.lage === 'betald'; }).reduce(function(s, u) { return s + (u.pris_kr || 0); }, 0);
  const utestaende = alla.filter(function(u) { return u.lage === 'klar' || u.lage === 'fakturerad'; }).reduce(function(s, u) { return s + (u.pris_kr || 0); }, 0);

  return (
    <>
      <div className="flex justify-between items-end mb-6 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">
            {WEBB_LAGEN.filter(function(l) { return antalPerLage[l.kod]; }).map(function(l) { return `${antalPerLage[l.kod]} ${l.label.toLowerCase()}`; }).join(' · ') || 'inga uppdrag än'}
          </div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Webbuppdrag</h1>
        </div>
        <a href="#nytt-uppdrag" className="btn">+ Nytt uppdrag</a>
      </div>

      {sp.fel && (
        <div className="bg-white border border-accent rounded-sm p-4 text-sm text-accent mb-6">
          Sparades inte: {sp.fel}
        </div>
      )}

      {migrationSaknas && (
        <div className="bg-white border border-accent rounded-sm p-4 text-sm text-accent mb-6">
          Databasen saknar tabellen för webbuppdrag. Kör migration 0014_webbuppdrag i Supabase SQL Editor, sedan fungerar sidan.
        </div>
      )}

      <p className="text-sm text-ink-muted mb-8 max-w-[640px]">
        Hemsidor och SEO åt andra företagare, gjort hemifrån. Kunden ligger som vanlig kund i registret men markerad som webbkund, och varje uppdrag följs här från förfrågan till betalt. Beloppen räknas med i Ekonomi och Utveckling.
      </p>

      <div className="grid grid-cols-4 gap-6 mb-12">
        <Kpi label={`Uppdrag ${nuAr}`} value={String(aretsRiktiga.length)} sub="pågår, klara eller betalda" />
        <Kpi label={`Omsättning ${nuAr}`} value={kr(aretsKr)} sub="pris på årets uppdrag" />
        <Kpi label="Betalt" value={kr(aretsBetalt)} sub={`av årets uppdrag`} />
        <Kpi label="Utestående" value={kr(utestaende)} sub={`${attFakturera.length} att fakturera · ${vantarBetalning.length} väntar på betalning`} />
      </div>

      {(attFoljaUpp.length > 0 || attFakturera.length > 0) && (
        <section className="mb-12">
          <h2 className="text-2xl font-serif mb-1">Att göra</h2>
          <p className="text-ink-muted text-[13px] mb-5">Uppföljningsdatum som passerat, och klara uppdrag som inte fakturerats än.</p>
          <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr><Th>Datum</Th><Th>Kund</Th><Th>Uppdrag</Th><Th>Läge</Th><Th>Nästa steg</Th><Th /></tr>
              </thead>
              <tbody>
                {attFoljaUpp.map(function(u) {
                  return (
                    <tr key={'f' + u.id} className="border-b border-line-soft last:border-0 hover:bg-bg">
                      <Td className="font-mono text-[12px] text-accent whitespace-nowrap">{formatDatum(u.uppfoljning_datum)}</Td>
                      <Td className="font-serif text-[17px]"><Link href={`/admin/kunder/${u.kund_id}`}>{kundNamn(u.kund)}</Link></Td>
                      <Td>{u.titel}</Td>
                      <Td><span className="pill text-ink-muted">{WEBB_LABELS[u.lage]}</span></Td>
                      <Td className="text-ink-muted">{u.nasta_steg || '–'}</Td>
                      <Td>
                        <form action={webbUppfoljningKlar} className="flex justify-end">
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="text-[11px] px-2.5 py-1 border border-line-soft rounded-sm hover:border-ink hover:bg-bg whitespace-nowrap">Gjort</button>
                        </form>
                      </Td>
                    </tr>
                  );
                })}
                {attFakturera.filter(function(u) { return attFoljaUpp.indexOf(u) === -1; }).map(function(u) {
                  return (
                    <tr key={'k' + u.id} className="border-b border-line-soft last:border-0 hover:bg-bg">
                      <Td className="font-mono text-[12px] text-ink-muted whitespace-nowrap">{formatDatum(u.klar_datum)}</Td>
                      <Td className="font-serif text-[17px]"><Link href={`/admin/kunder/${u.kund_id}`}>{kundNamn(u.kund)}</Link></Td>
                      <Td>{u.titel}</Td>
                      <Td><span className="pill text-warn">Att fakturera</span></Td>
                      <Td className="text-ink-muted">{u.nasta_steg || (u.pris_kr ? kr(u.pris_kr) : 'pris saknas')}</Td>
                      <Td>
                        <form action={uppdateraWebbuppdrag} className="flex justify-end">
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="lage" value="fakturerad" />
                          <input type="hidden" name="nasta_steg" value={u.nasta_steg || ''} />
                          <input type="hidden" name="uppfoljning_datum" value={u.uppfoljning_datum || ''} />
                          <button type="submit" className="text-[11px] px-2.5 py-1 border border-line-soft rounded-sm hover:border-ink hover:bg-bg whitespace-nowrap">Fakturerad</button>
                        </form>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mb-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-2xl font-serif mb-1">Alla uppdrag</h2>
            <p className="text-ink-muted text-[13px]">Ändra läge, pris, nästa steg eller datum direkt i raden och klicka Spara. Datum för klar, fakturerad och betald sätts automatiskt när läget flyttas.</p>
          </div>
          <Link href={visaAlla ? '/admin/webbuppdrag' : '/admin/webbuppdrag?visa=alla'} className="text-sm text-ink-muted hover:text-ink whitespace-nowrap">
            {visaAlla ? 'Dölj betalda och nekade' : `Visa betalda och nekade (${antalAvslutade})`}
          </Link>
        </div>
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          {lista.length === 0 ? (
            <div className="p-10 text-center text-ink-faint text-sm">Inga uppdrag här. Lägg till ett nedan.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr><Th>Kund</Th><Th>Uppdrag</Th><Th>Läge</Th><Th right>Pris</Th><Th>Nästa steg</Th><Th>Följ upp</Th><Th>Datum</Th><Th /></tr>
              </thead>
              <tbody>
                {lista.map(function(u) {
                  const formId = `webb-${u.id}`;
                  return (
                    <tr key={u.id} className="border-b border-line-soft last:border-0 hover:bg-bg align-middle">
                      <Td className="font-serif text-[17px]">
                        <Link href={`/admin/kunder/${u.kund_id}`}>{kundNamn(u.kund)}</Link>
                        {u.hemsida && <div className="text-[11px] text-ink-faint font-sans mt-0.5">{u.hemsida}</div>}
                      </Td>
                      <Td>
                        <div>{u.titel}</div>
                        <div className="text-[11px] text-ink-faint mt-0.5">{WEBB_TYP_LABELS[u.typ] || u.typ}</div>
                      </Td>
                      <Td>
                        <select name="lage" form={formId} defaultValue={u.lage} className={inputSmall}>
                          {WEBB_LAGEN.map(function(l) { return <option key={l.kod} value={l.kod}>{l.label}</option>; })}
                        </select>
                      </Td>
                      <Td right>
                        <input type="text" inputMode="numeric" name="pris_kr" form={formId} defaultValue={u.pris_kr ?? ''} placeholder="kr" className={`${inputSmall} w-[90px] text-right font-mono`} />
                      </Td>
                      <Td>
                        <input type="text" name="nasta_steg" form={formId} defaultValue={u.nasta_steg || ''} placeholder="t.ex. skicka faktura" className={`${inputSmall} min-w-[160px]`} />
                      </Td>
                      <Td>
                        <input type="date" name="uppfoljning_datum" form={formId} defaultValue={u.uppfoljning_datum || ''} className={inputSmall} />
                      </Td>
                      <Td className="font-mono text-[11px] text-ink-muted whitespace-nowrap leading-relaxed">
                        {u.start_datum && <div>start {formatDatum(u.start_datum)}</div>}
                        {u.klar_datum && <div>klar {formatDatum(u.klar_datum)}</div>}
                        {u.fakturerad_datum && <div>fakt. {formatDatum(u.fakturerad_datum)}</div>}
                        {u.betald_datum && <div>betald {formatDatum(u.betald_datum)}</div>}
                        {!u.start_datum && !u.klar_datum && !u.fakturerad_datum && !u.betald_datum && <div>inkom {formatDatum(u.created_at)}</div>}
                      </Td>
                      <Td>
                        <form id={formId} action={uppdateraWebbuppdrag} className="flex justify-end">
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="text-[11px] px-2.5 py-1 border border-line-soft rounded-sm hover:border-ink hover:bg-bg">Spara</button>
                        </form>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section id="nytt-uppdrag" className="mb-12">
        <h2 className="text-2xl font-serif mb-1">Nytt uppdrag</h2>
        <p className="text-ink-muted text-[13px] mb-5">Välj en kund som redan finns, eller fyll i en ny längre ner. Bara uppdragets titel krävs, resten fyller du på när du har det. Pris anges i svenska kronor.</p>
        <form action={skapaWebbuppdrag} className="bg-white border border-line-soft rounded-sm p-6 space-y-5 max-w-3xl">
          <Row>
            <Field label="Vad gäller uppdraget" kravs>
              <input type="text" name="titel" className={inputStyle} required placeholder="t.ex. Ny sajt i WordPress, SEO-genomgång" />
            </Field>
            <Field label="Typ">
              <select name="typ" defaultValue="seo_analys" className={inputStyle}>
                {WEBB_TYPER.map(function(t) { return <option key={t.kod} value={t.kod}>{t.label}</option>; })}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Kund som redan finns">
              <select name="kund_id" defaultValue="" className={inputStyle}>
                <option value="">Ny kund, fyll i nedan</option>
                {kunder.map(function(k) { return <option key={k.id} value={k.id}>{k.label}</option>; })}
              </select>
            </Field>
            <Field label="Hemsida">
              <input type="text" name="hemsida" className={inputStyle} placeholder="t.ex. vevramedia.no" />
            </Field>
          </Row>
          <div className="border-t border-line-soft pt-5">
            <div className="text-[11px] uppercase tracking-wider text-ink-faint mb-4">Ny kund, om den inte finns i listan</div>
            <div className="space-y-5">
              <Row>
                <Field label="Företagsnamn">
                  <input type="text" name="foretagsnamn" className={inputStyle} />
                </Field>
                <Field label="Email">
                  <input type="email" name="email" className={inputStyle} />
                </Field>
              </Row>
              <Row>
                <Field label="Kontaktperson, förnamn">
                  <input type="text" name="fornamn" className={inputStyle} />
                </Field>
                <Field label="Kontaktperson, efternamn">
                  <input type="text" name="efternamn" className={inputStyle} />
                </Field>
              </Row>
              <Field label="Telefon">
                <input type="tel" name="telefon" className={inputStyle} />
              </Field>
            </div>
          </div>
          <div className="border-t border-line-soft pt-5 space-y-5">
            <Row>
              <Field label="Läge">
                <select name="lage" defaultValue="forfragan" className={inputStyle}>
                  {WEBB_LAGEN.map(function(l) { return <option key={l.kod} value={l.kod}>{l.label}</option>; })}
                </select>
              </Field>
              <Field label="Pris (kr, exkl. moms)">
                <input type="text" inputMode="numeric" name="pris_kr" className={inputStyle} placeholder="t.ex. 15000" />
              </Field>
            </Row>
            <Row>
              <Field label="Start">
                <input type="date" name="start_datum" className={inputStyle} />
              </Field>
              <Field label="Klar">
                <input type="date" name="klar_datum" className={inputStyle} />
              </Field>
            </Row>
            <Row>
              <Field label="Nästa steg">
                <input type="text" name="nasta_steg" className={inputStyle} placeholder="t.ex. skicka offert" />
              </Field>
              <Field label="Följ upp senast">
                <input type="date" name="uppfoljning_datum" className={inputStyle} />
              </Field>
            </Row>
            <Field label="Anteckning">
              <textarea name="anteckning" rows={3} className={`${inputStyle} resize-y`} placeholder="Vad som ingår, vad som är sagt, vad som är kvar" />
            </Field>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">Spara uppdrag</button>
          </div>
        </form>
      </section>
    </>
  );
}

const inputStyle = 'w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink';
const inputSmall = 'w-full px-2 py-1.5 bg-white border border-line-soft rounded-sm text-[12.5px] focus:outline-none focus:border-ink';

function Row(props: { children: any }) {
  return <div className="grid grid-cols-2 gap-5">{props.children}</div>;
}

function Field(props: { label: string; children: any; kravs?: boolean }) {
  return (
    <div>
      <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">
        {props.label}
        {props.kravs && <span className="text-accent ml-1" title="Obligatoriskt">*</span>}
      </label>
      {props.children}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-line-soft rounded-sm p-5">
      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint mb-2">{label}</div>
      <div className="font-serif text-[30px] leading-none mb-1.5">{value}</div>
      <div className="text-[12px] text-ink-muted">{sub}</div>
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
