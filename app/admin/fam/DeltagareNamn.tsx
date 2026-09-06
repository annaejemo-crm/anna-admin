'use client';

import { useState, useTransition } from 'react';
import { bytDeltagare } from './actions';

/* Namn, mejl och hemsida på en deltagare går att ändra direkt på raden.
   Används när en biljett säljs vidare: byt namnet, så sparas vem som
   hade biljetten från början i anteckningen. */
export function DeltagareNamn({ d, ater }: { d: { id: string; namn: string; email: string | null; fotograf_hemsida: string | null; anteckning: string | null }; ater: number }) {
  const [redigerar, setRedigerar] = useState(false);
  const [sparar, start] = useTransition();
  const overlaten = (d.anteckning || '').split('\n').find((r) => r.startsWith('Biljett överlåten från'));

  if (!redigerar) {
    return (
      <div className="group">
        <div className="font-medium flex items-center gap-1.5">
          <span>{d.namn}</span>
          {ater > 1 && <span title={`Återkommande (${ater} år)`} className="text-accent">★</span>}
          <button
            type="button"
            onClick={() => setRedigerar(true)}
            title="Ändra namn, mejl eller hemsida"
            className="text-ink-faint hover:text-ink text-[12px] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            ✎
          </button>
        </div>
        {overlaten && <div className="text-[11px] text-ink-faint mt-0.5">{overlaten}</div>}
      </div>
    );
  }

  return (
    <form
      action={(fd) => start(async () => { await bytDeltagare(fd); setRedigerar(false); })}
      className="grid gap-1.5 min-w-[260px]"
    >
      <input type="hidden" name="id" value={d.id} />
      <input type="text" name="namn" defaultValue={d.namn} required autoFocus placeholder="Namn" className="w-full px-2 py-1 border border-line-soft rounded-sm text-sm" />
      <input type="email" name="email" defaultValue={d.email || ''} placeholder="Email" className="w-full px-2 py-1 border border-line-soft rounded-sm text-[12px] font-mono" />
      <input type="text" name="fotograf_hemsida" defaultValue={d.fotograf_hemsida || ''} placeholder="Hemsida" className="w-full px-2 py-1 border border-line-soft rounded-sm text-[12px]" />
      <div className="flex gap-2 items-center">
        <button type="submit" disabled={sparar} className="px-3 py-1 bg-ink text-bg text-[12px] rounded-sm disabled:opacity-40">{sparar ? 'Sparar…' : 'Spara'}</button>
        <button type="button" onClick={() => setRedigerar(false)} className="text-[12px] text-ink-muted hover:text-ink">Avbryt</button>
      </div>
    </form>
  );
}
