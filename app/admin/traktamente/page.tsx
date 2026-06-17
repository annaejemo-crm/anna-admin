import { createClient } from '@/lib/supabase/server';
import { skapaTraktamentepost, uppdateraTraktamentepost, raderaTraktamentepost } from './actions';
import type { Traktamentepost } from '@/lib/traktamente';
import Link from 'next/link';

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

function formatDate(d: string): string {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getDate()} ${MONTH_NAMES[dt.getMonth()].slice(0, 3)}`;
}

export default async function TraktamentePage(props: { searchParams?: Promise<{ ar?: string; edit?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};
  const aktuelltAr = new Date().getFullYear();
  const valtAr = sp.ar ? parseInt(sp.ar, 10) : aktuelltAr;
  const editingId = sp.edit || null;

  let editingPost: Traktamentepost | null = null;
  if (editingId) {
    const { data: editData } = await supabase
      .from('traktamente_poster')
      .select('*')
      .eq('id', editingId)
      .maybeSingle();
    editingPost = (editData || null) as Traktamentepost | null;
  }

  const start = `${valtAr}-01-01`;
  const slut = `${valtAr}-12-31`;

  const { data } = await supabase
    .from('traktamente_poster')
    .select('*')
    .gte('avresa', start)
    .lte('avresa', slut)
    .order('avresa', { ascending: true });

  const poster = (data || []) as Traktamentepost[];

  const grupperat: Record<number, Traktamentepost[]> = {};
  for (const p of poster) {
    const m = new Date(p.avresa + 'T00:00:00').getMonth();
    (grupperat[m] ||= []).push(p);
  }

  const aretBrutto = poster.reduce((s, p) => s + (p.brutto_kr || 0), 0);
  const aretAvdrag = poster.reduce((s, p) => s + (p.maltidsavdrag_kr || 0), 0);
  const aretTotalt = poster.reduce((s, p) => s + (p.totalt_kr || 0), 0);

  const idagDatum = new Date().toISOString().slice(0, 10);

  // Defaults för formuläret (Lägg till eller Redigera)
  const formAction = editingPost ? uppdateraTraktamentepost : skapaTraktamentepost;
  const formRubrik = editingPost ? 'Redigera resa' : 'Lägg till resa';
  const sparaText = editingPost ? 'Uppdatera' : 'Spara';
  const fAvresa = editingPost?.avresa || idagDatum;
  const fHemkomst = editingPost?.hemkomst || idagDatum;
  const fDestination = editingPost?.destination || '';
  const fSyfte = editingPost?.syfte || 'Fotografering';
  const fAvreseDel = editingPost ? (editingPost.antal_halvdagar === 2 ? 'halv' : 'hel') : 'hel';
  const fHemkomstDel = editingPost ? (editingPost.antal_halvdagar >= 1 ? 'halv' : 'hel') : 'halv';
  const fFrukost = editingPost?.maltider_frukost ?? 0;
  const fLunch = editingPost?.maltider_lunch ?? 0;
  const fMiddag = editingPost?.maltider_middag ?? 0;
  const fAnteckning = editingPost?.anteckning || '';
  const fBoende = editingPost
    ? editingPost.antal_natter === 0 && editingPost.avresa !== editingPost.hemkomst
    : false;

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="flex justify-between items-end">
          <div>
            <div className="eyebrow mb-1.5">Arbete</div>
            <h1 className="font-serif text-[42px] font-light leading-tight">Traktamente</h1>
            <p className="text-sm text-ink-muted mt-3 max-w-xl">
              Skattefria traktamenten enligt Skatteverkets schablon (290 kr heldag, 145 kr halvdag, 145 kr per natt). Måltidsavdrag dras automatiskt. Skicka filen till revisorn i slutet av månaden eller kvartalet.
            </p>
          </div>
          <a
            href={`/admin/traktamente/export?ar=${valtAr}`}
            className="text-sm px-4 py-2 border border-line-soft rounded-sm hover:border-ink transition-colors"
          >
            Exportera till Excel
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint">År:</span>
          <YearPill ar={2026} aktiv={valtAr === 2026} aktuellt={aktuelltAr === 2026} />
          <YearPill ar={2025} aktiv={valtAr === 2025} aktuellt={aktuelltAr === 2025} />
          <YearPill ar={2024} aktiv={valtAr === 2024} aktuellt={aktuelltAr === 2024} />
        </div>
        <div className="text-sm text-ink-muted">
          Året totalt: <strong className="text-ink font-medium">{aretBrutto.toLocaleString('sv-SE')} kr</strong>
          <span className="mx-2 text-ink-faint">·</span>
          <span>Måltidsavdrag {aretAvdrag.toLocaleString('sv-SE')} kr</span>
          <span className="mx-2 text-ink-faint">·</span>
          <strong className="text-ink font-medium">Att betala ut {aretTotalt.toLocaleString('sv-SE')} kr</strong>
        </div>
      </div>

      {/* Lägg till eller redigera resa */}
      <section className={`bg-white border ${editingPost ? 'border-ink' : 'border-line-soft'} rounded-sm p-5 mb-8`}>
        <div className="flex justify-between items-center mb-3">
          <div className="eyebrow">{formRubrik}</div>
          {editingPost && (
            <Link href={`/admin/traktamente?ar=${valtAr}`} className="text-[12px] text-ink-muted hover:text-ink">
              Avbryt redigering
            </Link>
          )}
        </div>
        <form action={formAction} className="space-y-3">
          {editingPost && <input type="hidden" name="id" value={editingPost.id} />}

          <div className="bg-bg-subtle border border-line-soft rounded-sm p-3 text-[12.5px] text-ink-muted space-y-1.5">
            <div><strong className="text-ink">Schablonen täcker dina egna kostnader.</strong> Heldag 290 kr, halvdag 145 kr. Du behöver inte rapportera vad du själv betalat för mat eller småttis.</div>
            <div><strong className="text-ink">Frukost, lunch, middag nedan:</strong> ange bara antal som NÅGON ANNAN bjudit på (kund som bjuder, hotellfrukost, etc). Lämna 0 om du betalade allt själv.</div>
            <div><strong className="text-ink">Boendet:</strong> bocka rutan längst ner om kunden betalt hotellet ELLER om ditt AB tar hotellkvittot som kostnad. Då dras nattschablonen 145 kr bort.</div>
          </div>

          <div className="grid grid-cols-[140px_140px_1.5fr_1fr_140px_140px] gap-2 items-end">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1">Avresa</label>
              <input type="date" name="avresa" required defaultValue={fAvresa} className="w-full px-2 py-2 border border-line-soft rounded-sm text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1">Hemkomst</label>
              <input type="date" name="hemkomst" required defaultValue={fHemkomst} className="w-full px-2 py-2 border border-line-soft rounded-sm text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1">Destination</label>
              <input type="text" name="destination" required placeholder="t.ex. Visby, Gotland" defaultValue={fDestination} className="w-full px-2 py-2 border border-line-soft rounded-sm text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1">Syfte</label>
              <input type="text" name="syfte" defaultValue={fSyfte} className="w-full px-2 py-2 border border-line-soft rounded-sm text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1" title="Hel: avresa före 12. Halv: efter 12.">Avresedag</label>
              <select name="avreseDel" defaultValue={fAvreseDel} className="w-full px-2 py-2 border border-line-soft rounded-sm text-sm bg-white">
                <option value="hel">Hel (före 12)</option>
                <option value="halv">Halv (efter 12)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1" title="Hel: hemkomst efter 19. Halv: före 19.">Hemkomstdag</label>
              <select name="hemkomstDel" defaultValue={fHemkomstDel} className="w-full px-2 py-2 border border-line-soft rounded-sm text-sm bg-white">
                <option value="hel">Hel (efter 19)</option>
                <option value="halv">Halv (före 19)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-[100px_100px_100px_1fr_auto] gap-2 items-end">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1" title="Antal frukostar som någon annan bjudit på under hela resan">Frukost</label>
              <input type="number" name="maltider_frukost" min="0" defaultValue={fFrukost} className="w-full px-2 py-2 border border-line-soft rounded-sm text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1" title="Antal luncher som någon annan bjudit på under hela resan">Lunch</label>
              <input type="number" name="maltider_lunch" min="0" defaultValue={fLunch} className="w-full px-2 py-2 border border-line-soft rounded-sm text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1" title="Antal middagar som någon annan bjudit på under hela resan">Middag</label>
              <input type="number" name="maltider_middag" min="0" defaultValue={fMiddag} className="w-full px-2 py-2 border border-line-soft rounded-sm text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1">Anteckning</label>
              <input type="text" name="anteckning" placeholder="Valfritt" defaultValue={fAnteckning} className="w-full px-2 py-2 border border-line-soft rounded-sm text-sm" />
            </div>
            <button type="submit" className="px-4 py-2 bg-ink text-bg text-sm rounded-sm">{sparaText}</button>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-ink-muted pt-1">
            <input type="checkbox" name="boende_betalat" defaultChecked={fBoende} className="w-4 h-4" />
            <span>Boendet betalat av kund eller annan (ingen nattschablon dras)</span>
          </label>
        </form>
      </section>

      {poster.length === 0 ? (
        <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted">
          <p className="font-serif text-xl mb-2 text-ink">Inga resor för {valtAr} än</p>
          <p className="text-sm">
            Lägg till din första resa ovan. Snart kommer du även kunna fylla i traktamente direkt på en bokning.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {MONTH_NAMES.map((mNamn, mIdx) => {
            const matchande = grupperat[mIdx];
            if (!matchande || matchande.length === 0) return null;
            const mBrutto = matchande.reduce((s, p) => s + (p.brutto_kr || 0), 0);
            const mAvdrag = matchande.reduce((s, p) => s + (p.maltidsavdrag_kr || 0), 0);
            const mTotalt = matchande.reduce((s, p) => s + (p.totalt_kr || 0), 0);
            return (
              <section key={mIdx} className="bg-white border border-line-soft rounded-sm overflow-hidden">
                <header className="bg-bg-subtle px-5 py-3 border-b border-line flex justify-between items-center">
                  <span className="font-mono text-[10.5px] tracking-[0.22em] uppercase font-medium">{mNamn}</span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {matchande.length} {matchande.length === 1 ? 'resa' : 'resor'}
                    <span className="mx-3 text-ink-faint">·</span>
                    Brutto <strong className="text-ink font-medium">{mBrutto.toLocaleString('sv-SE')} kr</strong>
                    <span className="mx-3 text-ink-faint">·</span>
                    Avdrag {mAvdrag.toLocaleString('sv-SE')} kr
                    <span className="mx-3 text-ink-faint">·</span>
                    Totalt <strong className="text-ink font-medium">{mTotalt.toLocaleString('sv-SE')} kr</strong>
                  </span>
                </header>
                <div className="text-sm">
                  <div className="grid grid-cols-[110px_110px_1.5fr_1fr_70px_70px_70px_100px_60px] text-left text-[11px] uppercase tracking-wider text-ink-muted border-b border-line-soft">
                    <div className="px-3 py-2.5 font-medium">Avresa</div>
                    <div className="px-3 py-2.5 font-medium">Hemkomst</div>
                    <div className="px-3 py-2.5 font-medium">Destination</div>
                    <div className="px-3 py-2.5 font-medium">Syfte</div>
                    <div className="px-3 py-2.5 font-medium text-right">Hel</div>
                    <div className="px-3 py-2.5 font-medium text-right">Halv</div>
                    <div className="px-3 py-2.5 font-medium text-right">Natt</div>
                    <div className="px-3 py-2.5 font-medium text-right">Totalt</div>
                    <div className="px-3 py-2.5 font-medium" />
                  </div>
                  {matchande.map((p) => (
                    <div key={p.id} className="grid grid-cols-[110px_110px_1.5fr_1fr_70px_70px_70px_100px_60px] border-b border-line-soft last:border-0 items-center hover:bg-bg/50">
                      <div className="px-3 py-3 font-mono text-[12px]">{formatDate(p.avresa)}</div>
                      <div className="px-3 py-3 font-mono text-[12px]">{formatDate(p.hemkomst)}</div>
                      <div className="px-3 py-3">{p.destination}</div>
                      <div className="px-3 py-3 text-ink-muted">{p.syfte}</div>
                      <div className="px-3 py-3 text-right font-mono text-[12px]">{p.antal_heldagar}</div>
                      <div className="px-3 py-3 text-right font-mono text-[12px]">{p.antal_halvdagar}</div>
                      <div className="px-3 py-3 text-right font-mono text-[12px]">{p.antal_natter}</div>
                      <div className="px-3 py-3 text-right font-mono text-[12.5px] font-medium">{Number(p.totalt_kr).toLocaleString('sv-SE')} kr</div>
                      <div className="px-3 py-3 text-right flex gap-3 justify-end items-center">
                        <Link href={`/admin/traktamente?ar=${valtAr}&edit=${p.id}`} title="Redigera" className="text-ink-faint hover:text-ink text-sm">✎</Link>
                        <form action={raderaTraktamentepost}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" title="Ta bort" className="text-ink-faint hover:text-danger text-sm">×</button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function YearPill(props: { ar: number; aktiv: boolean; aktuellt: boolean }) {
  return (
    <a
      href={`/admin/traktamente?ar=${props.ar}`}
      className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
        props.aktiv ? 'bg-ink text-bg' : 'bg-white border border-line-soft text-ink hover:border-line'
      }`}
    >
      {props.ar}{props.aktuellt ? ' · aktuellt' : ''}
    </a>
  );
}
