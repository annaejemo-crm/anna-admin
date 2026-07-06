import { createClient } from '@/lib/supabase/server';
import { LeadsUtskick } from './LeadsUtskick';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('guide_leads')
    .select('id, namn, email, kalla, created_at, senast_mejlad_at, avregistrerad')
    .order('created_at', { ascending: false });

  const leads = (data || []) as any[];
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

      <p className="text-sm text-ink-muted mb-8 max-w-[600px]">
        Fotografer som laddat ner gratisguiden Att fotografera väntan. Nya hamnar här
        automatiskt när de bekräftat sin mejladress i MailerLite. Kryssa i vilka som
        ska få ett mejl och skriv ditt utskick längst ner.
      </p>

      <LeadsUtskick leads={leads} />
    </>
  );
}
