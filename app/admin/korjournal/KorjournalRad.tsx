'use client';

import { useRef } from 'react';

type Post = {
  id: string;
  datum: string | null;
  syfte: string | null;
  fran_adress: string | null;
  plats_namn: string | null;
  plats_adress: string | null;
  medfoljande: string | null;
  antal_km: number | string | null;
};

type Props = {
  post: Post;
  valdBil: string;
  uppdateraAction: (formData: FormData) => Promise<void> | void;
  raderaAction: (formData: FormData) => Promise<void> | void;
  bytBilAction: (formData: FormData) => Promise<void> | void;
  flyttaUppAction: (formData: FormData) => Promise<void> | void;
  flyttaNerAction: (formData: FormData) => Promise<void> | void;
};

export default function KorjournalRad({
  post,
  valdBil,
  uppdateraAction,
  raderaAction,
  bytBilAction,
  flyttaUppAction,
  flyttaNerAction,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  const sparaPaBlur = () => {
    formRef.current?.requestSubmit();
  };

  const datumValue = post.datum ? new Date(post.datum).toISOString().slice(0, 10) : '';
  const kmValue = post.antal_km != null ? String(Number(post.antal_km)).replace('.', ',') : '';

  return (
    <form
      ref={formRef}
      action={uppdateraAction}
      className="grid grid-cols-[120px_1fr_1.3fr_1.3fr_1fr_100px_170px] gap-0 items-stretch border-t border-line-soft"
    >
      <input type="hidden" name="id" value={post.id} />
      <input type="hidden" name="plats_adress" defaultValue={post.plats_adress || ''} />
      <input
        type="date"
        name="datum"
        defaultValue={datumValue}
        onBlur={sparaPaBlur}
        className="px-3 py-3 font-mono text-[12px] bg-transparent hover:bg-bg-subtle focus:bg-white focus:outline-1 focus:outline focus:outline-ink"
      />
      <input
        type="text"
        name="syfte"
        defaultValue={post.syfte || ''}
        onBlur={sparaPaBlur}
        className="px-3 py-3 text-sm bg-transparent hover:bg-bg-subtle focus:bg-white focus:outline-1 focus:outline focus:outline-ink"
      />
      <input
        type="text"
        name="fran_adress"
        defaultValue={post.fran_adress || ''}
        placeholder="Från"
        onBlur={sparaPaBlur}
        className="px-3 py-3 text-sm text-ink-muted bg-transparent hover:bg-bg-subtle focus:bg-white focus:outline-1 focus:outline focus:outline-ink"
      />
      <input
        type="text"
        name="plats_namn"
        defaultValue={post.plats_namn || ''}
        placeholder="Till"
        onBlur={sparaPaBlur}
        className="px-3 py-3 text-sm text-ink-muted bg-transparent hover:bg-bg-subtle focus:bg-white focus:outline-1 focus:outline focus:outline-ink"
      />
      <input
        type="text"
        name="medfoljande"
        defaultValue={post.medfoljande || ''}
        placeholder="Kund"
        onBlur={sparaPaBlur}
        className="px-3 py-3 text-[12.5px] text-ink-muted bg-transparent hover:bg-bg-subtle focus:bg-white focus:outline-1 focus:outline focus:outline-ink"
      />
      <input
        type="text"
        name="antal_km"
        inputMode="decimal"
        defaultValue={kmValue}
        placeholder="0"
        onBlur={sparaPaBlur}
        className="px-3 py-3 text-right font-mono text-[12.5px] bg-transparent hover:bg-bg-subtle focus:bg-white focus:outline-1 focus:outline focus:outline-ink"
      />
      <div className="flex items-center justify-end gap-0.5 pr-2">
        <button
          type="submit"
          formAction={flyttaUppAction}
          className="w-7 h-7 flex items-center justify-center text-[16px] text-ink-muted hover:text-ink hover:bg-bg-subtle rounded-sm leading-none"
          title="Flytta upp"
        >
          ↑
        </button>
        <button
          type="submit"
          formAction={flyttaNerAction}
          className="w-7 h-7 flex items-center justify-center text-[16px] text-ink-muted hover:text-ink hover:bg-bg-subtle rounded-sm leading-none"
          title="Flytta ner"
        >
          ↓
        </button>
        <span className="w-px h-5 bg-line mx-1" />
        <button
          type="submit"
          formAction={bytBilAction}
          className="px-2 h-7 text-[10px] font-mono text-ink-faint hover:text-ink hover:bg-bg-subtle rounded-sm"
          title={`Flytta till ${valdBil === 'TMX76G' ? 'UDD408' : 'TMX76G'}`}
        >
          →{valdBil === 'TMX76G' ? 'UDD' : 'TMX'}
        </button>
        <button
          type="submit"
          formAction={raderaAction}
          className="w-7 h-7 flex items-center justify-center text-[14px] text-ink-faint hover:text-danger hover:bg-bg-subtle rounded-sm"
          title="Radera raden"
        >
          ×
        </button>
      </div>
    </form>
  );
}
