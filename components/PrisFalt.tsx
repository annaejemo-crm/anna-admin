'use client';

import { useState } from 'react';

/**
 * Prisfält med moms-räknare.
 * När arForetagskund är true tolkas värdet som ex moms och systemet
 * visar ink moms live under fältet (25 procent moms).
 * För privatkund visas värdet som det är.
 */
export function PrisFalt(props: {
  name: string;
  defaultValue?: number | null;
  arForetagskund: boolean;
  placeholder?: string;
}) {
  const [vardeText, setVardeText] = useState(
    props.defaultValue != null ? String(props.defaultValue) : '',
  );

  const raw = vardeText.replace(/\s/g, '').replace(',', '.');
  const num = raw ? parseFloat(raw) : NaN;
  const harTal = !Number.isNaN(num) && num > 0;

  const momssats = 0.25;
  const inkMoms = harTal ? Math.round(num * (1 + momssats)) : 0;
  const moms = harTal ? Math.round(num * momssats) : 0;

  return (
    <div>
      <input
        type="text"
        inputMode="decimal"
        name={props.name}
        value={vardeText}
        onChange={(e) => setVardeText(e.target.value)}
        placeholder={props.placeholder || (props.arForetagskund ? 'Pris ex moms' : 'Pris')}
        className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
      />
      {props.arForetagskund && (
        <div className="mt-1.5 text-[12px] text-ink-muted font-mono">
          {harTal
            ? `+ ${moms.toLocaleString('sv-SE')} kr moms = ${inkMoms.toLocaleString('sv-SE')} kr inkl moms`
            : '+ 25 procent moms tillkommer'}
        </div>
      )}
    </div>
  );
}
