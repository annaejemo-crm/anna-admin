import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { LeadsUtskick } from './LeadsUtskick';

export const dynamic = 'force-dynamic';

export default async function LeadsPage(props: { searchParams?: Promise<{ typ?: string }> }) {
  const supabase = await createClient();
  const sp = props.searchParams ? await props.searchParams : {};
  const valdTyp = sp.typ === 'kunder' ? 'kund' : 'fotograf';

  const { data } = await supabase
    .from('guide_leads')
    .select('*')
    .order('created_at', { ascending: false });

  const alla = (data || []) as any[];
  const kunder = alla.filter((l) => l.kalla === 'Gravidguide');
  const fotografer = alla.filter((l) => l.kalla !== 'Gravidguide');
  const leads = valdTyp === 'kund' ? kunder : fotografer;

  const senaste30 = leads.filter(
    (l) => new Date(l.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  ).length;

  return (
    <>
      <div className="flex justify-between items-end mb-6 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">{leads.length} totalt · {senaste30} senaste 30 dagarna</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Guideleads</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <TypPill href="/admin/leads" label={`Fotografer (${fotografer.length})`} aktiv={valdTyp === 'fotograf'} />
        <TypPill href="/admin/leads?typ=kunder" label={`Kunder (${kunder.length})`} aktiv={valdTyp === 'kund'} />
      </div>

      <p className="text-sm text-ink-muted mb-8 max-w-[640px]">
        {valdTyp === 'kund'
          ? 'Blivande kunder som laddat ner guiden Så förbereder du dig inför din gravidfotografering. Nya hamnar här automatiskt när de bekräftat sin mejladress i MailerLite.'
          : 'Fotografer som laddat ner gratisguiden Att fotografera väntan. Nya hamnar här automatiskt när de bekräftat sin mejladress i MailerLite.'}
        {' '}Kryssa i vilka som ska få ett mejl och skriv ditt utskick längst ner.
      </p>

      <LeadsUtskick leads={leads} />
    </>
  );
}

function TypPill(props: { href: string; label: string; aktiv: boolean }) {
  return (
    <Link
      href={props.href}
      className={`px-4 py-1.5 text-sm rounded-sm transition-colors ${
        props.aktiv ? 'bg-ink text-bg' : 'bg-white border border-line-soft text-ink hover:border-line'
      }`}
    >
      {props.label}
    </Link>
  );
}
