import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { PROSPEKT_LAGEN, PROSPEKT_LABELS, type ProspektLage } from '@/lib/types';
import { skapaProspekt, uppdateraProspekt, prospektKlar } from './actions';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

function formatDatum(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`.toUpperCase();
}

const LAGE_ORDNING: Record<string, number> = { prospekt: 0, kontaktad: 1, offert_skickad: 2, kund: 3, avslutad: 4 };

/**
 * Foretag: alla foretagskunder, bade prospekt och de som redan bokat.
 * Prospekt ar foretag Anna vill jobba med (studioejemo.se ska vaxa).
 * Laget, nasta steg och uppfoljningsdatum ligger pa kunden, migration 0012.
 */
export default async function ForetagPage(props: { searchParams?: Promise<{ fel?: string; visa?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};
  const idag = new Date().toISOString().slice(0, 10);
  const visaAvslutade = sp.visa === 'alla';

  const { data: foretagRaw, error } = await supabase
    .from('kunder')
    .select('id, fornamn, efternamn, foretagsnamn, email, telefon, hur_hittade, korta_anteckningar, prospekt_lage, nasta_steg, uppfoljning_datum, created_at, bokningar(id, datum, status)')
    .eq('ar_foretagskund', true)
    .order('foretagsnamn');

  const migrationSaknas = !!error && /prospekt_lage|nasta_steg|uppfoljning_datum/.test(error.message || '');

  const alla = ((foretagRaw || []) as any[]).map(function(k: any) {
    const bokningar = (k.bokningar || []) as any[];
    const riktiga = bokningar.filter(function(b: any) { return b.status !== 'forfragan' && b.status !== 'tackade_nej' && b.status !== 'avbokad'; });
    const senaste = riktiga.map(function(b: any) { return b.datum as string | null; }).filter(Boolean).sort().reverse()[0] || null;
    const lage: ProspektLage = (k.prospekt_lage as ProspektLage) || (riktiga.length > 0 ? 'kund' : 'prospekt');
    return { ...k, antalBokningar: riktiga.length, senasteBokning: senaste, lage: lage };
  });

  const attFoljaUpp = alla.filter(function(k: any) { return k.uppfoljning_datum && k.uppfoljning_datum <= idag && k.lage !== 'avslutad'; });
  const lista = alla
    .filter(function(k: any) { return visaAvslutade || k.lage !== 'avslutad'; })
    .sort(function(a: any, b: any) {
      const la = LAGE_ORDNING[a.lage] ?? 9;
      const lb = LAGE_ORDNING[b.lage] ?? 9;
      if (la !== lb) return la - lb;
      return String(a.foretagsnamn || '').localeCompare(String(b.foretagsnamn || ''), 'sv');
    });

  const antalPerLage: Record<string, number> = {};
  alla.forEach(function(k: any) { antalPerLage[k.lage] = (antalPerLage[k.lage] || 0) + 1; });

  return (
    <>
      <div className="flex justify-between items-end mb-6 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">
            {PROSPEKT_LAGEN.map(function(l) { return `${antalPerLage[l.kod] || 0} ${l.label.toLowerCase()}`; }).join(' · ')}
          </div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Företag</h1>
        </div>
        <a href="#nytt-prospekt" className="btn">+ Nytt prospekt</a>
      </div>

      {sp.fel && (
        <div className="bg-white border border-accent rounded-sm p-4 text-sm text-accent mb-6">
          Sparades inte: {sp.fel}
        </div>
      )}

      {migrationSaknas && (
        <div className="bg-white border border-accent rounded-sm p-4 text-sm text-accent mb-6">
          Databasen saknar fälten för prospekt. Kör migration 0012_forfragningar_prospekt i Supabase SQL Editor, sedan fungerar sidan.
        </div>
      )}

      <p className="text-sm text-ink-muted mb-8 max-w-[640px]">
        Företagskunder och prospekt på ett ställe. Sätt nästa steg och ett datum, så dyker företaget upp på dashboarden när det är dags att höra av sig. Läget flyttar du själv: prospekt, kontaktad, offert skickad, kund eller avslutad.
      </p>

      {attFoljaUpp.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-serif mb-1">Att följa upp</h2>
          <p className="text-ink-muted text-[13px] mb-5">Uppföljningsdatumet har passerat eller är i dag.</p>
          <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr><Th>Datum</Th><Th>Företag</Th><Th>Läge</Th><Th>Nästa steg</Th><Th /></tr>
              </thead>
              <tbody>
                {attFoljaUpp.map(function(k: any) {
                  return (
                    <tr key={k.id} className="border-b border-line-soft last:border-0 hover:bg-bg">
                      <Td className="font-mono text-[12px] text-accent whitespace-nowrap">{formatDatum(k.uppfoljning_datum)}</Td>
                      <Td className="font-serif text-[17px]"><Link href={`/admin/kunder/${k.id}`}>{k.foretagsnamn}</Link></Td>
                      <Td><span className="pill text-ink-muted">{PROSPEKT_LABELS[k.lage as ProspektLage]}</span></Td>
                      <Td className="text-ink-muted">{k.nasta_steg || '–'}</Td>
                      <Td>
                        <form action={prospektKlar} className="flex justify-end">
                          <input type="hidden" name="id" value={k.id} />
                          <button type="submit" className="text-[11px] px-2.5 py-1 border border-line-soft rounded-sm hover:border-ink hover:bg-bg whitespace-nowrap">Gjort</button>
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
            <h2 className="text-2xl font-serif mb-1">Alla företag</h2>
            <p className="text-ink-muted text-[13px]">Ändra läge, nästa steg eller datum direkt i raden och klicka Spara.</p>
          </div>
          <Link href={visaAvslutade ? '/admin/foretag' : '/admin/foretag?visa=alla'} className="text-sm text-ink-muted hover:text-ink">
            {visaAvslutade ? 'Dölj avslutade' : `Visa avslutade (${antalPerLage.avslutad || 0})`}
          </Link>
        </div>
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          {lista.length === 0 ? (
            <div className="p-10 text-center text-ink-faint text-sm">Inga företag än. Lägg till ett prospekt nedan.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr><Th>Företag</Th><Th>Kontakt</Th><Th>Läge</Th><Th>Nästa steg</Th><Th>Följ upp</Th><Th right>Bokningar</Th><Th /></tr>
              </thead>
              <tbody>
                {lista.map(function(k: any) {
                  const kontakt = k.fornamn && k.fornamn !== k.foretagsnamn ? `${k.fornamn} ${k.efternamn || ''}`.trim() : '';
                  const formId = `prospekt-${k.id}`;
                  return (
                    <tr key={k.id} className="border-b border-line-soft last:border-0 hover:bg-bg align-middle">
                      <Td className="font-serif text-[17px]">
                        <Link href={`/admin/kunder/${k.id}`}>{k.foretagsnamn}</Link>
                        {k.hur_hittade && <div className="text-[11px] text-ink-faint font-sans mt-0.5">{k.hur_hittade}</div>}
                      </Td>
                      <Td className="text-[12.5px] text-ink-muted">
                        {kontakt && <div>{kontakt}</div>}
                        {k.email && <div>{k.email}</div>}
                        {k.telefon && <div>{k.telefon}</div>}
                      </Td>
                      <Td>
                        <select name="prospekt_lage" form={formId} defaultValue={k.lage} className={inputSmall}>
                          {PROSPEKT_LAGEN.map(function(l) { return <option key={l.kod} value={l.kod}>{l.label}</option>; })}
                        </select>
                      </Td>
                      <Td>
                        <input type="text" name="nasta_steg" form={formId} defaultValue={k.nasta_steg || ''} placeholder="t.ex. mejla höstförslag" className={`${inputSmall} min-w-[180px]`} />
                      </Td>
                      <Td>
                        <input type="date" name="uppfoljning_datum" form={formId} defaultValue={k.uppfoljning_datum || ''} className={inputSmall} />
                      </Td>
                      <Td right className="font-mono text-[12.5px] text-ink-muted whitespace-nowrap">
                        {k.antalBokningar > 0 ? `${k.antalBokningar} · senast ${formatDatum(k.senasteBokning)}` : '–'}
                      </Td>
                      <Td>
                        <form id={formId} action={uppdateraProspekt} className="flex justify-end">
                          <input type="hidden" name="id" value={k.id} />
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

      <section id="nytt-prospekt" className="mb-12">
        <h2 className="text-2xl font-serif mb-1">Nytt prospekt</h2>
        <p className="text-ink-muted text-[13px] mb-5">Ett företag du vill jobba med. Bara företagsnamnet krävs, resten fyller du på när du har det. När företaget bokar lägger du bokningen som vanligt under Ny bokning på samma kund.</p>
        <form action={skapaProspekt} className="bg-white border border-line-soft rounded-sm p-6 space-y-5 max-w-3xl">
          <Row>
            <Field label="Företagsnamn" kravs>
              <input type="text" name="foretagsnamn" className={inputStyle} required />
            </Field>
            <Field label="Källa (hur du hittade dem eller de dig)">
              <input type="text" name="hur_hittade" className={inputStyle} placeholder="t.ex. LinkedIn, mässa, rekommendation" />
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
          <Row>
            <Field label="Email">
              <input type="email" name="email" className={inputStyle} />
            </Field>
            <Field label="Telefon">
              <input type="tel" name="telefon" className={inputStyle} />
            </Field>
          </Row>
          <Row>
            <Field label="Läge">
              <select name="prospekt_lage" defaultValue="prospekt" className={inputStyle}>
                {PROSPEKT_LAGEN.map(function(l) { return <option key={l.kod} value={l.kod}>{l.label}</option>; })}
              </select>
            </Field>
            <Field label="Följ upp senast">
              <input type="date" name="uppfoljning_datum" className={inputStyle} />
            </Field>
          </Row>
          <Field label="Nästa steg">
            <input type="text" name="nasta_steg" className={inputStyle} placeholder="t.ex. skicka portfolio och prisförslag" />
          </Field>
          <Field label="Anteckning">
            <textarea name="korta_anteckningar" rows={3} className={`${inputStyle} resize-y`} placeholder="Vad de gör, varför de passar, vem du pratat med" />
          </Field>
          <div className="flex justify-end pt-2">
            <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">Spara prospekt</button>
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
