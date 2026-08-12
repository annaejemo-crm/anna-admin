'use client';

import { useState } from 'react';
import { skapaFristaendeAvtal } from '../actions';

type Klausul = { titel: string; brod: string };
type Mall = {
  label: string;
  typ: string;
  typ_label: string;
  meddelande: string;
  klausuler: Klausul[];
};

const SAMTYCKE_KLAUSULER = function (medRabatt: boolean): Klausul[] {
  const ersattning = medRabatt
    ? 'Som tack för samtycket får den avbildade 30 procent rabatt på en kommande fotografering. Ingen ytterligare ersättning utgår, oavsett hur många licenser som tecknas.'
    : 'Samtycket ges utan ekonomisk ersättning. Ingen ersättning utgår, oavsett hur många licenser som tecknas.';
  return [
    { titel: 'Bilder som omfattas', brod: 'Samtycket gäller följande bilder från fotograferingen den [datum]: [bildnummer eller länk till galleri]. Inga andra bilder omfattas. Samtycket gäller endast bilder där den avbildade själv förekommer.' },
    { titel: 'Vad samtycket innebär', brod: 'Den avbildade ger fotografen rätt att upplåta bilderna till företag och organisationer för kommersiell användning, till exempel marknadsföring och redaktionellt innehåll, på webbplatser, i sociala medier, i appar, i tryckt material och i annan media. Rätten gäller i hela världen och inkluderar sedvanlig bildbehandling som beskärning och retusch. Bilderna får inte förvanskas på ett sätt som är vilseledande eller kränkande.' },
    { titel: 'Icke-exklusivitet', brod: 'Licensen är icke-exklusiv. Samma bild kan licensieras till flera företag som inte är direkta konkurrenter. Den avbildade har inte rätt till del av enskilda licensintäkter.' },
    { titel: 'Ersättning', brod: ersattning },
    { titel: 'Begränsningar och skydd', brod: 'Fotografen väljer licenstagare med omdöme och licensierar inte bilderna till sammanhang som är kränkande, diskriminerande, politiska, religiöst utpekande, vilseledande eller på annat sätt ägnade att skada den avbildade. Bilderna får inte användas så att det framstår som att den avbildade personligen förespråkar en produkt eller åsikt på ett missvisande sätt.' },
    { titel: 'Giltighetstid och återkallelse', brod: 'Samtycket gäller tills vidare. Den avbildade kan när som helst återkalla sitt samtycke genom att mejla fotografen. Återkallelsen gäller nya licenser. Licenser som redan tecknats löper vidare enligt sina avtalstider, dock längst tolv månader efter återkallelsen.' },
    { titel: 'Personuppgifter och GDPR', brod: 'Den rättsliga grunden för publicering där den avbildade är identifierbar är detta samtycke enligt dataskyddsförordningen. Fotografen är personuppgiftsansvarig. Den avbildade har rätt att få veta vilka licenser som tecknats, begära rättelse, och återkalla samtycket. Kontakt sker till kontakt@annaejemo.se.' },
    { titel: 'Minderåriga', brod: 'Om någon på bilderna är under 18 år krävs vårdnadshavares samtycke, som då undertecknar för barnets räkning.' },
    { titel: 'Upphovsrätt', brod: 'Fotografen innehar upphovsrätten till bilderna. Detta samtycke gäller den avbildades rätt till sin egen bild, inte upphovsrätten till fotografierna.' },
  ];
};

const MALLAR: Record<string, Mall> = {
  samtycke_rabatt: {
    label: 'Samtycke bildanvändning, tack med rabatt',
    typ: 'samtycke',
    typ_label: 'Samtyckesavtal',
    meddelande: 'Tack för att du vill vara med i mitt bildbibliotek med äkta svenska gravidbilder. Läs igenom i lugn och ro och signera längst ner. Hör av dig om du undrar över något.',
    klausuler: SAMTYCKE_KLAUSULER(true),
  },
  samtycke_utan: {
    label: 'Samtycke bildanvändning, utan ersättning',
    typ: 'samtycke',
    typ_label: 'Samtyckesavtal',
    meddelande: 'Tack för att du vill vara med i mitt bildbibliotek med äkta svenska gravidbilder. Läs igenom i lugn och ro och signera längst ner. Hör av dig om du undrar över något.',
    klausuler: SAMTYCKE_KLAUSULER(false),
  },
  brudpar: {
    label: 'Fotograferingsavtal brudpar',
    typ: 'brollop',
    typ_label: 'Fotograferingsavtal',
    meddelande: 'Vad roligt att jag får fotografera er stora dag. Här är vårt avtal. Läs igenom och signera båda två, så är allt klart.',
    klausuler: [
      { titel: 'Uppdraget', brod: 'Fotografen fotograferar brudparets bröllop den [datum] på [plats]. Fotograferingen omfattar [antal] timmar, från [starttid] till [sluttid].' },
      { titel: 'Pris och betalning', brod: 'Priset för uppdraget är [pris] kr. En bokningsavgift på [avgift] kr betalas vid signering och dras av från slutsumman. Resterande belopp betalas [när].' },
      { titel: 'Leverans', brod: 'Ett privat digitalt galleri med [antal] färdiga bilder levereras inom [antal] veckor efter bröllopet.' },
      { titel: 'Av- och ombokning', brod: 'Vid avbokning senare än [antal] dagar före bröllopet behålls bokningsavgiften. Vid sjukdom eller oförutsedd händelse bokas ny tid utan extra kostnad.' },
      { titel: 'Upphovsrätt och användning', brod: 'Fotografen innehar upphovsrätten till bilderna. Brudparet får använda bilderna privat i alla sammanhang. Fotografen får visa utvalda bilder i portfolio och sociala medier, om inte brudparet meddelar annat.' },
      { titel: 'Personuppgifter', brod: 'Fotografen behandlar brudparets uppgifter enligt dataskyddsförordningen och delar dem inte med tredje part.' },
    ],
  },
  foretag: {
    label: 'Företagslicens för bilder',
    typ: 'foretag',
    typ_label: 'Licensavtal',
    meddelande: 'Här är licensavtalet för de bilder ni vill använda. Läs igenom och signera, så aktiverar jag licensen.',
    klausuler: [
      { titel: 'Parter', brod: 'Detta licensavtal gäller mellan Fotograf Anna Ejemo AB, org.nr [xxx], och [företagets namn], org.nr [xxx].' },
      { titel: 'Bilder som omfattas', brod: 'Licensen gäller följande bilder: [bildnummer eller länk]. Antal bilder: [antal].' },
      { titel: 'Användningsrätt', brod: 'Licenstagaren får använda bilderna för [webb, sociala medier, app, tryck]. Licensen är icke-exklusiv om inte annat anges. Bilderna får inte vidarelicensieras eller överlåtas till tredje part.' },
      { titel: 'Giltighetstid', brod: 'Licensen gäller i [antal] år från signering, med möjlighet till förlängning. Efter periodens slut ska bilderna tas bort om licensen inte förnyas.' },
      { titel: 'Pris och betalning', brod: 'Licensavgiften är [pris] kr per år exklusive moms. Fakturan betalas inom [antal] dagar.' },
      { titel: 'Upphovsrätt och kreditering', brod: 'Fotografen innehar upphovsrätten. Bilderna får inte förvanskas på ett sätt som är vilseledande. Fotografen har samtycke från de avbildade för kommersiell användning.' },
      { titel: 'Tillämplig lag', brod: 'Svensk lag gäller. Tvist avgörs i svensk domstol.' },
    ],
  },
  tomt: {
    label: 'Tomt avtal',
    typ: 'ovrigt',
    typ_label: 'Avtal',
    meddelande: '',
    klausuler: [{ titel: '', brod: '' }],
  },
};

export function NyttAvtalForm() {
  const [mallNyckel, setMallNyckel] = useState<string>('samtycke_utan');
  const mall = MALLAR[mallNyckel];

  const [kundNamn, setKundNamn] = useState('');
  const [kundEmail, setKundEmail] = useState('');
  const [meddelande, setMeddelande] = useState(MALLAR['samtycke_utan'].meddelande);
  const [klausuler, setKlausuler] = useState<Klausul[]>(MALLAR['samtycke_utan'].klausuler.map(function (k) { return { titel: k.titel, brod: k.brod }; }));

  function laddaMall(nyckel: string) {
    const m = MALLAR[nyckel];
    setMallNyckel(nyckel);
    setMeddelande(m.meddelande);
    setKlausuler(m.klausuler.map(function (k) { return { titel: k.titel, brod: k.brod }; }));
  }

  function uppdateraKlausul(i: number, falt: 'titel' | 'brod', varde: string) {
    setKlausuler(function (prev) {
      const next = prev.slice();
      next[i] = { ...next[i], [falt]: varde };
      return next;
    });
  }

  function laggTillKlausul() {
    setKlausuler(function (prev) { return prev.concat([{ titel: '', brod: '' }]); });
  }

  function taBortKlausul(i: number) {
    setKlausuler(function (prev) { return prev.filter(function (_, j) { return j !== i; }); });
  }

  const inputClass = 'w-full px-3 py-2.5 bg-white border border-line-soft rounded-sm text-sm focus:outline-none focus:border-ink';

  return (
    <form action={skapaFristaendeAvtal} className="space-y-6 max-w-3xl">
      <input type="hidden" name="typ" value={mall.typ} />
      <input type="hidden" name="typ_label" value={mall.typ_label} />

      <div className="bg-white border border-line-soft rounded-sm p-7">
        <div className="eyebrow mb-4">Mall</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.keys(MALLAR).map(function (nyckel) {
            const aktiv = nyckel === mallNyckel;
            return (
              <button
                key={nyckel}
                type="button"
                onClick={function () { laddaMall(nyckel); }}
                className={`text-left px-4 py-3 rounded-sm border text-sm transition-colors ${aktiv ? 'border-ink bg-bg-subtle' : 'border-line-soft hover:border-ink'}`}
              >
                {MALLAR[nyckel].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-line-soft rounded-sm p-7 space-y-5">
        <div className="eyebrow">Mottagare</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">Namn</label>
            <input type="text" name="kund_namn" value={kundNamn} onChange={function (e) { setKundNamn(e.target.value); }} placeholder="För- och efternamn" className={inputClass} required />
          </div>
          <div>
            <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">Email</label>
            <input type="email" name="kund_email" value={kundEmail} onChange={function (e) { setKundEmail(e.target.value); }} placeholder="namn@exempel.se" className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-[12px] uppercase tracking-wider text-ink-muted mb-1.5">Personligt meddelande</label>
          <textarea name="personligt_meddelande" value={meddelande} onChange={function (e) { setMeddelande(e.target.value); }} rows={3} className={inputClass} />
        </div>
      </div>

      <div className="bg-white border border-line-soft rounded-sm p-7">
        <div className="flex justify-between items-center mb-4">
          <div className="eyebrow">Klausuler ({klausuler.length} st)</div>
          <button type="button" onClick={laggTillKlausul} className="text-[12px] text-ink-muted hover:text-ink underline underline-offset-2">
            Lägg till klausul
          </button>
        </div>
        <div className="space-y-5">
          {klausuler.map(function (kl, i) {
            return (
              <div key={i} className="border-l-2 border-line-soft pl-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-[11px] text-ink-faint">{i + 1}</span>
                  {klausuler.length > 1 && (
                    <button type="button" onClick={function () { taBortKlausul(i); }} className="text-[11px] text-danger hover:underline">
                      Ta bort
                    </button>
                  )}
                </div>
                <input type="text" name="klausul_titel" value={kl.titel} onChange={function (e) { uppdateraKlausul(i, 'titel', e.target.value); }} placeholder="Rubrik" className={`${inputClass} mb-2 font-medium`} />
                <textarea name="klausul_brod" value={kl.brod} onChange={function (e) { uppdateraKlausul(i, 'brod', e.target.value); }} rows={3} placeholder="Text" className={inputClass} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <a href="/admin/avtal" className="px-5 py-2.5 border border-line-soft text-sm rounded-sm hover:border-ink transition-colors">Avbryt</a>
        <button type="submit" className="px-6 py-2.5 bg-ink text-bg text-sm rounded-sm hover:bg-ink/90 transition-colors">Skapa avtal</button>
      </div>
    </form>
  );
}
