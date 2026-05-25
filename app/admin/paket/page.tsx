import { createClient } from '@/lib/supabase/server';

export default async function PaketPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('bildpaket')
    .select('*')
    .order('ordning', { ascending: true });

  const paket = data || [];

  return (
    <>
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">Dina bildpaket</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Paket & priser</h1>
        </div>
      </div>

      {paket.length === 0 ? (
        <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted">
          <p className="font-serif text-xl mb-2 text-ink">Inga paket inlagda än</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {paket.map(p => (
            <div key={p.id} className="bg-white border border-line-soft rounded-sm p-7">
              <div className="eyebrow mb-3">{p.antal_bilder ? p.antal_bilder + ' bilder' : 'Alla bilder'}</div>
              <h3 className="font-serif text-[28px] leading-tight mb-2">{p.namn}</h3>
              <p className="text-ink-muted text-[13px] leading-relaxed mb-6">{p.beskrivning || ''}</p>
              <div className="font-serif text-[36px] font-light">{p.pris_kr.toLocaleString('sv-SE')} <span className="text-[16px] text-ink-muted">kr</span></div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-dashed border-line p-10 rounded-sm text-ink-muted max-w-[640px]">
        <p className="font-serif text-lg mb-2 text-ink">Redigera priser och paket</p>
        <p className="text-[13px] leading-relaxed">
          Kommande: redigera priser direkt här, lägga till nya paket, sortera om dem.
          Just nu lägger du in dem via Supabase SQL Editor om något behöver ändras.
        </p>
      </div>
    </>
  );
}
