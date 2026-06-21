import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  uppdateraKonferens,
  skapaTalare, raderaTalare, togglaTalareCheck, uppdateraTalareArvode, uppdateraTalareKontakt,
  skapaDeltagare, raderaDeltagare, togglaBetaldDeltagare,
  skapaSponsor, raderaSponsor,
  skapaUppgift, togglaUppgift, raderaUppgift,
  skapaSchemapost, raderaSchemapost,
} from './actions';

const FLIK_NAMN: Record<string, string> = {
  oversikt: 'Översikt',
  talare: 'Talare',
  deltagare: 'Deltagare',
  uppgifter: 'Att göra',
  sponsorer: 'Sponsorer',
  schema: 'Schema',
};
const FLIKAR = Object.keys(FLIK_NAMN);

const BILJETT_LABEL: Record<string, string> = {
  forst_till_kvarn: 'Först till kvarn',
  boka_tidigt: 'Boka tidigt',
  ordinarie: 'Ordinarie',
};

const STATUS_LABEL: Record<string, string> = {
  kontaktad: 'Kontaktad',
  bokad: 'Bokad',
  betald: 'Betald',
  klar: 'Klar',
  pendlar: 'Inväntar svar',
};

export default async function FamPage(props: { searchParams?: Promise<{ ar?: string; vy?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};
  const aktuelltAr = new Date().getFullYear();
  const valtAr = sp.ar ? parseInt(sp.ar, 10) : aktuelltAr;
  const vy = sp.vy && FLIKAR.includes(sp.vy) ? sp.vy : 'oversikt';

  const { data: konferenser } = await supabase
    .from('fam_konferenser')
    .select('*')
    .order('ar', { ascending: false });
  const arsList = (konferenser || []).map((k: any) => k.ar);

  let konf: any = (konferenser || []).find((k: any) => k.ar === valtAr);
  if (!konf && konferenser && konferenser.length > 0) konf = konferenser[0];

  const { data: talare } = konf ? await supabase
    .from('fam_talare')
    .select('*')
    .eq('konferens_id', konf.id)
    .order('namn') : { data: [] };

  const { data: deltagare } = konf ? await supabase
    .from('fam_deltagare')
    .select('*')
    .eq('konferens_id', konf.id)
    .order('namn') : { data: [] };

  const { data: sponsorer } = konf ? await supabase
    .from('fam_sponsorer')
    .select('*')
    .eq('konferens_id', konf.id)
    .order('namn') : { data: [] };

  const { data: uppgifter } = konf ? await supabase
    .from('fam_uppgifter')
    .select('*')
    .eq('konferens_id', konf.id)
    .order('klar', { ascending: true })
    .order('deadline', { ascending: true, nullsFirst: false }) : { data: [] };

  const { data: schemaposter } = konf ? await supabase
    .from('fam_schema')
    .select('*, talare:fam_talare(namn)')
    .eq('konferens_id', konf.id)
    .order('start_tid') : { data: [] };

  // Återkommande deltagare: hämta alla deltagare för Annas konto och räkna förekomster per email
  const { data: alla_deltagare } = await supabase
    .from('fam_deltagare')
    .select('email, konferens_id');
  const aterkommandeMap: Record<string, number> = {};
  for (const d of alla_deltagare || []) {
    if (d.email) {
      const k = d.email.toLowerCase();
      aterkommandeMap[k] = (aterkommandeMap[k] || 0) + 1;
    }
  }

  // KPI:er
  const antalDeltagare = (deltagare || []).length;
  const antalBetalda = (deltagare || []).filter((d: any) => d.betald).length;
  const totalIntakt = (deltagare || []).filter((d: any) => d.betald).reduce((s: number, d: any) => s + (d.pris || 0), 0);
  const antalTalare = (talare || []).length;
  const antalSponsorer = (sponsorer || []).length;
  const sponsorIntakt = (sponsorer || []).reduce((s: number, sp: any) => s + (sp.belopp || 0), 0);
  const antalUppgifter = (uppgifter || []).length;
  const klaraUppgifter = (uppgifter || []).filter((u: any) => u.klar).length;
  const dagarTillEvent = konf?.datum ? Math.ceil((new Date(konf.datum).getTime() - Date.now()) / 86400000) : null;

  return (
    <>
      <div className="mb-8 pb-6 border-b border-line">
        <div className="flex justify-between items-end">
          <div>
            <div className="eyebrow mb-1.5">FAM · Family and Meetings</div>
            <h1 className="font-serif text-[42px] font-light leading-tight">FAM {valtAr}</h1>
            {konf?.datum && (
              <p className="text-sm text-ink-muted mt-2">
                {new Date(konf.datum).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {konf.plats && ` · ${konf.plats}`}
                {dagarTillEvent !== null && dagarTillEvent > 0 && ` · ${dagarTillEvent} dagar kvar`}
                {dagarTillEvent !== null && dagarTillEvent < 0 && ` · genomförd`}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint">År:</span>
            {arsList.map((a: number) => (
              <Link key={a} href={`/admin/fam?ar=${a}&vy=${vy}`} className={`px-3 py-1.5 text-sm rounded-sm ${a === valtAr ? 'bg-ink text-bg' : 'bg-white border border-line-soft hover:border-ink'}`}>
                {a}
              </Link>
            ))}
            <NyttArForm />
          </div>
        </div>
      </div>

      {/* Flikar */}
      <div className="flex gap-1 mb-8 border-b border-line">
        {FLIKAR.map(f => (
          <Link key={f} href={`/admin/fam?ar=${valtAr}&vy=${f}`} className={`px-4 py-2.5 text-sm rounded-t-sm border-b-2 transition-colors ${vy === f ? 'border-ink text-ink font-medium' : 'border-transparent text-ink-muted hover:text-ink'}`}>
            {FLIK_NAMN[f]}
          </Link>
        ))}
      </div>

      {konf == null ? (
        <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted">
          <p className="font-serif text-xl mb-2 text-ink">Ingen konferens för {valtAr}</p>
          <p className="text-sm">Lägg till år ovan så börjar vi.</p>
        </div>
      ) : vy === 'oversikt' ? (
        <Oversikt konf={konf} antalDeltagare={antalDeltagare} antalBetalda={antalBetalda} totalIntakt={totalIntakt} antalTalare={antalTalare} antalSponsorer={antalSponsorer} sponsorIntakt={sponsorIntakt} antalUppgifter={antalUppgifter} klaraUppgifter={klaraUppgifter} />
      ) : vy === 'talare' ? (
        <Talare valtAr={valtAr} talare={talare || []} />
      ) : vy === 'deltagare' ? (
        <Deltagare valtAr={valtAr} deltagare={deltagare || []} konf={konf} aterkommandeMap={aterkommandeMap} />
      ) : vy === 'sponsorer' ? (
        <Sponsorer valtAr={valtAr} sponsorer={sponsorer || []} />
      ) : vy === 'uppgifter' ? (
        <Uppgifter valtAr={valtAr} uppgifter={uppgifter || []} />
      ) : vy === 'schema' ? (
        <Schema valtAr={valtAr} schemaposter={schemaposter || []} talare={talare || []} />
      ) : null}
    </>
  );
}

/* ============ KOMPONENTER ============ */

function NyttArForm() {
  return (
    <form action={async function(formData: FormData) {
      'use server';
      const ar = Number(formData.get('ar') || 0);
      if (!ar) return;
      const supabase = await (await import('@/lib/supabase/server')).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('fam_konferenser').insert({ user_id: user.id, ar }).select();
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/admin/fam');
    }} className="inline-flex gap-1 items-center">
      <input type="number" name="ar" placeholder="2027" min="2020" max="2099" className="w-20 px-2 py-1.5 text-sm border border-line-soft rounded-sm" />
      <button type="submit" className="text-sm px-3 py-1.5 bg-white border border-line-soft rounded-sm hover:border-ink">+ år</button>
    </form>
  );
}

function Oversikt(props: any) {
  const { konf, antalDeltagare, antalBetalda, totalIntakt, antalTalare, antalSponsorer, sponsorIntakt, antalUppgifter, klaraUppgifter } = props;
  const fyllnadgrad = konf.antal_platser ? Math.round((antalDeltagare / konf.antal_platser) * 100) : 0;
  const marginal = (totalIntakt + sponsorIntakt) - (konf.budget_kostnader || 0);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-4">
        <Kpi label="Deltagare" value={`${antalDeltagare} / ${konf.antal_platser || '?'}`} sub={`${fyllnadgrad}% fyllt`} />
        <Kpi label="Betalt" value={`${antalBetalda} st`} sub={`${(antalDeltagare - antalBetalda)} obetalda`} />
        <Kpi label="Intäkt biljetter" value={`${totalIntakt.toLocaleString('sv-SE')} kr`} sub="betalda biljetter" />
        <Kpi label="Sponsring" value={`${sponsorIntakt.toLocaleString('sv-SE')} kr`} sub={`${antalSponsorer} sponsorer`} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Kpi label="Talare" value={`${antalTalare} st`} sub="bokade till FAM" />
        <Kpi label="Uppgifter" value={`${klaraUppgifter} / ${antalUppgifter}`} sub="klara av totalt" />
        <Kpi label="Kostnader" value={`${(konf.budget_kostnader || 0).toLocaleString('sv-SE')} kr`} sub="budgeterat" />
        <Kpi label={marginal >= 0 ? 'Marginal' : 'Underskott'} value={`${Math.abs(marginal).toLocaleString('sv-SE')} kr`} sub={marginal >= 0 ? 'intäkt minus kostnad' : 'kostnad större än intäkt'} />
      </div>

      <section className="bg-white border border-line-soft rounded-sm p-6">
        <div className="eyebrow mb-4">Konferensinställningar för {konf.ar}</div>
        <form action={uppdateraKonferens} className="grid grid-cols-3 gap-4">
          <input type="hidden" name="ar" value={konf.ar} />
          <Fld label="Datum"><input type="date" name="datum" defaultValue={konf.datum || ''} className={iSty} /></Fld>
          <Fld label="Plats / lokal"><input type="text" name="plats" defaultValue={konf.plats || ''} className={iSty} /></Fld>
          <Fld label="Antal platser"><input type="number" name="antal_platser" defaultValue={konf.antal_platser || 60} className={iSty} /></Fld>
          <Fld label="Pris först till kvarn (kr ex moms)"><input type="number" name="pris_forst_till_kvarn" defaultValue={konf.pris_forst_till_kvarn} className={iSty} /></Fld>
          <Fld label="Pris boka tidigt (kr ex moms)"><input type="number" name="pris_boka_tidigt" defaultValue={konf.pris_boka_tidigt} className={iSty} /></Fld>
          <Fld label="Pris ordinarie (kr ex moms)"><input type="number" name="pris_ordinarie" defaultValue={konf.pris_ordinarie} className={iSty} /></Fld>
          <Fld label="Budgeterade kostnader (kr)"><input type="number" name="budget_kostnader" defaultValue={konf.budget_kostnader || 0} className={iSty} /></Fld>
          <Fld label="Budgeterade intäkter (kr)"><input type="number" name="budget_intakter" defaultValue={konf.budget_intakter || 0} className={iSty} /></Fld>
          <div />
          <div className="col-span-3">
            <Fld label="Anteckning"><textarea name="anteckning" rows={3} defaultValue={konf.anteckning || ''} className={iSty + ' resize-y'} /></Fld>
          </div>
          <div className="col-span-3 flex justify-end">
            <button type="submit" className="px-5 py-2 bg-ink text-bg text-sm rounded-sm">Spara</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Talare(props: { valtAr: number; talare: any[] }) {
  const { valtAr, talare } = props;
  return (
    <div className="space-y-6">
      <section className="bg-white border border-line-soft rounded-sm p-5">
        <div className="eyebrow mb-3">Lägg till talare</div>
        <form action={skapaTalare} className="grid grid-cols-[1.2fr_1.5fr_1fr_1fr_120px_auto] gap-2 items-end">
          <input type="hidden" name="ar" value={valtAr} />
          <Fld label="Namn"><input type="text" name="namn" required className={iSty} /></Fld>
          <Fld label="Föreläsningstitel"><input type="text" name="forelasning_titel" className={iSty} /></Fld>
          <Fld label="Hemsida"><input type="text" name="hemsida" placeholder="annas.com" className={iSty} /></Fld>
          <Fld label="Email"><input type="email" name="email" className={iSty} /></Fld>
          <Fld label="Status"><select name="status" defaultValue="kontaktad" className={iSty + ' bg-white'}>
            <option value="kontaktad">Kontaktad</option>
            <option value="pendlar">Inväntar svar</option>
            <option value="bokad">Bokad</option>
            <option value="klar">Klar</option>
          </select></Fld>
          <button type="submit" className="px-4 py-2 bg-ink text-bg text-sm rounded-sm">+ Lägg till</button>
        </form>
      </section>

      {talare.length === 0 ? (
        <Tom text="Inga talare ännu" />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {talare.map((t: any) => <TalareKort key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}

function TalareKort({ t }: { t: any }) {
  const klart = (t.utkast_skickat ? 1 : 0) + (t.presentation_skickad ? 1 : 0) + (t.fakturerad ? 1 : 0);
  return (
    <div className="bg-white border border-line-soft rounded-sm p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-serif text-[20px] leading-tight">{t.namn}</div>
          {t.forelasning_titel && <div className="text-[13px] text-ink-muted mt-1">{t.forelasning_titel}</div>}
        </div>
        <form action={raderaTalare}>
          <input type="hidden" name="id" value={t.id} />
          <button type="submit" className="text-ink-faint hover:text-danger text-sm">×</button>
        </form>
      </div>

      {t.amne && <p className="text-[12.5px] text-ink-muted mb-4 leading-relaxed">{t.amne}</p>}

      <div className="grid grid-cols-2 gap-3 mb-4 text-[12px]">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-faint mb-0.5">Hemsida</div>
          {t.hemsida ? <a href={t.hemsida.startsWith('http') ? t.hemsida : `https://${t.hemsida}`} target="_blank" rel="noreferrer" className="text-accent hover:underline font-mono text-[12px]">{t.hemsida}</a> : <span className="text-ink-faint">tom</span>}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-faint mb-0.5">Status</div>
          <span className="font-medium">{STATUS_LABEL[t.status] || t.status}</span>
        </div>
      </div>

      <form action={uppdateraTalareKontakt} className="grid grid-cols-2 gap-2 mb-3">
        <input type="hidden" name="id" value={t.id} />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-faint mb-0.5">Email</div>
          <input type="email" name="email" defaultValue={t.email || ''} placeholder="namn@email.se" className={iSty + ' text-[12px]'} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-faint mb-0.5">Telefon</div>
          <input type="text" name="telefon" defaultValue={t.telefon || ''} placeholder="070..." className={iSty + ' text-[12px]'} />
        </div>
        <div className="col-span-2 flex justify-end">
          <button type="submit" className="text-[11px] px-2 py-1 text-ink-muted hover:text-ink border border-line-soft rounded-sm">Spara kontakt</button>
        </div>
      </form>

      <form action={uppdateraTalareArvode} className="flex items-end gap-2 mb-4">
        <input type="hidden" name="id" value={t.id} />
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider text-ink-faint mb-0.5">Arvode (kr ex moms)</div>
          <input type="number" name="arvode" defaultValue={t.arvode || ''} placeholder="2500" className={iSty + ' text-[12px]'} />
        </div>
        <button type="submit" className="text-[11px] px-2 py-1.5 text-ink-muted hover:text-ink border border-line-soft rounded-sm">Spara</button>
      </form>

      <div className="border-t border-line-soft pt-3">
        <div className="flex justify-between items-center mb-2">
          <div className="eyebrow text-[10px]">Förberedelse</div>
          <div className="text-[11px] font-mono text-ink-faint">{klart} / 3</div>
        </div>
        <div className="space-y-1.5">
          <TalareBock id={t.id} field="utkast_skickat" checked={!!t.utkast_skickat} label="Skicka in utkast av presentation" />
          <TalareBock id={t.id} field="presentation_skickad" checked={!!t.presentation_skickad} label="Skicka in presentationen" />
          <TalareBock id={t.id} field="fakturerad" checked={!!t.fakturerad} label={`Fakturera mig${t.arvode ? ` ${t.arvode.toLocaleString('sv-SE')} kr ex moms` : ''}`} />
        </div>
      </div>
    </div>
  );
}

function TalareBock({ id, field, checked, label }: { id: string; field: string; checked: boolean; label: string }) {
  return (
    <form action={togglaTalareCheck} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <button type="submit" className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center text-[10px] ${checked ? 'bg-ink border-ink text-bg' : 'border-line bg-white'}`}>
        {checked ? '✓' : ''}
      </button>
      <span className={`text-[12.5px] ${checked ? 'line-through text-ink-faint' : 'text-ink'}`}>{label}</span>
    </form>
  );
}

function Deltagare(props: { valtAr: number; deltagare: any[]; konf: any; aterkommandeMap: Record<string, number> }) {
  const { valtAr, deltagare, konf, aterkommandeMap } = props;
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-ink-muted">
          {deltagare.length} av {konf.antal_platser || '?'} platser
        </div>
        <a href={`/admin/fam/export?ar=${valtAr}&typ=deltagare`} className="text-sm px-4 py-2 border border-line-soft rounded-sm hover:border-ink">Exportera CSV</a>
      </div>

      <section className="bg-white border border-line-soft rounded-sm p-5">
        <div className="eyebrow mb-3">Lägg till deltagare</div>
        <form action={skapaDeltagare} className="grid grid-cols-[1.5fr_1.5fr_1fr_140px_120px_auto] gap-2 items-end">
          <input type="hidden" name="ar" value={valtAr} />
          <Fld label="Namn"><input type="text" name="namn" required className={iSty} /></Fld>
          <Fld label="Email"><input type="email" name="email" className={iSty} /></Fld>
          <Fld label="Telefon"><input type="text" name="telefon" className={iSty} /></Fld>
          <Fld label="Biljettyp"><select name="biljettyp" defaultValue="ordinarie" className={iSty + ' bg-white'}>
            <option value="forst_till_kvarn">Först till kvarn</option>
            <option value="boka_tidigt">Boka tidigt</option>
            <option value="ordinarie">Ordinarie</option>
          </select></Fld>
          <Fld label="Betald"><label className="flex items-center gap-2 mt-1 text-sm"><input type="checkbox" name="betald" className="w-4 h-4" /> Ja</label></Fld>
          <button type="submit" className="px-4 py-2 bg-ink text-bg text-sm rounded-sm">+ Lägg till</button>
        </form>
      </section>

      {deltagare.length === 0 ? (
        <Tom text="Inga deltagare ännu" />
      ) : (
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle text-left">
              <tr>
                <Th>Namn</Th><Th>Email</Th><Th>Hemsida</Th><Th>Biljett</Th><Th>Pris</Th><Th>Betald</Th><Th>Allergier</Th><Th />
              </tr>
            </thead>
            <tbody>
              {deltagare.map((d: any) => {
                const ater = d.email ? (aterkommandeMap[d.email.toLowerCase()] || 0) : 0;
                return (
                  <tr key={d.id} className="border-t border-line-soft hover:bg-bg/40">
                    <Td><div className="font-medium">{d.namn}{ater > 1 && <span title={`Återkommande (${ater} år)`} className="ml-1.5 text-accent">★</span>}</div></Td>
                    <Td className="font-mono text-[12px]">{d.email || '—'}</Td>
                    <Td>{d.fotograf_hemsida ? <a href={d.fotograf_hemsida.startsWith('http') ? d.fotograf_hemsida : `https://${d.fotograf_hemsida}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">{d.fotograf_hemsida}</a> : '—'}</Td>
                    <Td>{BILJETT_LABEL[d.biljettyp] || d.biljettyp}</Td>
                    <Td>{d.pris ? `${d.pris.toLocaleString('sv-SE')} kr` : '—'}</Td>
                    <Td>
                      <form action={togglaBetaldDeltagare} className="inline">
                        <input type="hidden" name="id" value={d.id} />
                        <button type="submit" className={`px-2 py-0.5 text-[11px] rounded-sm ${d.betald ? 'bg-positive/10 text-positive' : 'bg-bg-subtle text-ink-muted'}`}>
                          {d.betald ? 'Betald' : 'Obetald'}
                        </button>
                      </form>
                    </Td>
                    <Td className="text-[12px]">{d.allergier || '—'}</Td>
                    <Td>
                      <form action={raderaDeltagare}>
                        <input type="hidden" name="id" value={d.id} />
                        <button type="submit" className="text-ink-faint hover:text-danger text-sm">×</button>
                      </form>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Sponsorer(props: { valtAr: number; sponsorer: any[] }) {
  const { valtAr, sponsorer } = props;
  return (
    <div className="space-y-6">
      <section className="bg-white border border-line-soft rounded-sm p-5">
        <div className="eyebrow mb-3">Lägg till sponsor</div>
        <form action={skapaSponsor} className="grid grid-cols-[1.2fr_1.2fr_1.2fr_100px_120px_auto] gap-2 items-end">
          <input type="hidden" name="ar" value={valtAr} />
          <Fld label="Företag"><input type="text" name="namn" required className={iSty} /></Fld>
          <Fld label="Kontaktperson"><input type="text" name="kontaktperson" className={iSty} /></Fld>
          <Fld label="Email"><input type="email" name="email" className={iSty} /></Fld>
          <Fld label="Belopp (kr)"><input type="number" name="belopp" className={iSty} /></Fld>
          <Fld label="Status"><select name="status" defaultValue="kontaktad" className={iSty + ' bg-white'}>
            <option value="kontaktad">Kontaktad</option>
            <option value="pendlar">Inväntar svar</option>
            <option value="bokad">Bokad</option>
            <option value="betald">Betald</option>
          </select></Fld>
          <button type="submit" className="px-4 py-2 bg-ink text-bg text-sm rounded-sm">+ Lägg till</button>
        </form>
      </section>

      {sponsorer.length === 0 ? <Tom text="Inga sponsorer ännu" /> : (
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle text-left">
              <tr><Th>Företag</Th><Th>Kontakt</Th><Th>Belopp</Th><Th>Motprestation</Th><Th>Status</Th><Th /></tr>
            </thead>
            <tbody>
              {sponsorer.map((s: any) => (
                <tr key={s.id} className="border-t border-line-soft hover:bg-bg/40">
                  <Td><div className="font-medium">{s.namn}</div></Td>
                  <Td>{s.kontaktperson || '—'}<div className="text-[11px] text-ink-muted font-mono">{s.email}</div></Td>
                  <Td>{s.belopp ? `${s.belopp.toLocaleString('sv-SE')} kr` : '—'}</Td>
                  <Td className="text-[12px] text-ink-muted">{s.motprestation || '—'}</Td>
                  <Td>{STATUS_LABEL[s.status] || s.status}</Td>
                  <Td><form action={raderaSponsor}><input type="hidden" name="id" value={s.id} /><button type="submit" className="text-ink-faint hover:text-danger text-sm">×</button></form></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Uppgifter(props: { valtAr: number; uppgifter: any[] }) {
  const { valtAr, uppgifter } = props;
  return (
    <div className="space-y-6">
      <section className="bg-white border border-line-soft rounded-sm p-5">
        <div className="eyebrow mb-3">Lägg till uppgift</div>
        <form action={skapaUppgift} className="grid grid-cols-[2fr_140px_120px_140px_auto] gap-2 items-end">
          <input type="hidden" name="ar" value={valtAr} />
          <Fld label="Titel"><input type="text" name="titel" required className={iSty} /></Fld>
          <Fld label="Kategori"><input type="text" name="kategori" placeholder="t.ex. Lokal, Mat" className={iSty} /></Fld>
          <Fld label="Prioritet"><select name="prioritet" defaultValue="normal" className={iSty + ' bg-white'}>
            <option value="hog">Hög</option><option value="normal">Normal</option><option value="lag">Låg</option>
          </select></Fld>
          <Fld label="Deadline"><input type="date" name="deadline" className={iSty} /></Fld>
          <button type="submit" className="px-4 py-2 bg-ink text-bg text-sm rounded-sm">+ Lägg till</button>
        </form>
      </section>

      {uppgifter.length === 0 ? <Tom text="Inga uppgifter ännu" /> : (
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          {uppgifter.map((u: any) => (
            <div key={u.id} className={`grid grid-cols-[30px_1fr_120px_100px_100px_30px] gap-3 items-center px-4 py-3 border-b border-line-soft last:border-0 ${u.klar ? 'opacity-60' : ''}`}>
              <form action={togglaUppgift}><input type="hidden" name="id" value={u.id} /><button type="submit" className={`w-5 h-5 border-2 rounded-sm ${u.klar ? 'bg-ink border-ink text-bg' : 'border-line'}`}>{u.klar ? '✓' : ''}</button></form>
              <div>
                <div className={`text-sm ${u.klar ? 'line-through' : 'font-medium'}`}>{u.titel}</div>
                {u.beskrivning && <div className="text-[12px] text-ink-muted">{u.beskrivning}</div>}
              </div>
              <div className="text-[12px] text-ink-muted">{u.kategori || ''}</div>
              <div className={`text-[12px] ${u.prioritet === 'hog' ? 'text-danger' : 'text-ink-muted'}`}>{u.prioritet === 'hog' ? 'Hög' : u.prioritet === 'lag' ? 'Låg' : 'Normal'}</div>
              <div className="text-[12px] font-mono">{u.deadline ? new Date(u.deadline).toLocaleDateString('sv-SE') : '—'}</div>
              <form action={raderaUppgift}><input type="hidden" name="id" value={u.id} /><button type="submit" className="text-ink-faint hover:text-danger text-sm">×</button></form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Schema(props: { valtAr: number; schemaposter: any[]; talare: any[] }) {
  const { valtAr, schemaposter, talare } = props;
  return (
    <div className="space-y-6">
      <section className="bg-white border border-line-soft rounded-sm p-5">
        <div className="eyebrow mb-3">Lägg till schemapost</div>
        <form action={skapaSchemapost} className="grid grid-cols-[100px_100px_1.5fr_1fr_100px_auto] gap-2 items-end">
          <input type="hidden" name="ar" value={valtAr} />
          <Fld label="Start"><input type="time" name="start_tid" className={iSty} /></Fld>
          <Fld label="Slut"><input type="time" name="slut_tid" className={iSty} /></Fld>
          <Fld label="Titel"><input type="text" name="titel" required className={iSty} /></Fld>
          <Fld label="Talare"><select name="talare_id" defaultValue="" className={iSty + ' bg-white'}>
            <option value="">Ingen</option>
            {talare.map((t: any) => <option key={t.id} value={t.id}>{t.namn}</option>)}
          </select></Fld>
          <Fld label="Typ"><select name="typ" defaultValue="forelasning" className={iSty + ' bg-white'}>
            <option value="forelasning">Föreläsning</option>
            <option value="paus">Paus</option>
            <option value="lunch">Lunch</option>
            <option value="mingel">Mingel</option>
            <option value="ovrigt">Övrigt</option>
          </select></Fld>
          <button type="submit" className="px-4 py-2 bg-ink text-bg text-sm rounded-sm">+ Lägg till</button>
        </form>
      </section>

      {schemaposter.length === 0 ? <Tom text="Inget schema än" /> : (
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          {schemaposter.map((s: any) => (
            <div key={s.id} className="grid grid-cols-[140px_1fr_140px_30px] gap-3 items-center px-4 py-3 border-b border-line-soft last:border-0">
              <div className="font-mono text-[13px]">{s.start_tid ? s.start_tid.slice(0, 5) : ''}{s.slut_tid && ` – ${s.slut_tid.slice(0, 5)}`}</div>
              <div>
                <div className="text-sm font-medium">{s.titel}</div>
                {s.talare && <div className="text-[12px] text-ink-muted">{s.talare.namn}</div>}
              </div>
              <div className="text-[12px] text-ink-muted">{s.typ}</div>
              <form action={raderaSchemapost}><input type="hidden" name="id" value={s.id} /><button type="submit" className="text-ink-faint hover:text-danger text-sm">×</button></form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const iSty = "w-full px-2.5 py-1.5 border border-line-soft rounded-sm text-sm";

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1">{label}</label>{children}</div>;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-line-soft rounded-sm px-5 py-4">
      <div className="eyebrow mb-2 text-[10px]">{label}</div>
      <div className="font-serif text-[28px] leading-none">{value}</div>
      <div className="text-[11px] text-ink-muted mt-1">{sub}</div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) { return <th className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-faint py-3 px-4 font-medium">{children}</th>; }
function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) { return <td className={`py-3 px-4 align-top ${className}`}>{children}</td>; }
function Tom({ text }: { text: string }) { return <div className="bg-white border border-dashed border-line p-10 rounded-sm text-center text-ink-muted text-sm">{text}</div>; }
