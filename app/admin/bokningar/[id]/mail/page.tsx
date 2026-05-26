import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveTemplate } from '@/lib/types';
import { MailEditor } from './MailEditor';

export default async function SkapaMailPage(props: { params: Promise<{ id: string }>; searchParams?: Promise<{ mall?: string }> }) {
  const params = await props.params;
  const sp = props.searchParams ? await props.searchParams : {};
  const id = params.id;

  const supabase = await createClient();

  const { data: bokning } = await supabase
    .from('bokningar')
    .select('*, kund:kunder(id, fornamn, efternamn, foretagsnamn, email), fotograferingstyp:fotograferingstyper(namn)')
    .eq('id', id)
    .single();

  if (!bokning) notFound();

  const { data: mallarRaw } = await supabase
    .from('mail_mallar')
    .select('*')
    .order('ordning', { ascending: true });
  const mallar = mallarRaw || [];

  const valdMall: any = sp.mall
    ? mallar.find(function(m: any) { return m.id === sp.mall; })
    : mallar[0];

  const kund: any = bokning.kund;
  const kundNamn = kund.foretagsnamn || `${kund.fornamn} ${kund.efternamn || ''}`.trim();
  const totalt = (bokning.bokningsavgift_kr || 0) + (bokning.bildpaket_kr || 0);

  const variabler = {
    fornamn: kund.fornamn || '',
    efternamn: kund.efternamn || '',
    namn: kundNamn,
    email: kund.email || '',
    typ: bokning.fotograferingstyp ? bokning.fotograferingstyp.namn : '',
    datum: bokning.datum || '',
    tid: bokning.tid || '',
    plats: bokning.plats || '',
    bokningsavgift: bokning.bokningsavgift_kr ? `${bokning.bokningsavgift_kr.toLocaleString('sv-SE')} kr` : '',
    bildpaket: bokning.bildpaket_namn || '',
    totalt: `${totalt.toLocaleString('sv-SE')} kr`,
  };

  const ifyldAmne = valdMall ? resolveTemplate(valdMall.amne || '', variabler) : '';
  const ifyldBrod = valdMall ? resolveTemplate(valdMall.brodtext || '', variabler) : '';

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">
          <Link href={`/admin/kunder/${kund.id}`} className="hover:underline">{kundNamn}</Link>
          {' / Skapa mail'}
        </div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Skapa mail</h1>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-6 max-w-5xl">
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden h-fit">
          <div className="px-4 py-3 bg-bg-subtle text-[11px] uppercase tracking-wider text-ink-muted">Välj mall</div>
          {mallar.map(function(m: any) {
            const aktiv = valdMall && valdMall.id === m.id;
            return (
              <Link
                key={m.id}
                href={`/admin/bokningar/${bokning.id}/mail?mall=${m.id}`}
                className={`block py-3 px-4 border-l-2 transition-colors ${aktiv ? 'bg-bg-subtle border-l-accent' : 'border-l-transparent hover:bg-bg-subtle/60'}`}
              >
                <div className="font-serif text-[14px]">{m.namn}</div>
                <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[0.1em] mt-0.5">{m.kategori || 'övrigt'}</div>
              </Link>
            );
          })}
          {mallar.length === 0 && (
            <div className="p-4 text-sm text-ink-muted">Inga mallar än.</div>
          )}
        </div>

        {valdMall ? (
          <MailEditor
            kundEmail={kund.email || ''}
            kundId={kund.id}
            initialAmne={ifyldAmne}
            initialBrod={ifyldBrod}
          />
        ) : (
          <div className="bg-white border border-line-soft rounded-sm p-8 text-ink-muted">
            Skapa en mall först under <Link href="/admin/mail" className="underline">Mailmallar</Link>.
          </div>
        )}
      </div>
    </>
  );
}
