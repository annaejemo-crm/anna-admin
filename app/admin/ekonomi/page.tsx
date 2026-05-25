import { createClient } from '@/lib/supabase/server';
import type { DashboardSummary } from '@/lib/types';

export default async function EkonomiPage() {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const { data: summary } = await supabase.rpc('dashboard_summary', { p_ar: year });
  const k = (summary || {}) as DashboardSummary;

  return (
    <>
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">Räkenskapsår {year}</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Ekonomi</h1>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-12">
        <Kpi label="Bokad omsättning" value={`${(k.bokad_omsattning_kr || 0).toLocaleString('sv-SE')} kr`} sub={`${k.antal_bokningar || 0} bokningar`} />
        <Kpi label="Inkommit" value={`${(k.inkommit_kr || 0).toLocaleString('sv-SE')} kr`} sub="registrerade betalningar" />
        <Kpi label="Återstår" value={`${Math.max(0, (k.bokad_omsattning_kr || 0) - (k.inkommit_kr || 0)).toLocaleString('sv-SE')} kr`} sub="bokat minus inkommet" />
        <Kpi label="Väntar paketval" value={String(k.vantar_paketval || 0)} sub="paket att välja" />
      </div>

      <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted">
        <p className="font-serif text-xl mb-2 text-ink">Årsjämförelse och diagram byggs nästa session</p>
        <p className="text-sm">
          När 2024 och 2025-datan är importerad till Supabase visas de fullständigt här.
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-line-soft rounded-sm px-7 py-6">
      <div className="eyebrow mb-3">{label}</div>
      <div className="font-serif text-[38px] leading-none tracking-tight">{value}</div>
      <div className="text-[12px] text-ink-muted mt-1.5">{sub}</div>
    </div>
  );
}
