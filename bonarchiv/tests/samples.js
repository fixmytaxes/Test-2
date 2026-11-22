// Beispielbelege für Tests (frei erfunden, angelehnt an typische deutsche Kassenbons)
"use strict";

exports.rewe = `REWE
REWE Markt GmbH
Domstraße 20
50668 Köln
UID Nr.: DE812706034
                                EUR
JA! H-MILCH 1,5%            1,78 B
  2 Stk x    0,89
BIO BANANEN                 1,52 B
  0,764 kg x   1,99 EUR/kg
LAUGENBREZEL                0,59 B
COCA-COLA 1,0L              1,49 A
PFAND 0,25 EURO             0,25 A
RABATT                     -0,30 B
--------------------------------------
SUMME                 EUR   5,33
======================================
Geg. EC-Cash          EUR   5,33

Steuer  %     Netto     Steuer    Brutto
A=  19,0%      1,46       0,28      1,74
B=   7,0%      3,36       0,23      3,59
Gesamtbetrag   4,82       0,51      5,33

TSE-Signatur: MEUCIQDf2x
TSE-Start: 2026-11-22T09:14:03.000Z
22.11.2026   10:14       Bon-Nr.: 4711
`;

exports.lidl = `LIDL
Lidl Vertriebs GmbH & Co. KG
Hauptstraße 5
10115 Berlin
                                   EUR
Joghurt Natur        0,89 x 2   1,78 A
Bananen                         1,52 A
Vollkornbrot                    1,99 A
Kerrygold Butter                2,79 A
Lidl Plus Rabatt               -0,50 A
--------------------------------------
zu zahlen                       7,58
Kartenzahlung                   7,58
--------------------------------------
MWST%     MWST     + Netto   = Brutto
A  7 %    0,50       7,08       7,58
Summe     0,50       7,08       7,58
--------------------------------------
 21.11.26  18:42    1234  5678/01
`;

exports.aldi = `ALDI SÜD
Dienstleistungs-GmbH & Co. oHG
Musterweg 12, 80331 München
 2 x      0,79
Milch fettarm             1,58  A
Äpfel Braeburn            2,49  A
Spülmittel                0,95  B
Summe                     5,02
Bar                      10,00
Rückgeld                  4,98
MwSt     Netto     MwSt    Brutto
A 7%      3,80      0,27     4,07
B 19%     0,80      0,15     0,95
20.11.2026 08:05  Filiale 123
`;

exports.dm = `dm-drogerie markt GmbH + Co. KG
Filiale 1234
Schildergasse 1, 50667 Köln
Balea Duschgel Men          0,95  2
alverde Gesichtscreme       3,45  2
Zahnbürste Dontodent        1,25  2
SUMME EUR                   5,65
EC-Karte                    5,65
MwSt-Satz  Netto   MwSt   Brutto
2=19,00%   4,75    0,90   5,65
22.11.2026 11:02   Kasse 3
`;

exports.trattoria = `Trattoria Da Mario
Inh. Mario Rossi
Lindenstraße 8
60311 Frankfurt am Main
Tel. 069 123456
Steuernummer: 045 123 45678

Tisch 12        Bedienung: Anna
Rechnung Nr. 2026-1188
21.11.2026 20:31
--------------------------------
2 Pizza Margherita   9,50  19,00
1 Tiramisu           6,50   6,50
3 Cola 0,33l         3,20   9,60
1 Espresso           2,40   2,40
--------------------------------
Gesamt EUR                 37,50
Kartenzahlung VISA         37,50
--------------------------------
Netto 19%      31,51
MwSt 19%        5,99
Brutto         37,50
`;

exports.tank = `ARAL
Tankstelle Schulz
Kölner Str. 100
40211 Düsseldorf
Säule 4
SUPER E10   44,00 l      1,749 EUR/l
                          76,96 A
KAFFEE TO GO              1,98 A
SUMME EUR                78,94
GIROCARD                 78,94
MwSt 19%   Netto 66,34  MwSt 12,60  Brutto 78,94
22.11.2026 07:12
`;

exports.tse = "V0;955002-00;Kassenbeleg-V1;Beleg^75.33_7.99_0.00_0.00_0.00^10.00:Bar_5.00:Bar:CHF_55.00:Unbar;18;112;2019-07-10T18:41:04.000Z;2019-07-10T18:41:04.000Z;ecdsa-plain-SHA256;unixTime;MEUCIAy4P9k+7x9saDO0uRZ4El8QwN+qTgYiv1DIaJIMWRiuAiEAmfQgvMgVLwDKyEvwOjbqMSEVR7rDyMbw4LqVVX69zh4=;BHhWOeisRpPBTGQ1W4VUH95TXx2GARf8e2NYZXJoInjtGqnxJ8sZ3CQpYgjI+LYEmW5A37sLWHsyU7nSJUBemyU=";

exports.dfkaJson = JSON.stringify({
  cash_register: { serial_number: "K-0815" },
  head: {
    id: "c9e8a1f0",
    number: "B-2026-000123",
    date: "2026-11-22T13:05:00+01:00",
    seller: {
      name: "Bäckerei Schmitz GmbH",
      address: { street: "Hauptstr. 1", postal_code: "50667", city: "Köln" },
      tax_number: "214/5678/1234"
    }
  },
  data: {
    currency: "EUR",
    full_amount_incl_vat: 7.85,
    payment_types: [{ name: "Barzahlung", amount: 10.0 }],
    vat_amounts: [{ percentage: 7, incl_vat: 7.85, excl_vat: 7.34, vat: 0.51 }],
    lines: [
      { text: "Roggenbrot 750g", quantity: 1, price_per_unit: 3.95, total_amount: 3.95 },
      { text: "Brötchen", quantity: 6, price_per_unit: 0.45, total_amount: 2.7 },
      { text: "Butterbreze", quantity: 1, price_per_unit: 1.2, total_amount: 1.2 }
    ]
  }
});

exports.ubl = `<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>RE-2026-55</cbc:ID>
  <cbc:IssueDate>2026-11-15</cbc:IssueDate>
  <cbc:DueDate>2026-11-29</cbc:DueDate>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyName><cbc:Name>Elektro Meier GmbH</cbc:Name></cac:PartyName></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyName><cbc:Name>Kunde AG</cbc:Name></cac:PartyName></cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="EUR">19.00</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">100.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">19.00</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>19</cbc:Percent></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="EUR">100.00</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="EUR">100.00</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="EUR">119.00</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="EUR">119.00</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="H87">2</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="EUR">100.00</cbc:LineExtensionAmount><cac:Item><cbc:Name>LED-Leuchte</cbc:Name></cac:Item><cac:Price><cbc:PriceAmount currencyID="EUR">50.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine>
</ubl:Invoice>`;

exports.cii = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocument>
    <ram:ID>2026-0815</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">20261103</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>1</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>Kopierpapier A4</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>4.50</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="H87">10</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>45.00</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>2</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>Kugelschreiber</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>1.00</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="H87">5</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>5.00</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty><ram:Name>Bürobedarf Klein GmbH</ram:Name><ram:PostalTradeAddress><ram:CityName>Bonn</ram:CityName></ram:PostalTradeAddress></ram:SellerTradeParty>
      <ram:BuyerTradeParty><ram:Name>Kanzlei Muster</ram:Name></ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax><ram:CalculatedAmount>9.50</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>50.00</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19</ram:RateApplicablePercent></ram:ApplicableTradeTax>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>50.00</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>50.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">9.50</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>59.50</ram:GrandTotalAmount>
        <ram:DuePayableAmount>59.50</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
