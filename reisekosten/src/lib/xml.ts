// Erzeugt die Reisekostenabrechnung als strukturierte E-Rechnung im Format UN/CEFACT Cross Industry Invoice
// (CII D16B) nach EN 16931 – das Format von ZUGFeRD 2.x / Factur-X (Profil EN 16931 „Comfort“).
//
// Abbildung:
// - Rechnungsnummer = Abrechnungsnummer, Rechnungsdatum = Abrechnungsdatum, Leistungsdatum = Reiseende,
//   Abrechnungszeitraum = Reisebeginn bis Reiseende
// - Verkäufer = Reisender (Erstattungsanspruch), Käufer = Unternehmen
// - Je Position und Steuersatz eine Rechnungszeile mit Leistungsbeschreibung und Kontovorschlag (BT-133)
// - Pauschalen (Kilometer, Verpflegung), steuerfreie Leistungen und ausländische Umsatzsteuer: Kategorie E (0 %)
// - Erstattungen/Kürzungen als Nachlass auf Dokumentebene, vom Unternehmen bezahlte Beträge und Vorschüsse
//   als bereits gezahlter Betrag; der Zahlbetrag entspricht damit dem Auszahlungsbetrag an den Reisenden
// - Stornobeleg: Gutschrift (Typ 381) über dieselben Beträge mit Bezug auf die ursprüngliche Abrechnung
import type { Cent, UstKey } from '../types';
import { countryName } from '../data/countries';
import { datePart } from './dates';
import { splitBrutto, UST_ORDER, UST_RATE, xmlAmount } from './money';
import type { Abrechnung } from './totals';

export const XML_DATEINAME = 'factur-x.xml';
export const PROFIL_ID = 'urn:cen.eu:en16931:2017';
const BEFREIUNGSGRUND = 'Ohne Vorsteuerabzug: Reisekostenpauschalen (Kilometer, Verpflegung), steuerfreie oder im Ausland versteuerte Leistungen';

const esc = (s: string | undefined) =>
  (s ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const d102 = (iso: string | undefined) => datePart(iso).replace(/-/g, '');

interface Zeile {
  id: number;
  name: string;
  beschreibung: string;
  ust: UstKey;
  netto: Cent;
  konto: string;
  datum: string;
  posNr: string;
}

interface Nachlass {
  grund: string;
  ust: UstKey;
  netto: Cent;
}

export interface XmlOptionen {
  storno?: boolean;
  abrechnungsdatum: string;
}

const kategorie = (u: UstKey) => (u === '19' || u === '7' ? 'S' : 'E');

/** Verteilt einen Nettobetrag auf Einzelbeträge (Bruttoanteile), so dass die Summe exakt stimmt. */
function verteile(netto: Cent, bruttos: Cent[], rate: number): Cent[] {
  const roh = bruttos.map((b) => Math.round(b / (1 + rate / 100)));
  const diff = netto - roh.reduce((s, x) => s + x, 0);
  if (diff !== 0 && roh.length) {
    const idx = bruttos.reduce((best, b, i) => (Math.abs(b) > Math.abs(bruttos[best]) ? i : best), 0);
    roh[idx] += diff;
  }
  return roh;
}

export function erzeugeXml(a: Abrechnung, opt: XmlOptionen): string {
  const r = a.reise;
  const ctx = a.ctx;
  const nummer = opt.storno ? `${r.nummer}-S` : r.nummer ?? 'ENTWURF';

  // Bruttobeträge je Steuersatz sammeln (Zeilen und Nachlässe)
  type Roh = { pos: (typeof a.positionen)[number]; ust: UstKey; brutto: Cent };
  const roh: Roh[] = [];
  for (const p of a.positionen) for (const b of p.betraege) if (b.bruttoCent > 0) roh.push({ pos: p, ust: b.ust, brutto: b.bruttoCent });
  const minderungen = a.korrekturen.filter((k) => k.art !== 'vorschuss');

  const zeilen: Zeile[] = [];
  const nachlaesse: Nachlass[] = [];
  const steuern: { ust: UstKey; basis: Cent; steuer: Cent; rundung: Cent }[] = [];

  for (const ust of UST_ORDER) {
    const zs = roh.filter((x) => x.ust === ust);
    const ns = minderungen.filter((k) => k.ust === ust);
    if (!zs.length && !ns.length) continue;
    const bruttoZeilen = zs.reduce((s, x) => s + x.brutto, 0);
    const bruttoNachlass = ns.reduce((s, k) => s + k.betragCent, 0);
    const teil = splitBrutto(ust, bruttoZeilen - bruttoNachlass);
    // Nettowerte der Nachlässe, dann Zeilen so verteilen, dass Zeilen − Nachlässe = Bemessungsgrundlage
    const nNetto = verteile(Math.round(bruttoNachlass / (1 + UST_RATE[ust] / 100)), ns.map((k) => k.betragCent), UST_RATE[ust]);
    const zNetto = verteile(teil.netto + nNetto.reduce((s, x) => s + x, 0), zs.map((x) => x.brutto), UST_RATE[ust]);
    zs.forEach((x, i) => {
      const mehrereSaetze = x.pos.betraege.filter((b) => b.bruttoCent > 0).length > 1;
      zeilen.push({
        id: 0,
        name: x.pos.text + (mehrereSaetze ? ` (Anteil ${ust === '19' || ust === '7' ? ust + ' % USt' : ust === 'ausl' ? 'ausl. USt' : 'ohne USt'})` : ''),
        beschreibung: [x.pos.detail, x.pos.bereich === 'bewirtung' ? 'Bewirtungskosten: 70 % abziehbar (§ 4 Abs. 5 Satz 1 Nr. 2 EStG)' : ''].filter(Boolean).join(' – '),
        ust,
        netto: zNetto[i],
        konto: x.pos.konto,
        datum: x.pos.datum,
        posNr: x.pos.nr,
      });
    });
    ns.forEach((k, i) => nachlaesse.push({ grund: `${k.art === 'erstattung' ? 'Erstattung' : 'Kürzung'}: ${k.text}`, ust, netto: nNetto[i] }));
    steuern.push({ ust, basis: teil.netto, steuer: teil.steuerEN, rundung: teil.rundung });
  }
  // Positionsreihenfolge wie in der Abrechnung
  const posIndex = new Map(a.positionen.map((p, i) => [p.nr, i]));
  zeilen.sort((x, y) => (posIndex.get(x.posNr) ?? 0) - (posIndex.get(y.posNr) ?? 0) || UST_ORDER.indexOf(x.ust) - UST_ORDER.indexOf(y.ust));
  zeilen.forEach((z, i) => (z.id = i + 1));

  // EN 16931 fasst alle Zeilen der Kategorie E (0 %) zu einer Steuergruppe zusammen
  const gruppen = new Map<string, { kat: string; rate: number; basis: Cent; steuer: Cent }>();
  for (const s of steuern) {
    const k = `${kategorie(s.ust)}|${UST_RATE[s.ust]}`;
    const g = gruppen.get(k) ?? { kat: kategorie(s.ust), rate: UST_RATE[s.ust], basis: 0, steuer: 0 };
    g.basis += s.basis;
    g.steuer += s.steuer;
    gruppen.set(k, g);
  }
  const rundung = steuern.reduce((s, x) => s + x.rundung, 0);

  const zeilenSumme = zeilen.reduce((s, z) => s + z.netto, 0);
  const nachlassSumme = nachlaesse.reduce((s, n) => s + n.netto, 0);
  const basisSumme = zeilenSumme - nachlassSumme;
  const steuerSumme = [...gruppen.values()].reduce((s, g) => s + g.steuer, 0);
  const brutto = basisSumme + steuerSumme;
  const bezahlt = a.summen.firmaCent + a.summen.vorschussCent;
  const zahlbetrag = brutto - bezahlt + rundung;

  const seller = {
    name: ctx.reisender.name || 'Reisender',
    strasse: ctx.reisender.strasse || ctx.firma.strasse,
    plz: ctx.reisender.plz || ctx.firma.plz,
    ort: ctx.reisender.ort || ctx.firma.ort,
    land: 'DE',
    email: ctx.reisender.email,
    // Steuerliche Registrierung des Reisenden; fehlt sie, die Steuernummer des Unternehmens (EN 16931 BR-S-02/BR-E-02)
    steuernr: ctx.reisender.steuernummer || ctx.firma.steuernummer,
    ustId: ctx.reisender.steuernummer ? '' : ctx.firma.steuernummer ? '' : ctx.firma.ustId,
  };
  const buyer = ctx.firma;
  const beginn = a.beginn ?? a.reise.erstelltAm;
  const ende = a.ende ?? beginn;

  const amt = (c: Cent) => xmlAmount(c);
  const party = (p: { name: string; strasse: string; plz: string; ort: string; land: string; email?: string }, extra: string) => `
        <ram:Name>${esc(p.name)}</ram:Name>
        <ram:PostalTradeAddress>
          ${p.plz ? `<ram:PostcodeCode>${esc(p.plz)}</ram:PostcodeCode>` : ''}
          ${p.strasse ? `<ram:LineOne>${esc(p.strasse)}</ram:LineOne>` : ''}
          ${p.ort ? `<ram:CityName>${esc(p.ort)}</ram:CityName>` : ''}
          <ram:CountryID>${esc(p.land || 'DE')}</ram:CountryID>
        </ram:PostalTradeAddress>${
          p.email
            ? `
        <ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${esc(p.email)}</ram:URIID>
        </ram:URIUniversalCommunication>`
            : ''
        }${extra}`;

  const sellerTax = [
    seller.ustId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(seller.ustId)}</ram:ID></ram:SpecifiedTaxRegistration>` : '',
    seller.steuernr ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${esc(seller.steuernr)}</ram:ID></ram:SpecifiedTaxRegistration>` : '',
  ].join('');
  const buyerTax = buyer.ustId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(buyer.ustId)}</ram:ID></ram:SpecifiedTaxRegistration>` : '';

  const ziel = [r.ziel.bezeichnung, r.ziel.strasse, [r.ziel.plz, r.ziel.ort].filter(Boolean).join(' '), r.ziel.land !== 'DE' ? countryName(r.ziel.land) : '']
    .filter(Boolean)
    .join(', ');
  const notiz = [
    `${opt.storno ? 'Storno der Reisekostenabrechnung ' + r.nummer : 'Reisekostenabrechnung'}: ${r.name}`,
    `Anlass: ${r.anlass}`,
    `Reiseziel: ${ziel}`,
    `Reisender: ${ctx.reisender.name}`,
  ].join('\n');

  const lines = zeilen
    .map(
      (z) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${z.id}</ram:LineID>
        <ram:IncludedNote><ram:Content>Position ${esc(z.posNr)}</ram:Content></ram:IncludedNote>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:SellerAssignedID>${esc(z.posNr)}</ram:SellerAssignedID>
        <ram:Name>${esc(z.name.slice(0, 250))}</ram:Name>
        ${z.beschreibung ? `<ram:Description>${esc(z.beschreibung)}</ram:Description>` : ''}
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${xmlAmount(z.netto)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">1</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${kategorie(z.ust)}</ram:CategoryCode>
          <ram:RateApplicablePercent>${UST_RATE[z.ust]}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>${
          z.datum
            ? `
        <ram:BillingSpecifiedPeriod>
          <ram:StartDateTime><udt:DateTimeString format="102">${d102(z.datum)}</udt:DateTimeString></ram:StartDateTime>
          <ram:EndDateTime><udt:DateTimeString format="102">${d102(z.datum)}</udt:DateTimeString></ram:EndDateTime>
        </ram:BillingSpecifiedPeriod>`
            : ''
        }
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${amt(z.netto)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>${
          z.konto
            ? `
        <ram:ReceivableSpecifiedTradeAccountingAccount>
          <ram:ID>${esc(z.konto)}</ram:ID>
        </ram:ReceivableSpecifiedTradeAccountingAccount>`
            : ''
        }
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`,
    )
    .join('');

  const taxes = [...gruppen.values()]
    .map(
      (g) => `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${amt(g.steuer)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        ${g.kat === 'E' ? `<ram:ExemptionReason>${esc(BEFREIUNGSGRUND)}</ram:ExemptionReason>` : ''}
        <ram:BasisAmount>${amt(g.basis)}</ram:BasisAmount>
        <ram:CategoryCode>${g.kat}</ram:CategoryCode>
        <ram:RateApplicablePercent>${g.rate}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`,
    )
    .join('');

  const allowances = nachlaesse
    .map(
      (n) => `
      <ram:SpecifiedTradeAllowanceCharge>
        <ram:ChargeIndicator><udt:Indicator>false</udt:Indicator></ram:ChargeIndicator>
        <ram:ActualAmount>${amt(n.netto)}</ram:ActualAmount>
        <ram:Reason>${esc(n.grund.slice(0, 250))}</ram:Reason>
        <ram:CategoryTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${kategorie(n.ust)}</ram:CategoryCode>
          <ram:RateApplicablePercent>${UST_RATE[n.ust]}</ram:RateApplicablePercent>
        </ram:CategoryTradeTax>
      </ram:SpecifiedTradeAllowanceCharge>`,
    )
    .join('');

  const iban = (ctx.reisender.iban || '').replace(/\s/g, '').toUpperCase();
  const paymentMeans = iban
    ? `
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:Information>SEPA-Überweisung an den Reisenden</ram:Information>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${esc(iban)}</ram:IBANID>
          <ram:AccountName>${esc(ctx.reisender.name)}</ram:AccountName>
        </ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>`
    : '';

  const zahlText = opt.storno
    ? `Storno der Abrechnung ${r.nummer}`
    : zahlbetrag >= 0
      ? `Erstattung an ${ctx.reisender.name}: ${xmlAmount(zahlbetrag)} EUR (privat verauslagte Kosten und Pauschalen abzüglich Vorschuss/Erstattungen)`
      : `Rückzahlung durch ${ctx.reisender.name}: ${xmlAmount(-zahlbetrag)} EUR`;

  const ursprung = opt.storno
    ? `
      <ram:InvoiceReferencedDocument>
        <ram:IssuerAssignedID>${esc(r.nummer)}</ram:IssuerAssignedID>
        <ram:FormattedIssueDateTime><qdt:DateTimeString format="102">${d102(r.abrechnungsdatum)}</qdt:DateTimeString></ram:FormattedIssueDateTime>
      </ram:InvoiceReferencedDocument>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:BusinessProcessSpecifiedDocumentContextParameter>
      <ram:ID>Reisekostenabrechnung</ram:ID>
    </ram:BusinessProcessSpecifiedDocumentContextParameter>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${PROFIL_ID}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(nummer)}</ram:ID>
    <ram:TypeCode>${opt.storno ? '381' : '380'}</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${d102(opt.abrechnungsdatum)}</udt:DateTimeString></ram:IssueDateTime>
    <ram:IncludedNote>
      <ram:Content>${esc(notiz)}</ram:Content>
    </ram:IncludedNote>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lines}
    <ram:ApplicableHeaderTradeAgreement>
      ${r.kostenstelle ? `<ram:BuyerReference>${esc(r.kostenstelle)}</ram:BuyerReference>` : ''}
      <ram:SellerTradeParty>${party(seller, sellerTax)}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>${party({ ...buyer, land: buyer.land || 'DE' }, buyerTax)}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime><udt:DateTimeString format="102">${d102(ende)}</udt:DateTimeString></ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${esc(nummer)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>${paymentMeans}${taxes}
      <ram:BillingSpecifiedPeriod>
        <ram:StartDateTime><udt:DateTimeString format="102">${d102(beginn)}</udt:DateTimeString></ram:StartDateTime>
        <ram:EndDateTime><udt:DateTimeString format="102">${d102(ende)}</udt:DateTimeString></ram:EndDateTime>
      </ram:BillingSpecifiedPeriod>${allowances}
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>${esc(zahlText)}</ram:Description>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${amt(zeilenSumme)}</ram:LineTotalAmount>
        <ram:AllowanceTotalAmount>${amt(nachlassSumme)}</ram:AllowanceTotalAmount>
        <ram:TaxBasisTotalAmount>${amt(basisSumme)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${amt(steuerSumme)}</ram:TaxTotalAmount>${rundung ? `\n        <ram:RoundingAmount>${amt(rundung)}</ram:RoundingAmount>` : ''}
        <ram:GrandTotalAmount>${amt(brutto)}</ram:GrandTotalAmount>
        <ram:TotalPrepaidAmount>${amt(bezahlt)}</ram:TotalPrepaidAmount>
        <ram:DuePayableAmount>${amt(zahlbetrag)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>${ursprung}
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`.replace(/\n\s*\n/g, '\n');
}
