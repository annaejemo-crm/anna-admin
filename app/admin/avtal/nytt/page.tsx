import Link from 'next/link';
import { NyttAvtalForm } from './NyttAvtalForm';

export default function NyttAvtalPage() {
  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">
          <Link href="/admin/avtal" className="hover:underline">Avtal</Link>
          {' / Nytt'}
        </div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Nytt avtal</h1>
        <p className="text-sm text-ink-muted mt-2">
          Skapa ett fristående avtal utan bokning. Välj en mall, fyll i mottagare och justera texten. Du får en signeringslänk att skicka.
        </p>
      </div>
      <NyttAvtalForm />
    </>
  );
}
