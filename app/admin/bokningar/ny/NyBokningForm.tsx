'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { skapaBokning } from '../actions';
import { PlatsValjare, PlatsOption } from '@/components/PlatsValjare';
import { PrisFalt } from '@/components/PrisFalt';

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
];

const HUR_HITTADE_FORSLAG = ['Instagram', 'Google', 'Rekommendation', 'Återkommande kund', 'Annat'];

type KundOption = { id: string; label: string; arForetagskund?: boolean };

export function NyBokningForm(props: { kunder: KundOption[]; typer: { id: string; namn: string }[]; platser: PlatsOption[]; valdKundId: string | null }) {
  const [kundLage, setKundLage] = useState<'existerande' | 'ny'>(props.valdKundId ? 'existerande' : 'ny');
  const [valdKund, setValdKund] = useState(props.valdKundId || '');
  const [nyArForetagskund, setNyArForetagskund] = useState(false);

  const valdKundObj = props.kunder.find(function(k) { return k.id === valdKund; });
  const arForetagskund = kundLage === 'ny' ? nyArForetagskund : !!valdKundObj?.arForetagskund;

  const formRef = useRef<HTMLFormElement>(null);
  const [forfragan, setForfragan] = useState('');
  const [ifyllt, setIfyllt] = useState<string[]>([]);
  const [parseFel, setParseFel] = useState('');

  /**
   * Laser in ett mejl fran bokningsformularet och fyller i falten.
   * Formatet ar rader med "Etikett: varde". Rader utan etikett raknas som
   * fortsattning pa foregaende falt, sa langa meddelanden foljer med.
   * Allt efter en rad med tre bindestreck ar teknisk metadata fran formularet.
   */
  function fyllFranForfragan() {
    const form = formRef.current;
    if (!form) return;

    const text = forfragan.trim();
    if (!text) {
      setParseFel('Klistra in mejlet först.');
      setIfyllt([]);
      return;
    }

    const delar = text.split(/^[ \t]*-{3,}[ \t]*$/m);
    const huvud = delar[0] || '';
    const metadata = delar.slice(1).join('\n');

    const falt: Record<string, string> = {};
    let aktuell = '';
    const rader = huvud.split(/\r?\n/);
    for (let i = 0; i < rader.length; i++) {
      const rad = rader[i];
      const träff = rad.match(/^\s*([^:]{2,40}?)\s*:\s*(.*)$/);
      if (träff) {
        aktuell = träff[1].toLowerCase().trim();
        falt[aktuell] = träff[2].trim();
      } else if (aktuell && rad.trim()) {
        falt[aktuell] = (falt[aktuell] ? falt[aktuell] + '\n' : '') + rad.trim();
      }
    }

    function hamta(nycklar: string[]): string {
      const alla = Object.keys(falt);
      for (let i = 0; i < nycklar.length; i++) {
        for (let j = 0; j < alla.length; j++) {
          if (alla[j] === nycklar[i]) return (falt[alla[j]] || '').trim();
        }
      }
      for (let i = 0; i < nycklar.length; i++) {
        for (let j = 0; j < alla.length; j++) {
          if (alla[j].indexOf(nycklar[i]) !== -1) return (falt[alla[j]] || '').trim();
        }
      }
      return '';
    }

    function satt(faltnamn: string, varde: string): boolean {
      if (!varde) return false;
      const el = form!.elements.namedItem(faltnamn) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (!el || !('value' in el)) return false;
      const proto = el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : el instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
      const beskrivning = Object.getOwnPropertyDescriptor(proto, 'value');
      if (beskrivning && beskrivning.set) beskrivning.set.call(el, varde);
      else (el as any).value = varde;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    // Namn kan komma som ett falt eller uppdelat
    let fornamn = hamta(['förnamn', 'fornamn']);
    let efternamn = hamta(['efternamn']);
    if (!fornamn) {
      const heltNamn = hamta(['namn', 'ditt namn', 'name']);
      if (heltNamn) {
        const bitar = heltNamn.split(/\s+/).filter(Boolean);
        if (bitar.length === 1) {
          fornamn = bitar[0];
        } else if (bitar.length > 1) {
          efternamn = efternamn || bitar[bitar.length - 1];
          fornamn = bitar.slice(0, bitar.length - 1).join(' ');
        }
      }
    }

    const email = hamta(['e-post', 'epost', 'email', 'e-mail', 'mejl', 'mail']);
    const telefon = hamta(['telefon', 'telefonnummer', 'mobil', 'tel']);
    const hurHittade = hamta(['vart hittade du mig?', 'vart hittade du mig', 'hur hittade du mig', 'hittade du mig', 'hur hittade']);
    const typText = hamta(['fotografering', 'typ av fotografering', 'vilken fotografering']);
    const foretag = hamta(['företagsnamn', 'företag']);

    const adress = hamta(['adress', 'gatuadress']);
    const postnummer = hamta(['postnummer', 'postnr']);
    const ort = hamta(['ort', 'stad']);
    const bf = hamta(['när har du bf?', 'när har du bf', 'bf', 'beräknat födelsedatum']);
    const meddelande = hamta(['meddelande', 'övrigt', 'kommentar', 'fråga']);

    const gjorda: string[] = [];
    if (kundLage !== 'ny') setKundLage('ny');

    if (satt('fornamn', fornamn)) gjorda.push('förnamn');
    if (satt('efternamn', efternamn)) gjorda.push('efternamn');
    if (satt('foretagsnamn', foretag)) gjorda.push('företagsnamn');
    if (satt('email', email)) gjorda.push('email');
    if (satt('telefon', telefon)) gjorda.push('telefon');
    if (satt('hur_hittade', hurHittade)) gjorda.push('hur hittade');

    // Fotograferingstyp: matcha mot hennes egna typer, sa
    // Gravidfotografering hittar typen Gravid.
    if (typText) {
      const jamfor = typText.toLowerCase();
      const traff = props.typer.find(function(t) {
        const n = String(t.namn || '').toLowerCase();
        return n.length > 2 && (jamfor.indexOf(n) !== -1 || n.indexOf(jamfor) !== -1);
      });
      if (traff && satt('fotograferingstyp_id', traff.id)) gjorda.push('fotograferingstyp');
    }

    // Kalla: samma svar som hur hittade, men maste matcha ett av valen
    if (hurHittade) {
      const val = ['Instagram', 'Google', 'Rekommendation', 'Återkommande kund', 'Mässa', 'Hemsida'];
      const jamfor = hurHittade.toLowerCase();
      const traff = val.find(function(v) { return jamfor.indexOf(v.toLowerCase()) !== -1; });
      if (satt('kalla', traff || 'Annat')) gjorda.push('källa');
    }

    // Resten samlas i den interna anteckningen
    const anteckning: string[] = [];
    if (adress) anteckning.push('Adress: ' + adress + (postnummer ? ', ' + postnummer : '') + (ort ? ' ' + ort : ''));
    else if (postnummer) anteckning.push('Postnummer: ' + postnummer);
    if (bf) anteckning.push('BF: ' + bf);
    if (meddelande) anteckning.push('Meddelande: ' + meddelande);

    const metaDatum = (metadata.match(/^\s*Datum:\s*(.+)$/m) || [])[1];
    const metaTid = (metadata.match(/^\s*Tid:\s*(.+)$/m) || [])[1];
    if (metaDatum) anteckning.push('Förfrågan inkom ' + metaDatum.trim() + (metaTid ? ' kl ' + metaTid.trim() : ''));

    if (anteckning.length > 0 && satt('intern_anteckning', anteckning.join('\n'))) {
      gjorda.push('intern anteckning');
    }

    if (gjorda.length === 0) {
      setParseFel('Hittade inga fält att fylla i. Kolla att texten har rader som Namn: och E-post:.');
      setIfyllt([]);
    } else {
      setParseFel('');
      setIfyllt(gjorda);
    }
  }

  return (
    <form ref={formRef} action={skapaBokning} className="space-y-8 max-w-3xl">
      <Section title="Klistra in förfrågan">
        <p className="text-sm text-ink-muted mb-3">
          Klistra in mejlet från bokningsformuläret så fylls namn, kontaktuppgifter, typ och källa i åt dig. Datum, tid, plats och pris fyller du i själv.
        </p>
        <textarea
          value={forfragan}
          onChange={function(e) { setForfragan(e.target.value); }}
          rows={6}
          placeholder={'Namn: Anna Falk\nE-post: anna@falx.se\nFotografering: Gravidfotografering\nVart hittade du mig?: Instagram\nMeddelande: ...'}
          className={`${inputStyle} resize-y font-mono text-[12.5px] leading-relaxed`}
        />
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <button
            type="button"
            onClick={fyllFranForfragan}
            className="px-4 py-2 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors"
          >
            Fyll i fälten
          </button>
          <button
            type="button"
            onClick={function() { setForfragan(''); setIfyllt([]); setParseFel(''); }}
            className="text-sm text-ink-muted hover:text-ink"
          >
            Rensa
          </button>
          {ifyllt.length > 0 && (
            <span className="text-[12.5px] text-positive">Fyllde i {ifyllt.join(', ')}.</span>
          )}
          {parseFel && <span className="text-[12.5px] text-accent">{parseFel}</span>}
        </div>
      </Section>

      <Section title="Kund">
        <div className="flex gap-3 mb-5">
          <LageKnapp aktiv={kundLage === 'ny'} onClick={function() { setKundLage('ny'); }} label="Ny kund" />
          <LageKnapp aktiv={kundLage === 'existerande'} onClick={function() { setKundLage('existerande'); }} label="Existerande kund" />
        </div>

        <input type="hidden" name="kund_lage" value={kundLage} />

        {kundLage === 'existerande' ? (
          <Field label="Välj kund">
            <select
              name="kund_id"
              value={valdKund}
              onChange={function(e) { setValdKund(e.target.value); }}
              className={inputStyle}
              required
            >
              <option value="">Välj en kund…</option>
              {props.kunder.map(function(k) {
                return <option key={k.id} value={k.id}>{k.label}</option>;
              })}
            </select>
          </Field>
        ) : (
          <div className="space-y-5">
            <Row>
              <Field label="Förnamn">
                <input type="text" name="fornamn" className={inputStyle} required />
              </Field>
              <Field label="Efternamn">
                <input type="text" name="efternamn" className={inputStyle} />
              </Field>
            </Row>
            <Field label="Företagsnamn (lämna tomt för privatkund)">
              <input type="text" name="foretagsnamn" className={inputStyle} />
            </Field>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="ar_foretagskund"
                checked={nyArForetagskund}
                onChange={function(e) { setNyArForetagskund(e.target.checked); }}
                className="w-4 h-4 accent-ink"
              />
              <span className="text-sm">Företagskund (priser anges exklusive moms)</span>
            </label>
            <Row>
              <Field label="Email">
                <input type="email" name="email" className={inputStyle} />
              </Field>
              <Field label="Telefon">
                <input type="tel" name="telefon" className={inputStyle} />
              </Field>
            </Row>
            <Field label="Hur hittade kunden mig">
              <input type="text" name="hur_hittade" className={inputStyle} list="hur-hittade-forslag" placeholder="t.ex. Instagram" />
              <datalist id="hur-hittade-forslag">
                {HUR_HITTADE_FORSLAG.map(function(f) {
                  return <option key={f} value={f} />;
                })}
              </datalist>
            </Field>
          </div>
        )}
      </Section>

      <Section title="Bokningens datum och plats">
        <Row>
          <Field label="Datum">
            <input type="date" name="datum" className={inputStyle} />
          </Field>
          <Field label="Tid">
            <input type="time" name="tid" className={inputStyle} />
          </Field>
        </Row>
        <PlatsValjare platser={props.platser} />
      </Section>

      <Section title="Typ och status">
        <Row>
          <Field label="Fotograferingstyp">
            <select name="fotograferingstyp_id" defaultValue="" className={inputStyle}>
              <option value="">Välj typ</option>
              {props.typer.map(function(t) {
                return <option key={t.id} value={t.id}>{t.namn}</option>;
              })}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue="bokad" className={inputStyle}>
              {STATUS_LIST.map(function(s) {
                return <option key={s.kod} value={s.kod}>{s.label}</option>;
              })}
            </select>
          </Field>
        </Row>
        <Field label="Var kom bokningen ifrån (källa)">
          <select name="kalla" defaultValue="" className={inputStyle}>
            <option value="">Välj källa</option>
            <option value="Instagram">Instagram</option>
            <option value="Google">Google</option>
            <option value="Rekommendation">Rekommendation</option>
            <option value="Återkommande kund">Återkommande kund</option>
            <option value="Mässa">Mässa</option>
            <option value="Hemsida">Hemsida</option>
            <option value="Annat">Annat</option>
          </select>
        </Field>
      </Section>

      <Section title="Bokningsavgift">
        <Row>
          <Field label={arForetagskund ? 'Bokningsavgift (kr ex moms)' : 'Bokningsavgift (kr)'}>
            <PrisFalt name="bokningsavgift_kr" defaultValue={2000} arForetagskund={arForetagskund} placeholder="2000" />
          </Field>
          <Field label="Betald">
            <label className="flex items-center gap-2 h-[42px]">
              <input type="checkbox" name="bokningsavgift_betald" className="w-4 h-4" />
              <span className="text-sm text-ink-muted">Markera som betald</span>
            </label>
          </Field>
        </Row>
      </Section>

      <Section title="Traktamente">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="innefattar_traktamente"
            className="w-4 h-4 accent-ink mt-0.5"
          />
          <div className="text-sm">
            <div>Innefattar traktamente (resa med övernattning &gt; 50 km från bostad och studio)</div>
            <div className="text-[12px] text-ink-muted mt-0.5">När du sedan markerar bokningen som KLAR skapas en traktamenterad automatiskt under fliken Traktamente, där du fyller i resten.</div>
          </div>
        </label>
      </Section>

      <Section title="Intern anteckning">
        <Field label="Intern anteckning (syns bara för dig)">
          <textarea name="intern_anteckning" rows={4} className={`${inputStyle} resize-y`} />
        </Field>
      </Section>

      <div className="flex justify-between items-center pt-4 border-t border-line">
        <Link href="/admin/kunder" className="text-sm text-ink-muted hover:text-ink">
          Avbryt
        </Link>
        <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">
          Skapa bokning
        </button>
      </div>
    </form>
  );
}

const inputStyle = 'w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink';

function LageKnapp(props: { aktiv: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`px-4 py-2 text-sm rounded-sm transition-colors ${props.aktiv ? 'bg-ink text-bg' : 'bg-white border border-line-soft text-ink hover:border-line'}`}
    >
      {props.label}
    </button>
  );
}

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
