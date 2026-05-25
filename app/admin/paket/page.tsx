import { createClient } from '@/lib/supabase/server';
import { updatePaket, addPaket, deletePaket } from './actions';

export default async function PaketPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('bildpaket').select('*').order('ordning', { ascending: true });
  const paket = data || [];

  return (
    <>
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">Dina bildpaket</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Paket & priser</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {paket.map(p => (
          <form key={p.id} action={updatePaket} className="bg-white border border-line-soft rounded-sm p-6 space-y-3">
            <input type="hidden" name="id" value={p.id} />
            <div>
              <label className="eyebrow block mb-1">Namn</label>
              <input name="namn" defaultValue={p.namn} className="w-full bg-bg border border-line rounded-sm px-3 py-2 text-[14px] focus:outline-none focus:border-ink-faint" />
            </div>
            <div>
              <label className="eyebrow block mb-1">Beskrivning</label>
              <input name="beskrivning" defaultValue={p.beskrivning || ''} className="w-full bg-bg border border-line rounded-sm px-3 py-2 text-[13px] focus:outline-none focus:border-ink-faint" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="eyebrow block mb-1">Antal bilder</label>
                <input name="antal_bilder" type="number" defaultValue={p.antal_bilder || ''} placeholder="Alla" className="w-full bg-bg border border-line rounded-sm px-3 py-2 text-[14px] focus:outline-none focus:border-ink-faint" />
              </div>
              <div>
                <label className="eyebrow block mb-1">Pris (kr)</label>
                <input name="pris_kr" type="number" defaultValue={p.pris_kr} required className="w-full bg-bg border border-line rounded-sm px-3 py-2 text-[14px] focus:outline-none focus:border-ink-faint" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn flex-1">Spara</button>
            </div>
          </form>
        ))}
      </div>

      <details className="bg-white border border-line-soft rounded-sm p-6 max-w-[640px]">
        <summary className="cursor-pointer font-serif text-xl">+ Lägg till nytt paket</summary>
        <form action={addPaket} className="space-y-3 mt-5">
          <div>
            <label className="eyebrow block mb-1">Namn</label>
            <input name="namn" required className="w-full bg-bg border border-line rounded-sm px-3 py-2 text-[14px] focus:outline-none focus:border-ink-faint" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Beskrivning</label>
            <input name="beskrivning" className="w-full bg-bg border border-line rounded-sm px-3 py-2 text-[13px] focus:outline-none focus:border-ink-faint" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="eyebrow block mb-1">Antal bilder</label>
              <input name="antal_bilder" type="number" className="w-full bg-bg border border-line rounded-sm px-3 py-2 text-[14px] focus:outline-none focus:border-ink-faint" />
            </div>
            <div>
              <label className="eyebrow block mb-1">Pris (kr)</label>
              <input name="pris_kr" type="number" required className="w-full bg-bg border border-line rounded-sm px-3 py-2 text-[14px] focus:outline-none focus:border-ink-faint" />
            </div>
            <div>
              <label className="eyebrow block mb-1">Sortering</label>
              <input name="ordning" type="number" defaultValue="100" className="w-full bg-bg border border-line rounded-sm px-3 py-2 text-[14px] focus:outline-none focus:border-ink-faint" />
            </div>
          </div>
          <button type="submit" className="btn">Lägg till paket</button>
        </form>
      </details>
    </>
  );
}
