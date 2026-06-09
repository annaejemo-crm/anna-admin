import { createClient } from '@/lib/supabase/server';
import { skapaPlats, uppdateraPlats, radera_plats } from './actions';

export default async function PlatserPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('platser')
    .select('*')
    .order('namn', { ascending: true });

  const platser = (data || []) as any[];

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">Inställningar</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Platser</h1>
        <p className="text-sm text-ink-muted mt-3 max-w-xl">
          Lägg upp platser du återkommer till. När du sedan väljer en plats på en bokning räknas avståndet automatiskt in i din körjournal när bokningen markeras klar.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-8">
        <section>
          <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle">
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
                  <th className="px-4 py-3 font-medium">Plats</th>
                  <th className="px-4 py-3 font-medium">Adress</th>
                  <th className="px-4 py-3 font-medium text-right">Avstånd enkel väg</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {platser.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-ink-faint">
                      Inga platser än. Lägg upp din första till höger.
                    </td>
                  </tr>
                ) : (
                  platser.map((p: any) => (
                    <tr key={p.id} className="border-t border-line-soft">
                      <td className="px-4 py-3.5">
                        <details>
                          <summary className="cursor-pointer">
                            <span className="font-serif text-[15px]">{p.namn}</span>
                            {!p.aktiv && <span className="text-[11px] text-ink-faint ml-2">(arkiverad)</span>}
                          </summary>
                          <div className="mt-3">
                            <form action={uppdateraPlats} className="space-y-3 text-sm">
                              <input type="hidden" name="id" value={p.id} />
                              <input
                                name="namn"
                                defaultValue={p.namn}
                                placeholder="Namn"
                                className="w-full px-3 py-2 border border-line-soft rounded-sm"
                              />
                              <input
                                name="adress"
                                defaultValue={p.adress || ''}
                                placeholder="Adress (valfritt)"
                                className="w-full px-3 py-2 border border-line-soft rounded-sm"
                              />
                              <input
                                name="avstand_km_enkel"
                                defaultValue={p.avstand_km_enkel || ''}
                                placeholder="Avstånd från Glasyrvägen 33 (km enkel väg)"
                                inputMode="decimal"
                                className="w-full px-3 py-2 border border-line-soft rounded-sm"
                              />
                              <textarea
                                name="anteckning"
                                defaultValue={p.anteckning || ''}
                                placeholder="Anteckning"
                                rows={2}
                                className="w-full px-3 py-2 border border-line-soft rounded-sm resize-y"
                              />
                              <label className="flex items-center gap-2 text-[12px]">
                                <input
                                  type="checkbox"
                                  name="aktiv"
                                  defaultChecked={p.aktiv !== false}
                                  className="rounded-sm"
                                />
                                Visa i listor (avmarkera för att arkivera)
                              </label>
                              <div className="flex justify-between items-center pt-2">
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-ink text-bg text-[12px] rounded-sm"
                                >
                                  Spara
                                </button>
                              </div>
                            </form>
                            <form action={radera_plats} className="mt-2">
                              <input type="hidden" name="id" value={p.id} />
                              <button
                                type="submit"
                                className="text-[11px] text-danger hover:underline"
                              >
                                Radera plats
                              </button>
                            </form>
                          </div>
                        </details>
                      </td>
                      <td className="px-4 py-3.5 text-ink-muted text-[13px]">{p.adress || '—'}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-[12.5px]">
                        {p.avstand_km_enkel != null
                          ? `${Number(p.avstand_km_enkel).toLocaleString('sv-SE')} km`
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[11px] text-ink-faint">
                        {p.avstand_km_enkel != null
                          ? `T/R ${(Number(p.avstand_km_enkel) * 2).toLocaleString('sv-SE')} km`
                          : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="bg-white border border-line-soft rounded-sm p-6 h-fit">
          <div className="eyebrow mb-3">Lägg till ny plats</div>
          <form action={skapaPlats} className="space-y-3 text-sm">
            <div>
              <label className="eyebrow mb-1.5 block">Namn</label>
              <input
                name="namn"
                required
                placeholder="Hemmet, Germaniaviken..."
                className="w-full px-3 py-2 border border-line-soft rounded-sm"
              />
            </div>
            <div>
              <label className="eyebrow mb-1.5 block">Adress (valfritt)</label>
              <input
                name="adress"
                placeholder="Gata, ort"
                className="w-full px-3 py-2 border border-line-soft rounded-sm"
              />
            </div>
            <div>
              <label className="eyebrow mb-1.5 block">Avstånd från ditt hem (km enkel väg)</label>
              <input
                name="avstand_km_enkel"
                inputMode="decimal"
                placeholder="12.5"
                className="w-full px-3 py-2 border border-line-soft rounded-sm"
              />
              <p className="text-[11px] text-ink-faint mt-1">Från Glasyrvägen 33, Kungsängen</p>
            </div>
            <div>
              <label className="eyebrow mb-1.5 block">Anteckning (valfritt)</label>
              <textarea
                name="anteckning"
                rows={2}
                className="w-full px-3 py-2 border border-line-soft rounded-sm resize-y"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90"
            >
              Lägg till
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
