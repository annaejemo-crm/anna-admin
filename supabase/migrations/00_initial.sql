/* =====================================================================
   Fotograf Anna Ejemo AB · Admin
   Initial databasmigration
   =====================================================================

   Tabeller:
   · kunder                – varje fysisk person eller företagskontakt
   · fotograferingstyper   – referens (gravid, nyfödd, familj, företag, porträtt)
   · bokningar             – ett tillfälle, kopplat till kund och typ
   · anteckningar          – fritext per bokning
   · status_handelser      – tidslinje: vad som hänt med bokningen
   · mail_mallar           – sparade mailmallar med variabler
   · mail_logg             – allt utskickat mail logas här
   · betalningar           – per bokning (bokningsavgift + paket)
   · avtal_mallar          – avtal du har som mall
   · avtal                 – avtal kopplat till en bokning
   · avtal_signaturer      – signaturer (en eller flera per avtal)

   Allt är skyddat med RLS så bara du själv kommer åt din data.

   ===================================================================== */


/* ---------- Tabell: fotograferingstyper ---------- */
create table public.fotograferingstyper (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  namn        text not null,
  beskrivning text,
  ordning     int not null default 0,
  aktiv       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on public.fotograferingstyper (user_id);


/* ---------- Tabell: kunder ---------- */
create table public.kunder (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  fornamn         text not null,
  efternamn       text,
  foretagsnamn    text,
  email           text,
  telefon         text,
  hur_hittade     text,
  korta_anteckningar text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.kunder (user_id);
create index on public.kunder (user_id, efternamn);
create index on public.kunder (user_id, fornamn);


/* ---------- Tabell: bokningar ---------- */
create table public.bokningar (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  kund_id              uuid not null references public.kunder(id) on delete cascade,
  fotograferingstyp_id uuid references public.fotograferingstyper(id),

  datum                date,
  tid                  time,
  plats                text,
  adress               text,

  bokningsavgift_kr    integer,
  bildpaket_namn       text,
  bildpaket_kr         integer,

  /* status_kod:
     forfragan, bokad, avtal_skickat, signat, fotograferad,
     paket_att_valja, levererat, betald, klar, avbokad   */
  status               text not null default 'bokad',

  visma_fakturanr      text,
  intern_anteckning    text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.bokningar (user_id);
create index on public.bokningar (user_id, datum);
create index on public.bokningar (user_id, status);
create index on public.bokningar (kund_id);

/* Total beräknas alltid som bokningsavgift + paket */
create or replace view public.bokningar_med_totalt as
  select
    b.*,
    coalesce(b.bokningsavgift_kr, 0) + coalesce(b.bildpaket_kr, 0) as totalt_kr
  from public.bokningar b;


/* ---------- Tabell: anteckningar ---------- */
create table public.anteckningar (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  bokning_id  uuid not null references public.bokningar(id) on delete cascade,
  titel       text,
  innehall    text not null,
  created_at  timestamptz not null default now()
);
create index on public.anteckningar (bokning_id);


/* ---------- Tabell: status_handelser (tidslinjen) ---------- */
create table public.status_handelser (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  bokning_id  uuid not null references public.bokningar(id) on delete cascade,
  handelse    text not null,     /* fritext, t.ex. "Bokning bekräftad" */
  status_kod  text,              /* om händelsen ändrar status, vilken */
  beskrivning text,
  created_at  timestamptz not null default now()
);
create index on public.status_handelser (bokning_id, created_at desc);


/* ---------- Tabell: mail_mallar ---------- */
create table public.mail_mallar (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  namn        text not null,
  kategori    text,               /* forfragan, bokning, paminnelse, paketval, leverans, övrigt */
  amne        text not null,
  brodtext    text not null,
  ordning     int not null default 0,
  aktiv       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.mail_mallar (user_id);


/* ---------- Tabell: mail_logg ---------- */
create table public.mail_logg (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  bokning_id  uuid references public.bokningar(id) on delete set null,
  mall_id     uuid references public.mail_mallar(id) on delete set null,
  till_email  text not null,
  amne        text not null,
  brodtext    text not null,
  skickat_at  timestamptz not null default now(),
  status      text not null default 'skickat'   /* skickat, misslyckat, utkast */
);
create index on public.mail_logg (bokning_id, skickat_at desc);
create index on public.mail_logg (user_id, skickat_at desc);


/* ---------- Tabell: betalningar ---------- */
create table public.betalningar (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  bokning_id      uuid not null references public.bokningar(id) on delete cascade,
  belopp_kr       integer not null,
  /* avser: bokningsavgift, bildpaket, ovrigt */
  avser           text not null,
  metod           text,           /* swish, kort, faktura, kontant */
  visma_fakturanr text,
  fakturerad_at   timestamptz,
  betald_at       timestamptz,
  status          text not null default 'fakturerad',  /* fakturerad, betald, kreditad */
  anteckning      text,
  created_at      timestamptz not null default now()
);
create index on public.betalningar (bokning_id);
create index on public.betalningar (user_id, betald_at);


/* ---------- Tabell: avtal_mallar ---------- */
create table public.avtal_mallar (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  namn         text not null,
  fotograferingstyp text,         /* gravid, nyfodd, foretag etc */
  klausuler    jsonb not null default '[]'::jsonb,  /* [{titel, brodtext}] */
  ordning      int not null default 0,
  aktiv        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.avtal_mallar (user_id);


/* ---------- Tabell: avtal ---------- */
create table public.avtal (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  bokning_id      uuid not null references public.bokningar(id) on delete cascade,
  mall_id         uuid references public.avtal_mallar(id),

  /* Snapshot av klausulerna vid skickningstillfället */
  klausuler       jsonb not null,
  /* Snapshot av belopp, datum, plats, etc */
  detaljer        jsonb not null,

  slug            text not null unique,   /* för publik länk till signering */
  personligt_meddelande text,

  status          text not null default 'skickat',   /* utkast, skickat, signat, avbruten */
  skickat_at      timestamptz default now(),
  signerat_at     timestamptz,

  kontrakts_hash  text,           /* SHA-256 av klausuler + detaljer vid signering */

  created_at      timestamptz not null default now()
);
create index on public.avtal (bokning_id);
create index on public.avtal (user_id, status);
create unique index on public.avtal (slug);


/* ---------- Tabell: avtal_signaturer ---------- */
create table public.avtal_signaturer (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  avtal_id     uuid not null references public.avtal(id) on delete cascade,
  namn         text not null,       /* namnet på den som signerar */
  email        text,
  typed_name   text not null,       /* vad de skrev in */
  metod        text not null default 'esign',  /* esign, bankid */
  ip_adress    text,
  user_agent   text,
  signerad_at  timestamptz not null default now()
);
create index on public.avtal_signaturer (avtal_id);


/* ===========================================================
   Row Level Security
   - Endast den inloggade ägaren ser och kan ändra sin data.
   - Avtal är publikt läsbara via slug (för att kunden ska kunna
     öppna signeringslänken). Signaturer kan skapas anonymt.
   =========================================================== */

alter table public.kunder              enable row level security;
alter table public.bokningar           enable row level security;
alter table public.fotograferingstyper enable row level security;
alter table public.anteckningar        enable row level security;
alter table public.status_handelser    enable row level security;
alter table public.mail_mallar         enable row level security;
alter table public.mail_logg           enable row level security;
alter table public.betalningar         enable row level security;
alter table public.avtal_mallar        enable row level security;
alter table public.avtal               enable row level security;
alter table public.avtal_signaturer    enable row level security;

/* Helper: standard ägar-policy (select/insert/update/delete) */
create policy "Ägaren ser och hanterar"
  on public.kunder for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Ägaren ser och hanterar"
  on public.bokningar for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Ägaren ser och hanterar"
  on public.fotograferingstyper for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Ägaren ser och hanterar"
  on public.anteckningar for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Ägaren ser och hanterar"
  on public.status_handelser for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Ägaren ser och hanterar"
  on public.mail_mallar for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Ägaren ser och hanterar"
  on public.mail_logg for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Ägaren ser och hanterar"
  on public.betalningar for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Ägaren ser och hanterar"
  on public.avtal_mallar for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Ägaren ser och hanterar"
  on public.avtal for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Ägaren ser och hanterar"
  on public.avtal_signaturer for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

/* Publik läsning av avtal via slug (för kundens signeringslänk) */
create policy "Avtal läsbart via slug"
  on public.avtal for select
  using (true);

/* Publik skrivning av signaturer (anonym kund signerar) */
create policy "Vem som helst kan signera ett avtal"
  on public.avtal_signaturer for insert
  with check (true);


/* ===========================================================
   Trigger: updated_at uppdateras automatiskt
   =========================================================== */
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_kunder_updated_at        before update on public.kunder        for each row execute function public.set_updated_at();
create trigger trg_bokningar_updated_at     before update on public.bokningar     for each row execute function public.set_updated_at();
create trigger trg_mail_mallar_updated_at   before update on public.mail_mallar   for each row execute function public.set_updated_at();
create trigger trg_avtal_mallar_updated_at  before update on public.avtal_mallar  for each row execute function public.set_updated_at();


/* ===========================================================
   Standarddata som läggs in när du registrerar dig första gången
   - Fotograferingstyper
   - Standard mailmallar
   - Standard avtalsmall (gravid)
   =========================================================== */

create or replace function public.seed_for_new_user()
returns trigger as $$
declare
  uid uuid := new.id;
begin
  /* Fotograferingstyper */
  insert into public.fotograferingstyper (user_id, namn, ordning) values
    (uid, 'Gravid', 10),
    (uid, 'Nyfödd', 20),
    (uid, 'Familj', 30),
    (uid, 'Porträtt', 40),
    (uid, 'Företag', 50),
    (uid, 'Bröllop', 60);

  /* Mailmallar */
  insert into public.mail_mallar (user_id, namn, kategori, amne, brodtext, ordning) values
    (uid, 'Svar på förfrågan', 'forfragan',
     'Tack för din förfrågan, {{fornamn}} – så roligt!',
     'Hej {{fornamn}},

Tack för att du hör av dig och funderar på en {{typ}}fotografering med mig. Jag jobbar gärna med er.

Just nu har jag följande tider lediga som ligger nära ert önskemål:

· Förslag 1
· Förslag 2

Mina paket börjar på 5 600 kr och inkluderar fotografering, urval och färdiga bilder via galleri. Bifogar en prislista här.

Hör av er om något känns rätt, så bokar vi datum.

Varma hälsningar,
Anna', 10),

    (uid, 'Bokningsbekräftelse', 'bokning',
     'Bokningsbekräftelse · {{datum}}',
     'Hej {{fornamn}},

Vad roligt att vi spikat datum. Här kommer allt du behöver veta inför fotograferingen.

· Datum: {{datum}} kl {{tid}}
· Plats: {{plats}}
· Bokningsavgift: {{bokningsavgift}} · faktura kommer separat

Bildpaket väljer du efter att vi sett bilderna tillsammans, då fyller jag på med din slutfaktura.

Hör av dig om något ändras.

Varma hälsningar,
Anna', 20),

    (uid, 'Påminnelse innan fotografering', 'paminnelse',
     'Snart ses vi! · Inför fotograferingen {{datum}}',
     'Hej {{fornamn}},

Snart är det dags. Bara en liten påminnelse inför {{datum}}.

· Vi ses kl {{tid}} på {{plats}}
· Plocka fram några kläder du tycker om i jordnära toner om du har, men inget måste
· Tänk på naturligt ljus, gärna inte starka pendellampor

Hör av dig om något krockar.

Vi ses!
Anna', 30),

    (uid, 'Bilder klara · välj paket', 'paketval',
     'Bilderna är klara · välj ditt paket',
     'Hej {{fornamn}},

Här är ditt privata galleri med urvalet från fotograferingen den {{datum}}: [LÄNK]

Bilderna är högupplösta och nedladdningsbara så fort paket är valt och fakturan är betald.

Mina paket:
· 10 bilder · 3 500 kr
· 20 bilder · 5 600 kr
· Alla bilder · 8 000 kr (cirka 40 st)
· Ev. tilläggsprodukter vid intresse

Säg till vilket du landar i så fixar jag fakturan.

Varma hälsningar,
Anna', 40),

    (uid, 'Leveransmail med galleri', 'leverans',
     'Här kommer bilderna · {{namn}}',
     'Hej {{fornamn}},

Här är ditt galleri med de redigerade bilderna från {{datum}}: [LÄNK]

Bilderna är högupplösta. Logga in med koden i mailet och ladda ner.

Tack för att jag fick fota er. Det blir så fina bilder.

Varma hälsningar,
Anna', 50);

  /* Standard avtalsmall (gravid) */
  insert into public.avtal_mallar (user_id, namn, fotograferingstyp, klausuler) values
    (uid, 'Standardavtal · gravidfotografering', 'Gravid',
     '[
        {"titel": "Tjänsten", "brodtext": "Fotografen åtar sig att utföra en gravidfotografering enligt överenskommet datum, tid och plats. Fotograferingen är på cirka 60 minuter."},
        {"titel": "Bokningsavgift", "brodtext": "En bokningsavgift faktureras vid bokning och säkrar datumet. Vid avbokning återbetalas inte bokningsavgiften, men datumet kan flyttas en gång inom samma säsong."},
        {"titel": "Bildpaket", "brodtext": "Bildpaket väljs av kunden efter att urvalet av redigerade bilder visats i ett privat webbgalleri. Slutfaktura skickas baserat på valt paket."},
        {"titel": "Leverans", "brodtext": "Urval och redigerade bilder levereras inom 2 veckor från fotograferingstillfället, beroende på säsong."},
        {"titel": "Användningsrätt", "brodtext": "Kunden får full rätt att använda bilderna för personligt bruk. Fotografen behåller upphovsrätten och får använda bilderna i sin portfolio och marknadsföring om inget annat överenskommits."},
        {"titel": "Force majeure", "brodtext": "Om fotograferingen inte kan genomföras på grund av sjukdom, oförutsedda händelser eller väderförhållanden bokas ett nytt datum så snart som möjligt utan extra kostnad."}
      ]'::jsonb);

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_seed_for_new_user
  after insert on auth.users
  for each row execute function public.seed_for_new_user();


/* ===========================================================
   RPC: dashboard_summary
   Snabbsammanfattning för översiktsvyn (KPIer + nästa steg)
   =========================================================== */
create or replace function public.dashboard_summary(p_ar int default extract(year from now())::int)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'antal_bokningar', count(*),
    'antal_privat', count(*) filter (where coalesce(k.foretagsnamn, '') = ''),
    'antal_foretag', count(*) filter (where coalesce(k.foretagsnamn, '') <> ''),
    'bokad_omsattning_kr', coalesce(sum(coalesce(b.bokningsavgift_kr,0) + coalesce(b.bildpaket_kr,0)), 0),
    'inkommit_kr',
      coalesce((select sum(belopp_kr) from public.betalningar
                where user_id = auth.uid() and betald_at is not null
                and extract(year from betald_at)::int = p_ar), 0),
    'vantar_paketval',
      count(*) filter (where b.status in ('fotograferad','paket_att_valja') and b.bildpaket_kr is null)
  ) into result
  from public.bokningar b
  join public.kunder k on k.id = b.kund_id
  where b.user_id = auth.uid()
    and extract(year from b.datum)::int = p_ar;

  return result;
end; $$;

grant execute on function public.dashboard_summary(int) to authenticated;
