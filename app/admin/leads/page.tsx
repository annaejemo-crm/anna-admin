import { createClient } from '@/lib/supabase/server';

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('guide_leads')
    .select('*')
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
        automatiskt när de bekräftat sin mejladress i MailerLite.
      </p>

      <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 text-left border-b border-line bg-bg font-medium">Datum</th>
              <th className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 text-left border-b border-line bg-bg font-medium">Namn</th>
              <th className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 text-left border-b border-line bg-bg font-medium">Email</th>
              <th className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-faint py-3.5 px-5 text-left border-b border-line bg-bg font-medium">Källa</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 px-5 text-sm text-ink-muted text-center">
                  Inga leads än. De dyker upp här när någon laddar ner guiden.
                </td>
              </tr>
            )}
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-line-soft last:border-0">
                <td className="py-3.5 px-5 text-sm whitespace-nowrap">{formatDate(l.created_at)}</td>
                <td className="py-3.5 px-5 text-sm">{l.namn || '–'}</td>
                <td className="py-3.5 px-5 text-sm">
                  {l.email ? (
                    <a href={`mailto:${l.email}`} className="underline decoration-line hover:decoration-ink">
                      {l.email}
                    </a>
                  ) : (
                    '–'
                  )}
                </td>
                <td className="py-3.5 px-5 text-sm text-ink-muted">{l.kalla || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
