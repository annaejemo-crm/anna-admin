# Fotograf Anna Ejemo AB · Admin

Det här är ditt eget bokings och CRM system. Byggs i flera lager, lager för lager. Den här filen är din karta över vad som finns och vad du behöver göra för att komma igång.

## Vad som redan är skrivet

```
anna-admin/
├── README.md                                  ← den här filen
├── supabase/
│   └── migrations/
│       └── 00_initial.sql                     ← hela databasschemat
├── lib/                                       ← typer, klienter, server actions (kommer)
├── components/                                ← byggstenar (kommer)
└── app/                                       ← Next.js-vyerna (kommer)
```

## Vad du behöver göra först

### 1. Skapa Supabase-konto

Gå till [supabase.com](https://supabase.com) och klicka på "Start your project". Logga in med GitHub eller Google (lättast). 

Klicka "New project". Sätt:
- **Name**: anna-admin
- **Database password**: generera en stark, kopiera och spara i lösenordshanterare
- **Region**: Europe (Stockholm) eller Europe (Frankfurt)
- **Pricing plan**: Free

Det tar 2-3 minuter för projektet att starta.

### 2. Kör databasschemat

När projektet är uppe, gå till SQL Editor i sidomenyn till vänster. Klicka "New query". Kopiera in hela innehållet från `supabase/migrations/00_initial.sql`. Klicka Run (eller Cmd+Enter).

Du ska se "Success. No rows returned" eller liknande. Det betyder att alla tabeller är skapade.

Gå till Table Editor i sidomenyn. Du ska se 11 tabeller: kunder, bokningar, fotograferingstyper, anteckningar, status_handelser, mail_mallar, mail_logg, betalningar, avtal_mallar, avtal, avtal_signaturer.

### 3. Skapa ditt admin-konto

Gå till Authentication i sidomenyn, sen Users-fliken. Klicka "Add user" → "Create new user". 

Använd `kontakt@fotografannaejemo.se` som mejl. Sätt ett lösenord (kan ändras senare till magic link-inloggning).

Klicka skapa. När du gör det körs automatiskt en trigger som lägger in standarddata (fotograferingstyper, mailmallar, en avtalsmall). Du kan kolla i Table Editor under `mail_mallar` så ska det ligga fem mallar där.

### 4. Hämta API-nycklar och dela med Claude

Gå till Project Settings (kugghjulet längst ner i sidomenyn), sedan API-fliken.

Kopiera följande tre värden och dela med Claude i nästa meddelande:

- **Project URL** (ser ut som `https://xxxxxxxxxxxx.supabase.co`)
- **anon public** key (lång sträng, börjar med `eyJ...`)
- **service_role** key (lång sträng, börjar med `eyJ...`, hemlig)

Service role-nyckeln är hemlig. Den hanteras bara i serverkod, aldrig i webbläsaren.

## Vad som händer sen

När du delat nycklarna fortsätter Claude att:

1. Skapa Next.js-projektet på riktigt (package.json, byggsystem)
2. Koppla på Supabase-klienterna
3. Bygga inloggningssidan
4. Bygga dashboard, kunder, ekonomi, mailmallar och avtalsvyerna
5. Hjälpa dig deploya på Vercel
6. Koppla domän när allt är testat

Hela bygget tar flera sessioner. Du jobbar i prototypen tills den riktiga versionen är klar.

## Tekniskt stack

- **Next.js 15** (App Router) – ramverket
- **Supabase** – databas, auth, RLS
- **TypeScript** – typsäkerhet
- **Tailwind CSS** – styling
- **Resend** – mailutskick (läggs till senare)
- **Cloudflare R2** – bildlagring (läggs till om du vill ha gallerier)
- **Vercel** – hosting
