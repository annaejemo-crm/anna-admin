import { updatePassword } from './actions';

export default async function InstallningarPage({ searchParams }) {
  const params = await searchParams;
  const ok = params?.ok;
  const error = params?.error;

  return (
    <>
      <div className="mb-10 pb-6 border-b border-line">
        <div className="eyebrow mb-1.5">Mitt företag</div>
        <h1 className="font-serif text-[42px] font-light leading-tight">Inställningar</h1>
      </div>

      <section className="mb-12 max-w-[520px]">
        <h2 className="font-serif text-2xl mb-1">Byt lösenord</h2>
        <p className="text-ink-muted text-[13px] mb-5">
          Byter du lösenord loggas inga andra enheter ut. Du fortsätter vara inloggad här.
        </p>

        {ok ? (
          <div className="bg-white border border-line-soft rounded-sm p-5 text-sm" style={{ color: 'var(--positive)' }}>
            Lösenordet är uppdaterat.
          </div>
        ) : (
          <form action={updatePassword} className="space-y-4 bg-white border border-line-soft rounded-sm p-6">
            <div>
              <label className="eyebrow block mb-1.5">Nytt lösenord</label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                className="w-full bg-bg border border-line rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-ink-faint"
              />
              <p className="text-[11px] text-ink-faint mt-1">Minst 8 tecken.</p>
            </div>

            <div>
              <label className="eyebrow block mb-1.5">Bekräfta nytt lösenord</label>
              <input
                type="password"
                name="confirm"
                required
                minLength={8}
                className="w-full bg-bg border border-line rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-ink-faint"
              />
            </div>

            {error && <div className="text-danger text-xs">{error}</div>}

            <button type="submit" className="btn w-full">Spara nytt lösenord</button>
          </form>
        )}
      </section>

      <section className="mb-12 max-w-[520px]">
        <h2 className="font-serif text-2xl mb-1">Företagsuppgifter, fakturamall, mer</h2>
        <p className="text-ink-muted text-[13px] mb-5">
          Företagsuppgifter, fakturamall, logotyp, Visma-koppling, Google Calendar, BankID, domän. Byggs senare.
        </p>
      </section>
    </>
  );
}
