import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { sparaMall, skapaMall } from './actions';

const PLATSHALLARE: { kod: string; forklaring: string }[] = [
  { kod: '{{KUND_NAMN}}', forklaring: 'Kundens namn, eller företagsnamn om det är en företagskund' },
  { kod: '{{KUND_TELEFON}}', forklaring: 'Kundens telefonnummer' },
  { kod: '{{KUND_EMAIL}}', forklaring: 'Kundens mejladress' },
  { kod: '{{DATUM}}', forklaring: 'Fotograferingens datum' },
  { kod: '{{TID}}', forklaring: 'Fotograferingens tid' },
  { kod: '{{PLATS}}', forklaring: 'Plats för fotograferingen' },
  { kod: '{{BOKNINGSAVGIFT}}', forklaring: 'Bokningsavgiften i kronor' },
  { kod: '{{PAKET_OCH_PRIS}}', forklaring: 'Valt bildpaket och pris, annars text om att paket väljs efteråt' },
  { kod: '{{TOTAL_KOSTNAD}}', forklaring: 'Bokningsavgift plus bildpaket' },
  { kod: '{{ANTAL_TIMMAR}}', forklaring: 'Fotograferingens längd' },
  { kod: '{{GRAVIDITETSVECKA}}', forklaring: 'Graviditetsvecka, används i gravidmallen' },
  { kod: '{{TILLVAL}}', forklaring: 'Eventuella tillval' },
];

export default async function AvtalsmallarPage(props: { searchParams?: Promise<{ mall?: string; sparat?: string }> }) {
  const sp = props.searchParams ? await props.searchParams : {};
  const supabase = await createClient();

  const { data: mallarRaw } = await supabase
    .from('avtal_mallar')
    .select('id, namn, fotograferingstyp, klausuler, ordning')
    .order('ordning');

  const mallar = (mallarRaw || []) as any[];
  const vald: any = (sp.mall ? mallar.find(function (m: any) { return m.id === sp.mall; }) : null) || (mallar.length > 0 ? mallar[0] : null);
  const klausuler: any[] = vald && Array.isArray(vald.klausuler) ? vald.klausuler : [];

  const { data: typerRaw } = await supabase
    .from('fotograferingstyper')
    .select('namn')
    .order('ordning');
  const typer = (typerRaw || []) as any[];

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">
          <Link href="/admin/avtal" className="hover:underline">Avtal &amp; signering</Link>
          {' / Mallar'}
        </div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Avtalsmallar</h1>
        <p className="text-sm text-ink-muted mt-3 max-w-2xl">
          Här står texten som hamnar i avtalen. Varje mall hör till en fotograferingstyp, så en gravidbokning får gravidtexten och en familjebokning familjetexten. Ändringar gäller nya avtal, redan skickade avtal ligger kvar som de var.
        </p>
      </div>

      {sp.sparat === '1' && (
        <div className="border border-positive/30 bg-positive/5 rounded-sm px-5 py-4 text-sm mb-6 max-w-3xl">
          Mallen är sparad.
        </div>
      )}

      {mallar.length === 0 ? (
        <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted max-w-3xl">
          <p className="font-serif text-xl mb-2 text-ink">Inga mallar än</p>
          <p className="text-sm">Skapa en mall nedan för att komma igång.</p>
        </div>
      ) : (
        <div className="max-w-3xl space-y-8">
          <div className="flex flex-wrap gap-2">
            {mallar.map(function (m: any) {
              const aktiv = vald && m.id === vald.id;
              return (
                <a
                  key={m.id}
                  href={`/admin/avtal/mallar?mall=${m.id}`}
                  className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                    aktiv ? 'bg-ink text-bg' : 'bg-white border border-line-soft text-ink hover:border-line'
                  }`}
                >
                  {m.namn}
                </a>
              );
            })}
          </div>

          {vald && (
            <form action={sparaMall} className="space-y-6">
              <input type="hidden" name="id" value={vald.id} />

              <div className="bg-white border border-line-soft rounded-sm p-6 grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">Mallens namn</label>
                  <input
                    type="text"
                    name="namn"
                    defaultValue={vald.namn || ''}
                    className="w-full px-3 py-2 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">Gäller fotograferingstyp</label>
                  <input
                    type="text"
                    name="fotograferingstyp"
                    defaultValue={vald.fotograferingstyp || ''}
                    placeholder="Lämna tomt om mallen inte ska väljas automatiskt"
                    className="w-full px-3 py-2 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
                  />
                  <p className="text-[11px] text-ink-muted mt-1.5">
                    Dina typer: {typer.length > 0 ? typer.map(function (t: any) { return t.namn; }).join(', ') : 'inga upplagda'}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-line-soft rounded-sm p-6">
                <div className="eyebrow mb-2">Klausuler</div>
                <p className="text-sm text-ink-muted mb-5">
                  Töm både titel och text för att radera en klausul. De tomma fälten längst ner är till för nya.
                </p>
                <div className="space-y-6">
                  {klausuler.map(function (kl: any, i: number) {
                    return (
                      <div key={i} className="border-l-2 border-line-soft pl-5">
                        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint mb-1.5">
                          Klausul {i + 1}
                        </div>
                        <input
                          type="text"
                          name="klausul_titel"
                          defaultValue={kl.titel || ''}
                          placeholder="Klausulens titel"
                          className="w-full px-3 py-2 bg-white border border-line-soft rounded-sm text-sm font-medium mb-2 focus:outline-none focus:border-ink"
                        />
                        <textarea
                          name="klausul_brod"
                          defaultValue={kl.brodtext || ''}
                          rows={7}
                          placeholder="Brödtext"
                          className="w-full px-3 py-2 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink resize-y"
                        />
                      </div>
                    );
                  })}

                  {[0, 1].map(function (n: number) {
                    return (
                      <div key={`ny-${n}`} className="border-l-2 border-dashed border-line-soft pl-5">
                        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint mb-1.5">
                          Ny klausul
                        </div>
                        <input
                          type="text"
                          name="klausul_titel"
                          defaultValue=""
                          placeholder="Klausulens titel"
                          className="w-full px-3 py-2 bg-white border border-line-soft rounded-sm text-sm font-medium mb-2 focus:outline-none focus:border-ink"
                        />
                        <textarea
                          name="klausul_brod"
                          defaultValue=""
                          rows={4}
                          placeholder="Brödtext"
                          className="w-full px-3 py-2 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink resize-y"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-line-soft rounded-sm p-6">
                <div className="eyebrow mb-2">Platshållare</div>
                <p className="text-sm text-ink-muted mb-4">
                  Skriv dessa i texten så byts de ut mot bokningens uppgifter när avtalet skapas.
                </p>
                <dl className="grid grid-cols-[190px_1fr] gap-y-2 gap-x-4 text-[13px]">
                  {PLATSHALLARE.map(function (p) {
                    return (
                      <div key={p.kod} className="contents">
                        <dt className="font-mono text-[12px]">{p.kod}</dt>
                        <dd className="text-ink-muted">{p.forklaring}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Link href="/admin/avtal" className="text-sm text-ink-muted hover:text-ink">Tillbaka</Link>
                <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">
                  Spara mall
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="max-w-3xl mt-12 pt-8 border-t border-line">
        <div className="eyebrow mb-3">Ny mall</div>
        <form action={skapaMall} className="flex gap-3 items-end">
          <div className="flex-1 max-w-sm">
            <label className="block text-[11px] uppercase tracking-wider text-ink-muted mb-1.5">Namn</label>
            <input
              type="text"
              name="namn"
              placeholder="Till exempel Nyföddfotografering"
              className="w-full px-3 py-2 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <button type="submit" className="px-4 py-2 border border-line-soft rounded-sm text-sm hover:border-ink transition-colors">
            Skapa tom mall
          </button>
        </form>
      </div>
    </>
  );
}
