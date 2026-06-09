import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { updateBokning, deleteBokning } from '../../actions';
import { PlatsValjare } from '@/components/PlatsValjare';

const STATUS_LIST: { kod: string; label: string }[] = [
  { kod: 'forfragan', label: 'Förfrågan' },
  { kod: 'bokad', label: 'Bokad' },
  { kod: 'avtal_skickat', label: 'Avtal skickat' },
  { kod: 'signat', label: 'Signat' },
  { kod: 'fotograferad', label: 'Fotograferad' },
  { kod: 'paket_att_valja', label: 'Paket att välja' },
  { kod: 'levererat', label: 'Levererat' },
  { kod: 'betald', label: 'Betald' },
  { kod: 'klar', label: 'Klar' },
  { kod: 'avbokad', label: 'Avbokad' },
];

export default async function RedigeraBokningPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  const supabase = await createClient();

  const { data: bokning } = await supabase
    .from('bokningar')
    .select('*, kund:kunder(id, fornamn, efternamn, foretagsnamn)')
    .eq('id', id)
    .single();

  if (!bokning) notFound();

  const { data: typer } = await supabase
    .from('fotograferingstyper')
    .select('id, namn')
    .order('ordning');

  const { data: paketLista } = await supabase
    .from('bildpaket')
    .select('namn, pris_kr')
    .order('ordning');

  const { data: platserRaw } = await supabase
    .from('platser')
    .select('id, namn, avstand_km_enkel')
    .eq('aktiv', true)
    .order('namn');
  const platser = (platserRaw || []).map((p: any) => ({
    id: p.id,
    namn: p.namn,
    avstand_km_enkel: p.avstand_km_enkel,
  }));

  const kund = bokning.kund;
  const kundNamn = kund.foretagsnamn || `${kund.fornamn} ${kund.efternamn || ''}`.trim();

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">
          <Link href={`/admin/kunder/${kund.id}`} className="hover:underline">
            {kundNamn}
          </Link>
          {' / Redigera bokning'}
        </div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Redigera bokning</h1>
      </div>

      <form action={updateBokning} className="space-y-8 max-w-3xl">
        <input type="hidden" name="id" value={bokning.id} />
        <input type="hidden" name="kund_id" value={kund.id} />

        <Section title="Tid och plats">
          <Row>
            <Field label="Datum">
              <input type="date" name="datum" defaultValue={bokning.datum || ''} className={inputStyle} />
            </Field>
            <Field label="Tid">
              <input type="time" name="tid" defaultValue={bokning.tid || ''} className={inputStyle} />
            </Field>
          </Row>
          <PlatsValjare
            platser={platser}
            initialPlatsId={bokning.plats_id}
            initialPlats={bokning.plats || ''}
            initialAdress={bokning.adress || ''}
            initialAvstandKmEnkel={bokning.avstand_km_enkel != null ? Number(bokning.avstand_km_enkel) : null}
          />
        </Section>

        <Section title="Typ och status">
          <Row>
            <Field label="Fotograferingstyp">
              <select name="fotograferingstyp_id" defaultValue={bokning.fotograferingstyp_id || ''} className={inputStyle}>
                <option value="">Välj typ</option>
                {(typer || []).map(function(t) {
                  return <option key={t.id} value={t.id}>{t.namn}</option>;
                })}
              </select>
            </Field>
            <Field label="Status">
              <select name="status" defaultValue={bokning.status} className={inputStyle}>
                {STATUS_LIST.map(function(s) {
                  return <option key={s.kod} value={s.kod}>{s.label}</option>;
                })}
              </select>
            </Field>
          </Row>
        </Section>

        <Section title="Bokningsavgift">
          <Row>
            <Field label="Bokningsavgift (kr)">
              <input type="number" name="bokningsavgift_kr" defaultValue={bokning.bokningsavgift_kr || ''} className={inputStyle} placeholder="2000" />
            </Field>
            <Field label="Betald">
              <label className="flex items-center gap-2 h-[42px]">
                <input type="checkbox" name="bokningsavgift_betald" defaultChecked={!!bokning.bokningsavgift_betald} className="w-4 h-4" />
                <span className="text-sm text-ink-muted">Markera som betald</span>
              </label>
            </Field>
          </Row>
        </Section>

        <Section title="Bildpaket">
          <Row>
            <Field label="Paket">
              <select name="bildpaket_namn" defaultValue={bokning.bildpaket_namn || ''} className={inputStyle}>
                <option value="">Inget paket valt än</option>
                {(paketLista || []).map(function(p, i) {
                  return <option key={i} value={p.namn}>{p.namn} ({p.pris_kr.toLocaleString('sv-SE')} kr)</option>;
                })}
              </select>
            </Field>
            <Field label="Pris (kr)">
              <input type="number" name="bildpaket_kr" defaultValue={bokning.bildpaket_kr || ''} className={inputStyle} placeholder="t.ex. 5000" />
            </Field>
          </Row>
          <Row>
            <Field label="Betald">
              <label className="flex items-center gap-2 h-[42px]">
                <input type="checkbox" name="bildpaket_betald" defaultChecked={!!bokning.bildpaket_betald} className="w-4 h-4" />
                <span className="text-sm text-ink-muted">Markera som betald</span>
              </label>
            </Field>
            <div />
          </Row>
        </Section>

        <Section title="Övrigt">
          <Field label="Visma fakturanummer">
            <input type="text" name="visma_fakturanr" defaultValue={bokning.visma_fakturanr || ''} className={inputStyle} />
          </Field>
          <Field label="Intern anteckning">
            <textarea name="intern_anteckning" defaultValue={bokning.intern_anteckning || ''} rows={4} className={`${inputStyle} resize-y`} />
          </Field>
        </Section>

        <div className="flex justify-between items-center pt-4 border-t border-line">
          <Link href={`/admin/kunder/${kund.id}`} className="text-sm text-ink-muted hover:text-ink">
            Avbryt
          </Link>
          <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">
            Spara ändringar
          </button>
        </div>
      </form>

      <div className="mt-16 pt-6 border-t border-line max-w-3xl">
        <div className="eyebrow mb-3 text-danger">Farlig zon</div>
        <form action={deleteBokning} className="flex items-center justify-between">
          <input type="hidden" name="id" value={bokning.id} />
          <input type="hidden" name="kund_id" value={kund.id} />
          <p className="text-sm text-ink-muted">Raderar bokningen permanent. Kan inte ångras.</p>
          <button type="submit" className="px-4 py-2 border border-danger text-danger text-sm rounded-sm hover:bg-danger hover:text-bg transition-colors">
            Radera bokning
          </button>
        </form>
      </div>
    </>
  );
}

const inputStyle = 'w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink';

function Section(props: { title: string; children: any }) {
  return (
    <div className="bg-white border border-line-soft rounded-sm p-6">
      <div className="eyebrow mb-5">{props.title}</div>
      <div className="space-y-5">{props.children}</div>
    </div>
  );
}

function Row(props: { children: any }) {
  return <div className="grid grid-cols-2 gap-5">{props.children}</div>;
}

function Field(props: { label: string; children: any }) {
  return (
    <div>
      <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">{props.label}</label>
      {props.children}
    </div>
  );
}
