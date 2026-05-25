import { STATUS_LABELS, type StatusKod } from '@/lib/types';

const COLOR: Record<StatusKod, string> = {
  forfragan: 'text-ink-faint',
  bokad: 'text-accent',
  avtal_skickat: 'text-warn',
  signat: 'text-sage',
  fotograferad: 'text-accent',
  paket_att_valja: 'text-warn',
  levererat: 'text-positive',
  betald: 'text-positive',
  klar: 'text-positive',
  avbokad: 'text-danger',
};

export function StatusPill({ status }: { status: StatusKod }) {
  return (
    <span className={`pill ${COLOR[status] || 'text-ink-muted'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
