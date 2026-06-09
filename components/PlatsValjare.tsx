'use client';

import { useState } from 'react';

export type PlatsOption = {
  id: string;
  namn: string;
  avstand_km_enkel: number | null;
};

export function PlatsValjare(props: {
  platser: PlatsOption[];
  initialPlatsId?: string | null;
  initialPlats?: string;
  initialAdress?: string;
  initialAvstandKmEnkel?: number | null;
}) {
  const [platsId, setPlatsId] = useState<string>(props.initialPlatsId || (props.initialPlats ? 'fri' : ''));
  const visaFritext = platsId === 'fri';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">
          Plats
        </label>
        <select
          value={platsId}
          onChange={(e) => setPlatsId(e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
        >
          <option value="">Välj plats…</option>
          {props.platser.map((p) => (
            <option key={p.id} value={p.id}>
              {p.namn}
              {p.avstand_km_enkel != null
                ? ` · ${(Number(p.avstand_km_enkel) * 2).toLocaleString('sv-SE')} km T/R`
                : ''}
            </option>
          ))}
          <option value="fri">Annan plats (skriv nedan)</option>
        </select>
        <input type="hidden" name="plats_id" value={platsId} />
        <p className="text-[11px] text-ink-faint mt-1">
          Välj från listan så hamnar resan automatiskt i körjournalen när bokningen markeras klar.
          Saknas platsen, lägg upp den under Inställningar &gt; Platser.
        </p>
      </div>

      {visaFritext && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">
                Platsens namn
              </label>
              <input
                type="text"
                name="plats"
                defaultValue={props.initialPlats || ''}
                className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
                placeholder="t.ex. Hemma hos kund, Strandvägen 7"
              />
            </div>
            <div>
              <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">
                Adress
              </label>
              <input
                type="text"
                name="adress"
                defaultValue={props.initialAdress || ''}
                className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
                placeholder="Gata, ort"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">
              Avstånd enkel väg (km, från ditt hem)
            </label>
            <input
              type="text"
              name="avstand_km_enkel_fri"
              defaultValue={props.initialAvstandKmEnkel != null ? String(props.initialAvstandKmEnkel) : ''}
              inputMode="decimal"
              className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink max-w-[200px]"
              placeholder="t.ex. 12,5"
            />
            <p className="text-[11px] text-ink-faint mt-1">
              Lämna tomt om resan inte ska räknas in i körjournalen. Annars fylls det dubbla automatiskt som tur och retur när bokningen markeras klar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
