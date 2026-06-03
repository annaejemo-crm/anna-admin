'use client';

import { useState } from 'react';
import { signera } from './actions';

export function SigneraForm(props: { avtalId: string; bokningId: string; forhandnamn: string }) {
  const [namn, setNamn] = useState(props.forhandnamn);
  const [accepterat, setAccepterat] = useState(false);
  const [skickar, setSkickar] = useState(false);

  async function signeraHandler(e: any) {
    e.preventDefault();
    if (!namn.trim() || !accepterat || skickar) return;
    setSkickar(true);
    const fd = new FormData();
    fd.append('avtal_id', props.avtalId);
    fd.append('bokning_id', props.bokningId);
    fd.append('typed_name', namn.trim());
    await signera(fd);
    window.location.reload();
  }

  return (
    <form onSubmit={signeraHandler} className="space-y-5 pt-6 border-t border-line">
      <div className="eyebrow">Signera digitalt</div>

      <div>
        <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">
          Skriv ditt fullständiga namn
        </label>
        <input
          type="text"
          value={namn}
          onChange={function(e) { setNamn(e.target.value); }}
          placeholder="För- och efternamn"
          className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
          required
        />
      </div>

      <label className="flex items-start gap-3 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={accepterat}
          onChange={function(e) { setAccepterat(e.target.checked); }}
          className="mt-0.5 w-4 h-4"
        />
        <span className="text-ink-muted">
          Jag har läst igenom avtalet och accepterar villkoren. Genom att klicka Signera digitalt skapas en bindande signatur kopplad till mitt namn, datum, IP-adress och en kontrakts-hash.
        </span>
      </label>

      <button
        type="submit"
        disabled={!namn.trim() || !accepterat || skickar}
        className="w-full px-6 py-3 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {skickar ? 'Signerar…' : 'Signera digitalt'}
      </button>
    </form>
  );
}
