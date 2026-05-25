import { createClient } from '@/lib/supabase/server';

export default async function MailmallarPage() {
  const supabase = await createClient();
  const { data: mallar } = await supabase
    .from('mail_mallar')
    .select('*')
    .order('ordning', { ascending: true });

  return (
    <>
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">Mallar du triggar manuellt</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Mailmallar</h1>
        </div>
        <button className="btn">+ Ny mall</button>
      </div>

      <div className="grid grid-cols-[280px_1fr] bg-white border border-line-soft rounded-sm min-h-[520px]">
        <div className="border-r border-line-soft py-4">
          {(mallar || []).map((m: any, i: number) => (
            <div
              key={m.id}
              className={`py-3.5 px-5 cursor-pointer border-l-2 transition-colors ${
                i === 0 ? 'bg-bg border-l-accent' : 'border-l-transparent hover:bg-bg'
              }`}
            >
              <div className="font-serif text-[16px] mb-0.5">{m.namn}</div>
              <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[0.1em]">
                {m.kategori}
              </div>
            </div>
          ))}
        </div>
        <div className="p-8 text-ink-muted">
          <p className="font-serif text-xl mb-2 text-ink">Mallredigerare byggs nästa session</p>
          <p className="text-sm leading-relaxed">
            Här kommer du kunna redigera mallens ämnesrad och brödtext med variabler<br />
            som <code className="text-accent">{'{{fornamn}}'}</code>, <code className="text-accent">{'{{datum}}'}</code>, <code className="text-accent">{'{{plats}}'}</code> osv.<br />
            <br />
            För skickning från en specifik kund öppnar du kundens detaljvy och klickar "Skicka mail".
          </p>
        </div>
      </div>
    </>
  );
}
