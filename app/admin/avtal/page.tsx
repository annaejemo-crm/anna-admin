import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const STATUS_FARG: Record<string, string> = {
  utkast: 'bg-line-soft text-ink-muted',
  skickat: 'bg-warn/20 text-warn',
  signat: 'bg-positive/20 text-positive',
  avbruten: 'bg-danger/20 text-danger',
};

const STATUS_LABEL: Record<string, string> = {
  utkast: 'Utkast',
  skickat: 'Skickat',
  signat: 'Signat',
  avbruten: 'Avbruten',
};

export default async function AvtalPage() {
  const supabase = await createClient();

  const { data: avtalRaw } = await supabase
    .from('avtal')
    .select('*, bokning:bokningar(id, datum, kund_id, kund:kunder(fornamn, efternamn, foretagsnamn))')
    .order('created_at', { ascending: false });

  const avtal = (avtalRaw || []) as any[];

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">Avtal & signering</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Avtal</h1>
      </div>

      {avtal.length === 0 ? (
        <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted">
          <p className="font-serif text-xl mb-2 text-ink">Inga avtal än</p>
          <p className="text-sm">
            Klicka på "Avtal" på en bokning för att skapa ditt första digitala avtal.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-line-soft rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle">
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-3 font-medium">Kund</th>
                <th className="px-5 py-3 font-medium">Fotograferingsdatum</th>
                <th className="px-5 py-3 font-medium">Skapat</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right" />
              </tr>
            </thead>
            <tbody>
              {avtal.map(function(a) {
                const b: any = a.bokning;
                const k = b && b.kund ? b.kund : null;
                const namn = k ? (k.foretagsnamn || `${k.fornamn} ${k.efternamn || ''}`.trim()) : '—';
                const farg = STATUS_FARG[a.status] || STATUS_FARG.utkast;
                const label = STATUS_LABEL[a.status] || a.status;
                return (
                  <tr key={a.id} className="border-t border-line-soft hover:bg-bg-subtle/40">
                    <td className="px-5 py-3.5 font-medium">{namn}</td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-ink-muted">{b && b.datum ? b.datum : '—'}</td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-ink-muted">{a.created_at ? a.created_at.substring(0, 10) : ''}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-1 text-[11px] uppercase tracking-wider rounded-sm ${farg}`}>{label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/admin/avtal/${a.id}`} className="text-[12px] text-ink-muted hover:text-ink underline underline-offset-2">
                        Öppna
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
