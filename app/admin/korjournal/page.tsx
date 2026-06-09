export default function KorjournalPage() {
  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">Arbete</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Körjournal</h1>
        <p className="text-sm text-ink-muted mt-3 max-w-xl">
          Här kommer dina resor att fyllas i automatiskt när bokningar markeras klara. Med summa per månad och en knapp för att exportera till revisorn.
        </p>
      </div>
      <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted">
        <p className="font-serif text-xl mb-2 text-ink">Sidan byggs nästa steg</p>
        <p className="text-sm">
          Börja med att lägga upp dina återkommande platser under Inställningar &gt; Platser.
        </p>
      </div>
    </>
  );
}
