'use client';

import { useState } from 'react';

export function LankCopy(props: { slug: string }) {
  const [kopierat, setKopierat] = useState(false);
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/avtal/${props.slug}`
    : `/avtal/${props.slug}`;

  function kopiera() {
    if (typeof window === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(url).then(function() {
      setKopierat(true);
      setTimeout(function() { setKopierat(false); }, 2500);
    });
  }

  return (
    <div className="flex gap-3 items-center">
      <input
        type="text"
        value={url}
        readOnly
        className="flex-1 px-3 py-2.5 bg-bg-subtle border border-line-soft rounded-sm text-sm font-mono"
        onFocus={function(e) { e.target.select(); }}
      />
      <button
        type="button"
        onClick={kopiera}
        className="px-5 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors whitespace-nowrap"
      >
        {kopierat ? 'Kopierat!' : 'Kopiera länk'}
      </button>
    </div>
  );
}
