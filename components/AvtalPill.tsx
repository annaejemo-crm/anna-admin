import type { AvtalStatusKort } from '@/lib/types';

const FARG: Record<AvtalStatusKort, string> = {
  inget: 'text-ink-faint',
  skickat: 'text-warn',
  signerat: 'text-positive',
};

const ETIKETT: Record<AvtalStatusKort, string> = {
  inget: '–',
  skickat: 'Skickat',
  signerat: 'Signerat',
};

export function AvtalPill({ status }: { status: AvtalStatusKort }) {
  if (status === 'inget') {
    return <span className="text-ink-faint text-[13px]">–</span>;
  }
  return (
    <span className={`pill ${FARG[status]}`}>
      {ETIKETT[status]}
    </span>
  );
}
