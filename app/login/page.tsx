import { login } from './actions';

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-12">
          <div className="eyebrow mb-2">Admin · 2026</div>
          <h1 className="font-serif text-4xl leading-tight">Fotograf Anna<br />Ejemo AB</h1>
        </div>

        <form action={login} className="space-y-4">
          <div>
            <label className="eyebrow block mb-1.5">Mejladress</label>
            <input
              type="email"
              name="email"
              required
              autoFocus
              defaultValue="kontakt@fotografannaejemo.se"
              className="w-full bg-white border border-line rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-ink-faint"
            />
          </div>

          <div>
            <label className="eyebrow block mb-1.5">Lösenord</label>
            <input
              type="password"
              name="password"
              required
              className="w-full bg-white border border-line rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-ink-faint"
            />
          </div>

          {error && (
            <div className="text-danger text-xs">{error}</div>
          )}

          <button type="submit" className="btn w-full">Logga in</button>
        </form>
      </div>
    </main>
  );
}
