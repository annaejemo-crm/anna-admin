'use client';

import { useActionState, useState, useTransition } from 'react';
import { skickaLeadsMejl, toggleAvregistrerad, type UtskickResultat } from './actions';

type Lead = {
  id: string;
  namn: string | null;
  email: string | null;
  kalla: string | null;
  created_at: string;
  senast_mejlad_at: string | null;
  avregistrerad: boolean;
};

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

const TH = 'font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 text-left border-b border-line bg-bg font-medium';
const TD = 'py-3.5 px-5 text-sm';

export function LeadsUtskick({ leads }: { leads: Lead[] }) {
  const valbara = leads.filter((l) => !l.avregistrerad && l.email);
  const [valda, setValda] = useState<Set<string>>(new Set());
  const [resultat, formAction, skickar] = useActionState<UtskickResultat, FormData>(skickaLeadsMejl, null);
  const [togglar, startToggle] = useTransition();

  const allaValda = valbara.length > 0 && valbara.every((l) => valda.has(l.id));

  function toggleAlla() {
    setValda(allaValda ? new Set() : new Set(valbara.map((l) => l.id)));
  }

  function toggleEn(id: string) {
    setValda((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction}>
      <div className="bg-white border border-line-soft rounded-sm overflow-hidden mb-8">
        <table className="w-full">
          <thead>
            <tr>
              <th className={`${TH} w-10`}>
                <input
                  type="checkbox"
                  checked={allaValda}
                  onChange={toggleAlla}
                  aria-label="Välj alla"
                />
              </th>
              <th className={TH}>Datum</th>
              <th className={TH}>Namn</th>
              <th className={TH}>Email</th>
              <th className={TH}>Senast mejlad</th>
              <th className={`${TH} text-right`}></th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className={`${TD} py-8 text-ink-muted text-center`}>
                  Inga leads än. De dyker upp här när någon laddar ner guiden.
                </td>
              </tr>
            )}
            {leads.map((l) => (
              <tr
                key={l.id}
                className={`border-b border-line-soft last:border-0 ${l.avregistrerad ? 'opacity-45' : ''}`}
              >
                <td className={TD}>
                  {!l.avregistrerad && l.email && (
                    <input
                      type="checkbox"
                      name="lead"
                      value={l.id}
                      checked={valda.has(l.id)}
                      onChange={() => toggleEn(l.id)}
                      aria-label={`Välj ${l.namn || l.email}`}
                    />
                  )}
                </td>
                <td className={`${TD} whitespace-nowrap`}>{formatDate(l.created_at)}</td>
                <td className={TD}>{l.namn || '–'}</td>
                <td className={TD}>
                  {l.email ? (
                    <a href={`mailto:${l.email}`} className="underline decoration-line hover:decoration-ink">
                      {l.email}
                    </a>
                  ) : (
                    '–'
                  )}
                </td>
                <td className={`${TD} whitespace-nowrap text-ink-muted`}>
                  {formatDate(l.senast_mejlad_at)}
                </td>
                <td className={`${TD} text-right whitespace-nowrap`}>
                  <button
                    type="button"
                    disabled={togglar}
                    onClick={() => startToggle(() => toggleAvregistrerad(l.id))}
                    className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-faint hover:text-ink"
                  >
                    {l.avregistrerad ? 'Aktivera igen' : 'Avregistrera'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-line-soft rounded-sm p-6 max-w-[720px]">
        <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint mb-4">
          Nytt utskick · {valda.size} {valda.size === 1 ? 'mottagare vald' : 'mottagare valda'}
        </div>

        <label className="block text-sm mb-1.5" htmlFor="amne">Ämne</label>
        <input
          id="amne"
          name="amne"
          type="text"
          placeholder="T.ex. Nu öppnar jag platser i mitt mentorskap"
          className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-white mb-4"
        />

        <label className="block text-sm mb-1.5" htmlFor="meddelande">Meddelande</label>
        <textarea
          id="meddelande"
          name="meddelande"
          rows={10}
          placeholder={'Hej {namn}!\n\nSkriv ditt meddelande här...'}
          className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-white mb-2"
        />
        <p className="text-xs text-ink-muted mb-5">
          Skriv {'{namn}'} där du vill ha personens förnamn. En rad om varför man får
          mejlet och hur man avregistrerar sig läggs till automatiskt längst ner.
        </p>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={skickar || valda.size === 0} className="btn">
            {skickar ? 'Skickar...' : `Skicka till ${valda.size} ${valda.size === 1 ? 'person' : 'personer'}`}
          </button>
          {resultat && resultat.ok && (
            <span className="text-sm text-ink-muted">
              Skickat till {resultat.skickade} {resultat.skickade === 1 ? 'person' : 'personer'}.
            </span>
          )}
          {resultat && resultat.fel && (
            <span className="text-sm text-red-700">{resultat.fel}</span>
          )}
        </div>
      </div>
    </form>
  );
}
