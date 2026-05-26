import { createClient } from '@/lib/supabase/server';
import { updateMall } from './actions';
import Link from 'next/link';

const VARIABLER: { kod: string; beskrivning: string }[] = [
  { kod: '{{fornamn}}', beskrivning: 'Kundens förnamn' },
  { kod: '{{efternamn}}', beskrivning: 'Kundens efternamn' },
  { kod: '{{namn}}', beskrivning: 'Hela namnet' },
  { kod: '{{email}}', beskrivning: 'Kundens email' },
  { kod: '{{typ}}', beskrivning: 'Fotograferingstyp (Gravid, Nyfödd osv)' },
  { kod: '{{datum}}', beskrivning: 'Bokningens datum' },
  { kod: '{{tid}}', beskrivning: 'Bokningens tid' },
  { kod: '{{plats}}', beskrivning: 'Bokningens plats' },
  { kod: '{{bokningsavgift}}', beskrivning: 'Bokningsavgift i kr' },
  { kod: '{{bildpaket}}', beskrivning: 'Valt bildpaket' },
  { kod: '{{totalt}}', beskrivning: 'Total summa' },
];

export default async function MailmallarPage(props: { searchParams?: Promise<{ id?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};

  const { data: mallarRaw } = await supabase
    .from('mail_mallar')
    .select('*')
    .order('ordning', { ascending: true });

  const mallar = mallarRaw || [];
  const valdId = sp.id || (mallar[0] ? mallar[0].id : null);
  const valdMall = mallar.find(function(m: any) { return m.id === valdId; }) || mallar[0];

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">Mallar du triggar manuellt</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Mailmallar</h1>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden h-fit">
          {mallar.map(function(m: any) {
            const aktiv = valdMall && valdMall.id === m.id;
            return (
              <Link
                key={m.id}
                href={`/admin/mail?id=${m.id}`}
                className={`block py-3.5 px-5 border-l-2 transition-colors ${aktiv ? 'bg-bg-subtle border-l-accent' : 'border-l-transparent hover:bg-bg-subtle/60'}`}
              >
                <div className="font-serif text-[16px] mb-0.5">{m.namn}</div>
                <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[0.1em]">{m.kategori || 'övrigt'}</div>
              </Link>
            );
          })}
          {mallar.length === 0 && (
            <div className="p-5 text-sm text-ink-muted">Inga mallar än.</div>
          )}
        </div>

        {valdMall ? (
          <div className="space-y-5">
            <form action={updateMall} className="bg-white border border-line-soft rounded-sm p-7 space-y-5">
              <input type="hidden" name="id" value={valdMall.id} />
              <div>
                <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">Namn på mallen</label>
                <input type="text" name="namn" defaultValue={valdMall.namn || ''} className={inputStyle} required />
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">Ämne</label>
                <input type="text" name="amne" defaultValue={valdMall.amne || ''} className={inputStyle} placeholder="t.ex. Tack för din förfrågan" />
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">Brödtext</label>
                <textarea
                  name="brodtext"
                  defaultValue={valdMall.brodtext || ''}
                  rows={22}
                  className={`${inputStyle} font-mono text-[13px] leading-relaxed resize-y`}
                />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">
                  Spara mall
                </button>
              </div>
            </form>

            <div className="bg-white border border-line-soft rounded-sm p-7">
              <div className="eyebrow mb-4">Variabler du kan använda</div>
              <p className="text-sm text-ink-muted mb-4">
                Skriv en variabel som <code className="text-accent font-mono text-[12.5px]">{'{{fornamn}}'}</code> i texten så fylls den i automatiskt när du skapar mail från en bokning.
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {VARIABLER.map(function(v) {
                  return (
                    <div key={v.kod} className="flex justify-between gap-3 py-1 border-b border-line-soft last:border-0">
                      <code className="text-accent font-mono text-[12.5px]">{v.kod}</code>
                      <span className="text-ink-muted text-[12.5px]">{v.beskrivning}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-line-soft rounded-sm p-8 text-ink-muted">
            Välj en mall till vänster för att redigera.
          </div>
        )}
      </div>
    </>
  );
}

const inputStyle = 'w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink';
