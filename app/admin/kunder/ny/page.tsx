export default function NyKundPage() {
  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">Ny kund och bokning</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Skapa ny bokning</h1>
      </div>
      <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted">
        <p className="font-serif text-xl mb-2 text-ink">Formulär byggs nästa session</p>
        <p className="text-sm">
          Här kommer ett formulär för att skapa en ny kund (eller välja befintlig)
          <br />och samtidigt lägga in en bokning med datum, plats, typ och bokningsavgift.
        </p>
      </div>
    </>
  );
}
