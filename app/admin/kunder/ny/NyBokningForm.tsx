'use client';

import { useState } from 'react';
import Link from 'next/link';
import { skapaBokning } from '../../bokningar/actions';

type Kund = { id: string; label: string; email: string };
type Typ = { id: string; namn: string };

export function NyBokningForm(props: { kunder: Kund[]; typer: Typ[] }) {
  const [kundLage, setKundLage] = useState<'ny' | 'existerande'>('ny');

  return (
    <form action={skapaBokning} className="space-y-8">
      <input type="hidden" name="kund_lage" value={kundLage} />

      <section className="bg-white border border-line-soft rounded-sm p-7">
        <div className="eyebrow mb-4">Kund</div>
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setKundLage('ny')}
            className={`px-4 py-2 text-sm rounded-sm transition-colors ${
              kundLage === 'ny'
                ? 'bg-ink text-bg'
                : 'bg-white border border-line-soft text-ink hover:border-ink'
            }`}
          >
            Ny kund
          </button>
          <button
            type="button"
            onClick={() => setKundLage('existerande')}
            className={`px-4 py-2 text-sm rounded-sm transition-colors ${
              kundLage === 'existerande'
                ? 'bg-ink text-bg'
                : 'bg-white border border-line-soft text-ink hover:border-ink'
            }`}
          >
            Befintlig kund
          </button>
        </div>

        {kundLage === 'ny' ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Förnamn" name="fornamn" required />
            <Field label="Efternamn" name="efternamn" />
            <Field label="Företagsnamn (valfritt)" name="foretagsnamn" />
            <Field label="Email" name="email" type="email" />
            <Field label="Telefon" name="telefon" type="tel" />
            <Field label="Hur hittade kunden mig" name="hur_hittade" placeholder="Instagram, Google, rekommendation..." />
          </div>
        ) : (
          <div>
            <Label htmlFor="kund_id">Välj befintlig kund</Label>
            <select
              id="kund_id"
              name="kund_id"
              defaultValue=""
              className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
              required
            >
              <option value="" disabled>Välj kund...</option>
              {props.kunder.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}{k.email ? ` (${k.email})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="bg-white border border-line-soft rounded-sm p-7">
        <div className="eyebrow mb-4">Bokning</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Field label="Datum" name="datum" type="date" />
          <Field label="Tid" name="tid" type="time" />
          <Field label="Plats" name="plats" placeholder="Hemmet, Germaniaviken..." />
          <Field label="Adress (valfritt)" name="adress" />
          <div>
            <Label htmlFor="fotograferingstyp_id">Typ av fotografering</Label>
            <select
              id="fotograferingstyp_id"
              name="fotograferingstyp_id"
              defaultValue=""
              className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
            >
              <option value="">Välj typ...</option>
              {props.typer.map((t) => (
                <option key={t.id} value={t.id}>{t.namn}</option>
              ))}
            </select>
          </div>
          <Field label="Bokningsavgift (kr)" name="bokningsavgift_kr" type="number" placeholder="2000" />
        </div>
        <div className="mt-5 flex items-center gap-2">
          <input
            id="bokningsavgift_betald"
            type="checkbox"
            name="bokningsavgift_betald"
            className="rounded-sm border-line-soft"
          />
          <Label htmlFor="bokningsavgift_betald" inline>
            Bokningsavgiften är redan betald
          </Label>
        </div>
        <div className="mt-5">
          <Label htmlFor="intern_anteckning">Intern anteckning (syns bara för mig)</Label>
          <textarea
            id="intern_anteckning"
            name="intern_anteckning"
            rows={3}
            className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink resize-y"
          />
        </div>
      </section>

      <div className="flex justify-between items-center">
        <Link href="/admin/kunder" className="text-sm text-ink-muted hover:text-ink">
          Tillbaka
        </Link>
        <button
          type="submit"
          className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors"
        >
          Spara bokning
        </button>
      </div>
    </form>
  );
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={props.name}>{props.label}</Label>
      <input
        id={props.name}
        name={props.name}
        type={props.type || 'text'}
        placeholder={props.placeholder}
        required={props.required}
        className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
      />
    </div>
  );
}

function Label(props: { htmlFor: string; children: React.ReactNode; inline?: boolean }) {
  return (
    <label
      htmlFor={props.htmlFor}
      className={`eyebrow ${props.inline ? '' : 'mb-1.5 block'}`}
    >
      {props.children}
    </label>
  );
}
