import { createClient } from '@/lib/supabase/server';
import { updateForetag, updatePassword } from './actions';

export default async function InstallningarPage() {
  const supabase = await createClient();

  const { data: foretag } = await supabase
    .from('foretag_installningar')
    .select('*')
    .maybeSingle();

  const f = foretag || {
    foretagsnamn: 'Fotograf Anna Ejemo AB',
    orgnr: '559351-6577',
    email: 'kontakt@fotografannaejemo.se',
    telefon: '',
    adress: '',
    postnummer: '',
    ort: '',
    bankgiro: '',
    iban: '',
    hemsida: 'annaejemo.se',
    momsregistrerad: true,
  };

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">Mitt företag</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Inställningar</h1>
      </div>

      <div className="space-y-10 max-w-3xl">
        <div className="bg-white border border-line-soft rounded-sm p-7">
          <div className="flex items-center gap-5">
            <img src="/logo.svg" alt="Logo" className="w-20 h-20" />
            <div>
              <div className="eyebrow mb-1">Logotyp</div>
              <p className="text-sm text-ink-muted">
                Används i sidofältet, på avtal och fakturor framöver.
              </p>
            </div>
          </div>
        </div>

        <form action={updateForetag} className="space-y-6">
          <Section title="Företagsuppgifter">
            <Row>
              <Field label="Företagsnamn">
                <input type="text" name="foretagsnamn" defaultValue={f.foretagsnamn || ''} className={inputStyle} required />
              </Field>
              <Field label="Organisationsnummer">
                <input type="text" name="orgnr" defaultValue={f.orgnr || ''} className={inputStyle} placeholder="559351-6577" />
              </Field>
            </Row>
            <Row>
              <Field label="Email">
                <input type="email" name="email" defaultValue={f.email || ''} className={inputStyle} />
              </Field>
              <Field label="Telefon">
                <input type="tel" name="telefon" defaultValue={f.telefon || ''} className={inputStyle} />
              </Field>
            </Row>
            <Field label="Hemsida">
              <input type="text" name="hemsida" defaultValue={f.hemsida || ''} className={inputStyle} placeholder="annaejemo.se" />
            </Field>
          </Section>

          <Section title="Adress">
            <Field label="Gatuadress">
              <input type="text" name="adress" defaultValue={f.adress || ''} className={inputStyle} />
            </Field>
            <Row>
              <Field label="Postnummer">
                <input type="text" name="postnummer" defaultValue={f.postnummer || ''} className={inputStyle} />
              </Field>
              <Field label="Ort">
                <input type="text" name="ort" defaultValue={f.ort || ''} className={inputStyle} />
              </Field>
            </Row>
          </Section>

          <Section title="Faktura och betalning">
            <Row>
              <Field label="Bankgiro">
                <input type="text" name="bankgiro" defaultValue={f.bankgiro || ''} className={inputStyle} />
              </Field>
              <Field label="IBAN">
                <input type="text" name="iban" defaultValue={f.iban || ''} className={inputStyle} />
              </Field>
            </Row>
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" name="momsregistrerad" defaultChecked={!!f.momsregistrerad} className="w-4 h-4" />
              <span className="text-sm text-ink-muted">Momsregistrerad</span>
            </label>
          </Section>

          <div className="flex justify-end pt-2">
            <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">
              Spara företagsuppgifter
            </button>
          </div>
        </form>

        <form action={updatePassword} className="bg-white border border-line-soft rounded-sm p-7">
          <div className="eyebrow mb-5">Byt lösenord</div>
          <Field label="Nytt lösenord (minst 6 tecken)">
            <input type="password" name="password" required minLength={6} className={inputStyle} />
          </Field>
          <div className="flex justify-end mt-5">
            <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">
              Uppdatera lösenord
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

const inputStyle = 'w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink';

function Section(props: { title: string; children: any }) {
  return (
    <div className="bg-white border border-line-soft rounded-sm p-7">
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
