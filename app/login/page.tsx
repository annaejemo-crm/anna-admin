import { login } from './actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-12">
          <div className="eyebrow mb-2">Admin · 2026</div>
          <h1 className="font-serif text-4xl leading-tight">Fotograf Anna<br />Ejemo AB</h1>
        </div>

        <LoginForm searchParams={searchParams} />
      </div>
    </main>
  );
}

async function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const sent = params?.sent;

  if (sent) {
    return (
      <div className="bg-white border border-line-soft rounded-sm p-6 text-center">
        <div className="font-serif text-xl mb-2">Logga in via mejl</div>
        <p className="text-ink-muted text-sm leading-relaxed">
          En inloggningslänk är skickad till din mejl. Öppna den för att logga in.
        </p>
      </div>
    );
  }

  return (
    <form action={login} className="space-y-4">
      <div>
        <label className="eyebrow block mb-1.5">Mejladress</label>
        <input
          type="email"
          name="email"
          required
          autoFocus
          className="w-full bg-white border border-line rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-ink-faint"
          placeholder="kontakt@fotografannaejemo.se"
        />
      </div>

      {error && (
        <div className="text-danger text-xs">{error}</div>
      )}

      <button type="submit" className="btn w-full">Skicka inloggningslänk</button>

      <p className="text-xs text-ink-muted text-center mt-6">
        Du får en magisk länk i din mejl. Klicka på den så loggas du in.
      </p>
    </form>
  );
}
