export default function AvtalPage() {
  return (
    <>
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-line">
        <div>
          <div className="eyebrow mb-1.5">Avtal du skickat till kunder</div>
          <h1 className="font-serif text-[42px] font-light leading-tight">Avtal & signering</h1>
        </div>
      </div>
      <div className="bg-white border border-dashed border-line p-16 rounded-sm text-center text-ink-muted">
        <p className="font-serif text-xl mb-2 text-ink">Avtal byggs nästa session</p>
        <p className="text-sm">
          Vi återanvänder Karins avtalskod, anpassar till dig och kopplar in i flödet:<br />
          skicka avtal från en kund, signering via privat länk, audit log med IP och hash.
        </p>
      </div>
    </>
  );
}
