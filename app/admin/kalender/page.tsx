export default function KalenderPage() {
  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">Vy</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Kalender</h1>
      </div>
      <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted">
        <p className="font-serif text-xl mb-2 text-ink">Kalendervy byggs senare</p>
        <p className="text-sm">
          Visualiserar bokningar per månad/vecka. Synkar med Google Calendar.
        </p>
      </div>
    </>
  );
}
