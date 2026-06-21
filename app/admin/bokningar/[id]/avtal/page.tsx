import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { skapaAvtal } from '@/app/admin/avtal/actions';

const STANDARD_KLAUSULER: { titel: string; brodtext: string }[] = [
  {
    titel: 'Bokning och bokningsavgift',
    brodtext: 'Bokningen är bindande när bokningsavgiften är betald. Bokningsavgiften är inte återbetalningsbar vid avbokning från kundens sida.',
  },
  {
    titel: 'Ombokning och avbokning',
    brodtext: 'Vid sjukdom eller särskilda omständigheter kan tiden ombokas inom 6 månader, max en gång, i mån av plats. Avbokning från fotografens sida på grund av sjukdom eller force majeure ger rätt till full återbetalning av bokningsavgiften.',
  },
  {
    titel: 'Bildleverans och bildpaket',
    brodtext: 'Bildpaket väljs efter fotograferingen utifrån de paket som finns på annaejemo.se. Leveranstid är cirka 4-6 veckor från fotograferingsdagen. Bilder levereras digitalt via privat galleri.',
  },
  {
    titel: 'Bildrättigheter och användning',
    brodtext: 'Anna Ejemo äger upphovsrätten till bilderna. Kunden har full rätt att använda bilderna privat, dela dem i sociala medier och skriva ut för eget bruk. Vid återgivning i sociala medier önskas att fotograf Anna Ejemo taggas. Kommersiell användning av bilderna kräver separat överenskommelse.',
  },
  {
    titel: 'Hantering av personuppgifter',
    brodtext: 'Kundens uppgifter sparas för bokföringsändamål enligt bokföringslagen och raderas därefter. Bilderna sparas i 12 månader efter leverans, därefter raderas de om inget annat överenskommits.',
  },
];

export default async function NyttAvtalPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();

  const { data: bokning } = await supabase
    .from('bokningar')
    .select('*, kund:kunder(id, fornamn, efternamn, foretagsnamn, email), fotograferingstyp:fotograferingstyper(namn)')
    .eq('id', params.id)
    .single();

  if (!bokning) notFound();

  const { data: mallar } = await supabase
    .from('avtal_mallar')
    .select('id, namn, klausuler')
    .order('ordning');

  const valdMall: any = (mallar && mallar.find(function(m: any) { return m.namn === 'Familjefotografering' || m.namn === 'Gravidfotografering'; })) || (mallar && mallar.length > 0 ? mallar[0] : null);
  const startKlausuler: any[] = valdMall && Array.isArray(valdMall.klausuler) && valdMall.klausuler.length > 0
    ? valdMall.klausuler
    : STANDARD_KLAUSULER;

  const k: any = bokning.kund;
  const kundNamn = k.foretagsnamn || `${k.fornamn} ${k.efternamn || ''}`.trim();

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">
          <Link href={`/admin/kunder/${k.id}`} className="hover:underline">{kundNamn}</Link>
          {' / Skapa avtal'}
        </div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Nytt avtal</h1>
      </div>

      <form action={skapaAvtal} className="space-y-8 max-w-3xl">
        <input type="hidden" name="bokning_id" value={bokning.id} />
        {valdMall && <input type="hidden" name="mall_id" value={valdMall.id} />}

        <div className="bg-white border border-line-soft rounded-sm p-6">
          <div className="eyebrow mb-4">Sammanfattning</div>
          <dl className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Kund</dt>
              <dd>{kundNamn}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Email</dt>
              <dd className="font-mono text-[12.5px]">{k.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Typ</dt>
              <dd>{bokning.fotograferingstyp ? bokning.fotograferingstyp.namn : '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Datum & tid</dt>
              <dd className="font-mono text-[12.5px]">{bokning.datum || '—'} {bokning.tid || ''}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Plats</dt>
              <dd>{bokning.plats || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted mb-0.5">Bokningsavgift</dt>
              <dd>{bokning.bokningsavgift_kr ? `${bokning.bokningsavgift_kr.toLocaleString('sv-SE')} kr` : '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-line-soft rounded-sm p-6">
          <div className="eyebrow mb-4">Personligt meddelande (visas högst upp i avtalet)</div>
          <textarea
            name="personligt_meddelande"
            rows={3}
            placeholder="Valfritt. T.ex. Tack för att du valt mig. Här kommer ditt avtal för signering."
            className="w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink resize-y"
          />
        </div>

        <div className="bg-white border border-line-soft rounded-sm p-6">
          <div className="eyebrow mb-4">Klausuler ({startKlausuler.length} st)</div>
          <p className="text-sm text-ink-muted mb-5">
            Redigera klausuler om du vill. Tomma klausuler hoppas över när du skapar avtalet.
          </p>
          <div className="space-y-5">
            {startKlausuler.map(function(kl: any, i: number) {
              return (
                <div key={i} className="border-l-2 border-line-soft pl-5">
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
                    rows={3}
                    placeholder="Brödtext"
                    className="w-full px-3 py-2 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink resize-y"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-line">
          <Link href={`/admin/kunder/${k.id}`} className="text-sm text-ink-muted hover:text-ink">Avbryt</Link>
          <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">
            Skapa utkast
          </button>
        </div>
      </form>
    </>
  );
}
