'use client';

import { useState } from 'react';
import Link from 'next/link';
import { skapaBokning } from '../actions';
import { PlatsValjare, PlatsOption } from '@/components/PlatsValjare';

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

type KundOption = { id: string; label: string };

export function NyBokningForm(props: { kunder: KundOption[]; typer: { id: string; namn: string }[]; platser: PlatsOption[]; valdKundId: string | null }) {
  const [kundLage, setKundLage] = useState<'existerande' | 'ny'>(props.valdKundId ? 'existerande' : 'ny');
  const [valdKund, setValdKund] = useState(props.valdKundId || '');

  return (
    <form action={skapaBokning} className="space-y-8 max-w-3xl">
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
      </Section>

      <Section title="Bokningsavgift">
        <Row>
          <Field label="Bokningsavgift (kr)">
            <input type="number" name="bokningsavgift_kr" defaultValue="2000" className={inputStyle} />
          </Field>
          <Field label="Betald">
            <label className="flex items-center gap-2 h-[42px]">
              <input type="checkbox" name="bokningsavgift_betald" className="w-4 h-4" />
              <span className="text-sm text-ink-muted">Markera som betald</span>
            </label>
          </Field>
        </Row>
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
