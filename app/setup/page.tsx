import { setupPassword } from './actions';

export default async function SetupPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;
  const ok = params?.ok;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-12">
          <div className="eyebrow mb-2">Sätt eget lösenord</div>
          <h1 className="font-serif text-4xl leading-tight">Engångsuppsättning</h1>
        </div>

        {ok ? (
          <div className="bg-white border border-line-soft rounded-sm p-6 text-center">
            <div className="font-serif text-xl mb-2">Klart!</div>
            <p className="text-ink-muted text-sm">
              Lösenord satt. Gå till <a href="/login" className="text-accent underline">login</a> och logga in.
            </p>
          </div>
        ) : (
          <form action={setupPassword} className="space-y-4">
            <div>
              <label className="eyebrow block mb-1.5">Mejladress</label>
              <input
                type="email"
                name="email"
                required
                defaultValue="kontakt@fotografannaejemo.se"
                className="w-full bg-white border border-line rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-ink-faint"
              />
            </div>

            <div>
              <label className="eyebrow block mb-1.5">Välj lösenord (minst 8 tecken)</label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                className="w-full bg-white border border-line rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-ink-faint"
              />
            </div>

            {error && <div className="text-danger text-xs">{error}</div>}

            <button type="submit" className="btn w-full">Sätt lösenord</button>
            <p className="text-xs text-ink-muted text-center mt-4">
              Engångssidan tas bort senare. Lösenordet sätts direkt på ditt konto i Supabase.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
