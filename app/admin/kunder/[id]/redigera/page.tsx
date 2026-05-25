import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { updateKund } from '../../../bokningar/actions';

export default async function RedigeraKundPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  const supabase = await createClient();

  const { data: kund } = await supabase
    .from('kunder')
    .select('*')
    .eq('id', id)
    .single();

  if (!kund) notFound();

  const kundNamn = kund.foretagsnamn || `${kund.fornamn} ${kund.efternamn || ''}`.trim();

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">
          <Link href={`/admin/kunder/${kund.id}`} className="hover:underline">{kundNamn}</Link>
          {' / Redigera'}
        </div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Redigera kund</h1>
      </div>

      <form action={updateKund} className="space-y-8 max-w-3xl">
        <input type="hidden" name="id" value={kund.id} />

        <Section title="Privatperson">
          <Row>
            <Field label="Förnamn">
              <input type="text" name="fornamn" defaultValue={kund.fornamn || ''} className={inputStyle} required />
            </Field>
            <Field label="Efternamn">
              <input type="text" name="efternamn" defaultValue={kund.efternamn || ''} className={inputStyle} />
            </Field>
          </Row>
        </Section>

        <Section title="Företag (om relevant)">
          <Field label="Företagsnamn">
            <input type="text" name="foretagsnamn" defaultValue={kund.foretagsnamn || ''} className={inputStyle} placeholder="Lämna tomt för privatkund" />
          </Field>
        </Section>

        <Section title="Kontakt">
          <Row>
            <Field label="Email">
              <input type="email" name="email" defaultValue={kund.email || ''} className={inputStyle} />
            </Field>
            <Field label="Telefon">
              <input type="tel" name="telefon" defaultValue={kund.telefon || ''} className={inputStyle} />
            </Field>
          </Row>
        </Section>

        <Section title="Övrigt">
          <Field label="Hur hittade kunden mig">
            <input type="text" name="hur_hittade" defaultValue={kund.hur_hittade || ''} className={inputStyle} placeholder="Instagram, rekommendation, Google..." />
          </Field>
          <Field label="Korta anteckningar">
            <textarea name="korta_anteckningar" defaultValue={kund.korta_anteckningar || ''} rows={4} className={`${inputStyle} resize-y`} />
          </Field>
        </Section>

        <div className="flex justify-between items-center pt-4 border-t border-line">
          <Link href={`/admin/kunder/${kund.id}`} className="text-sm text-ink-muted hover:text-ink">Avbryt</Link>
          <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">
            Spara ändringar
          </button>
        </div>
      </form>
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
