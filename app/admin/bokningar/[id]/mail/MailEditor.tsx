'use client';

import { useState } from 'react';
import Link from 'next/link';

export function MailEditor(props: { kundEmail: string; kundId: string; initialAmne: string; initialBrod: string }) {
  const [amne, setAmne] = useState(props.initialAmne);
  const [brod, setBrod] = useState(props.initialBrod);
  const [kopierat, setKopierat] = useState(false);

  function kopiera() {
    if (typeof window === 'undefined' || !navigator.clipboard) return;
    const text = `${amne}\n\n${brod}`;
    navigator.clipboard.writeText(text).then(function() {
      setKopierat(true);
      setTimeout(function() { setKopierat(false); }, 2500);
    });
  }

  const mailtoUrl = props.kundEmail
    ? `mailto:${props.kundEmail}?subject=${encodeURIComponent(amne)}&body=${encodeURIComponent(brod)}`
    : '#';

  return (
    <div className="space-y-5">
      <div className="bg-white border border-line-soft rounded-sm p-7">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-5 text-sm">
          <div>
            <div className="eyebrow mb-1">Till</div>
            <div className="font-mono text-[13px]">{props.kundEmail || 'Saknar email'}</div>
          </div>
          <div>
            <div className="eyebrow mb-1">Från</div>
            <div className="font-mono text-[13px]">kontakt@fotografannaejemo.se</div>
          </div>
        </div>
        <div className="mb-5">
          <div className="eyebrow mb-1.5">Ämne</div>
          <input
            type="text"
            value={amne}
            onChange={function(e) { setAmne(e.target.value); }}
            className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
          />
        </div>
        <div>
          <div className="eyebrow mb-1.5">Brödtext</div>
          <textarea
            value={brod}
            onChange={function(e) { setBrod(e.target.value); }}
            rows={20}
            className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm font-mono leading-relaxed resize-y focus:outline-none focus:border-ink"
          />
          <p className="text-[11px] text-ink-muted mt-2">
            Redigera fritt. Variabler från mallen är redan ifyllda med kundens uppgifter. När du är klar klickar du på Kopiera och klistrar in i one.com webmail.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Link href={`/admin/kunder/${props.kundId}`} className="text-sm text-ink-muted hover:text-ink">
          Tillbaka till kunden
        </Link>
        <div className="flex gap-3">
          <a
            href={mailtoUrl}
            className="px-5 py-2.5 border border-line-soft text-sm rounded-sm hover:border-ink transition-colors"
          >
            Öppna i mailklient
          </a>
          <button
            type="button"
            onClick={kopiera}
            className="px-5 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors"
          >
            {kopierat ? 'Kopierat!' : 'Kopiera mail'}
          </button>
        </div>
      </div>
    </div>
  );
}
