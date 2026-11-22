/*
 * Bonarchiv – Belegerkennung
 *
 * Liest aus digitalen Kassenbons die wichtigsten Angaben heraus:
 * Geschäft, Datum/Uhrzeit, Gesamtbetrag, Artikel, MwSt., Zahlungsart.
 *
 * Unterstützte Quellen:
 *  - QR-Code der TSE nach DSFinV-K ("V0;…"), wie er auf Kassenbons steht
 *  - JSON-Belege (z. B. DFKA-Taxonomie) und beliebige JSON-Strukturen
 *  - XML-Belege, XRechnung (UBL) und ZUGFeRD/Factur-X (CII)
 *  - Text aus PDF-Belegen, Webseiten oder Textdateien
 *
 * Läuft im Browser (window.BonParser) und in Node (module.exports) für Tests.
 * Beträge werden immer in Cent (Ganzzahl) geliefert.
 */
(function (root) {
  "use strict";

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------------------

  /** Für Suche und Vergleiche: klein, Umlaute ausgeschrieben, ohne Akzente. */
  function fold(s) {
    return String(s == null ? "" : s)
      .toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function keyOf(s) {
    return fold(s).replace(/[^a-z0-9]+/g, "");
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  /** Date → "YYYY-MM-DDTHH:MM" in lokaler Zeit. */
  function toLocalIso(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return null;
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function validYmd(y, m, d) {
    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    var dt = new Date(y, m - 1, d);
    return dt.getMonth() === m - 1;
  }

  /** Beliebige Datumsangabe (ISO, dd.mm.yyyy, Unix-Zeit, yyyymmdd) → lokale ISO-Zeit. */
  function parseDateValue(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number" && isFinite(v)) {
      if (v > 1e11) return toLocalIso(new Date(v)); // Millisekunden
      if (v > 9e8) return toLocalIso(new Date(v * 1000)); // Sekunden
      return null;
    }
    var s = String(v).trim();
    var m;
    if (/^\d{10}(\.\d+)?$/.test(s)) return toLocalIso(new Date(parseFloat(s) * 1000));
    if (/^\d{13}$/.test(s)) return toLocalIso(new Date(parseInt(s, 10)));
    if ((m = /^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2}))?$/.exec(s))) {
      if (!validYmd(+m[1], +m[2], +m[3])) return null;
      return m[1] + "-" + m[2] + "-" + m[3] + "T" + (m[4] ? m[4] + ":" + m[5] : "00:00");
    }
    if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i.exec(s))) {
      if (!validYmd(+m[1], +m[2], +m[3])) return null;
      if (m[7]) return toLocalIso(new Date(s.replace(" ", "T")));
      return m[1] + "-" + m[2] + "-" + m[3] + "T" + (m[4] ? pad(+m[4]) + ":" + m[5] : "00:00");
    }
    if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::\d{2})?)?$/.exec(s))) {
      var y = +m[3];
      if (y < 100) y += 2000;
      if (!validYmd(y, +m[2], +m[1])) return null;
      return y + "-" + pad(+m[2]) + "-" + pad(+m[1]) + "T" + (m[4] ? pad(+m[4]) + ":" + m[5] : "00:00");
    }
    var d = new Date(s);
    if (!isNaN(d.getTime()) && /\d{4}/.test(s)) return toLocalIso(d);
    return null;
  }

  // Beträge: "1.234,56", "12,34", "12.34", "0,50-" (Rabatt), "- 1,00"
  var AMOUNT_SRC = "(?<![\\d.,])(-\\s?)?(\\d{1,3}(?:\\.\\d{3})+|\\d+)([,.])(\\d{2})(?!\\d|[.,]\\d)(-(?![\\d]))?";

  function amountsIn(line) {
    var re = new RegExp(AMOUNT_SRC, "g");
    var out = [];
    var m;
    while ((m = re.exec(line))) {
      // "1.234" mit Punkt als Tausender, Komma als Dezimal
      var intPart = m[2].replace(/\./g, "");
      var cents = parseInt(intPart, 10) * 100 + parseInt(m[4], 10);
      if (m[1] || m[5]) cents = -cents;
      out.push({ cents: cents, index: m.index, end: m.index + m[0].length, text: m[0] });
    }
    return out;
  }

  /** Eingabe des Nutzers oder Wert aus Datei → Cent. */
  function parseAmount(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") return isFinite(v) ? Math.round(v * 100) : null;
    var s = String(v).replace(/[€\s]|EUR/gi, "");
    if (!s) return null;
    var neg = /^-|-$/.test(s);
    s = s.replace(/^-|-$/g, "");
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) s = s.replace(/,/g, "");
    else s = s.replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    var c = Math.round(parseFloat(s) * 100);
    return neg ? -c : c;
  }

  function formatAmount(cents, currency) {
    if (cents == null || isNaN(cents)) return "–";
    var cur = currency || "EUR";
    try {
      return new Intl.NumberFormat("de-DE", { style: "currency", currency: cur }).format(cents / 100);
    } catch (e) {
      return (cents / 100).toFixed(2).replace(".", ",") + " " + cur;
    }
  }

  /** "12,30" ohne Währung, für Eingabefelder und Dateinamen. */
  function formatPlain(cents) {
    if (cents == null || isNaN(cents)) return "";
    var neg = cents < 0;
    var a = Math.abs(cents);
    var euros = Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (neg ? "-" : "") + euros + "," + pad(a % 100);
  }

  function near(a, b, tol) {
    return Math.abs(a - b) <= (tol == null ? 1 : tol);
  }

  function hasWord(foldedLine, words) {
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var re = new RegExp("(^|[^a-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9])");
      if (re.test(foldedLine)) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Geschäfte und Kategorien
  // ---------------------------------------------------------------------------

  var CATEGORIES = [
    { id: "food", name: "Lebensmittel", color: "#2e9e5b", icon: "cart" },
    { id: "drug", name: "Drogerie", color: "#d64f8a", icon: "drop" },
    { id: "gastro", name: "Gastronomie", color: "#e07b24", icon: "cup" },
    { id: "mobility", name: "Tanken & Mobilität", color: "#3a7bd5", icon: "fuel" },
    { id: "clothing", name: "Kleidung", color: "#8e5bd6", icon: "shirt" },
    { id: "tech", name: "Elektronik", color: "#1f8fa3", icon: "plug" },
    { id: "home", name: "Haus & Garten", color: "#9a7b2f", icon: "home" },
    { id: "health", name: "Gesundheit", color: "#d64545", icon: "heart" },
    { id: "leisure", name: "Freizeit & Bücher", color: "#c2559d", icon: "star" },
    { id: "other", name: "Sonstiges", color: "#6b7a75", icon: "tag" }
  ];

  // [Anzeigename, Muster, Kategorie, stark]  – "stark" = darf auch außerhalb des Kopfes stehen
  var CHAINS = [
    ["ALDI SÜD", /\bALDI\s*S(?:Ü|UE|U)D\b/i, "food", true],
    ["ALDI Nord", /\bALDI\s*NORD\b/i, "food", true],
    ["ALDI", /\bALDI\b/i, "food"],
    ["REWE", /\bREWE\b/i, "food"],
    ["Marktkauf", /\bMARKTKAUF\b/i, "food"],
    ["EDEKA", /\bE\s?DEKA\b|\bE-CENTER\b/i, "food"],
    ["Lidl", /\bLIDL\b/i, "food"],
    ["Kaufland", /\bKAUFLAND\b/i, "food"],
    // "Netto" steht auch in jeder MwSt.-Tabelle – nur ohne Beträge/Steuerbegriffe in der Zeile
    ["Netto", /^(?!.*(?:\d[,.]\d{2}|%|brutto|mwst|ust\b|steuer|betrag|summe|umsatz)).*\bNETTO\b/im, "food"],
    ["PENNY", /\bPENNY\b/i, "food"],
    ["NORMA", /\bNORMA\b/, "food"],
    ["Globus", /\bGLOBUS\b/i, "food"],
    ["tegut", /\bTEGUT\b/i, "food"],
    ["nahkauf", /\bNAHKAUF\b/i, "food"],
    ["HIT", /\bHIT\s+(?:Markt|Handels|Ullrich)/i, "food", true],
    ["famila", /\bFAMILA\b/i, "food"],
    ["denn's Biomarkt", /\bDENN'?S\s+BIO/i, "food", true],
    ["Alnatura", /\bALNATURA\b/i, "food"],
    ["BIO COMPANY", /\bBIO\s+COMPANY\b/i, "food"],
    ["dm", /\bdm[\s-]*drogerie\b|\bdm-markt\b/i, "drug", true],
    ["Rossmann", /\bROSSMANN\b/i, "drug"],
    ["Müller", /\bM(?:Ü|UE)LLER\s+(?:Handels|Drogerie|Ltd)/i, "drug", true],
    ["BUDNI", /\bBUDNI(?:KOWSKY)?\b/i, "drug"],
    ["IKEA", /\bIKEA\b/i, "home"],
    ["OBI", /\bOBI\b/, "home"],
    ["Hornbach", /\bHORNBACH\b/i, "home"],
    ["BAUHAUS", /\bBAUHAUS\b/i, "home"],
    ["toom", /\bTOOM\b/i, "home"],
    ["hagebau", /\bHAGEBAU/i, "home"],
    ["Action", /\bACTION\s+(?:Deutschland|Non-?Food)/i, "home", true],
    ["TEDi", /\bTEDI\b/i, "home"],
    ["Woolworth", /\bWOOLWORTH\b/i, "home"],
    ["Depot", /\bDEPOT\s+(?:Handels|GmbH)/i, "home", true],
    ["MediaMarkt", /\bMEDIA\s?MARKT\b/i, "tech"],
    ["Saturn", /\bSATURN\b/i, "tech"],
    ["Euronics", /\bEURONICS\b/i, "tech"],
    ["Conrad", /\bCONRAD\s+Electronic/i, "tech", true],
    ["Aral", /\bARAL\b/i, "mobility"],
    ["Shell", /\bSHELL\b/i, "mobility"],
    ["Esso", /\bESSO\b/i, "mobility"],
    ["JET", /\bJET\b/, "mobility"],
    ["TotalEnergies", /\bTOTAL\s?ENERGIES\b/i, "mobility"],
    ["AVIA", /\bAVIA\b/, "mobility"],
    ["Deutsche Bahn", /\bDeutsche\s+Bahn\b|\bDB\s+(?:Fernverkehr|Regio|Vertrieb)\b/i, "mobility", true],
    ["H&M", /\bH\s?&\s?M\b/, "clothing"],
    ["C&A", /\bC\s?&\s?A\b/, "clothing"],
    ["Primark", /\bPRIMARK\b/i, "clothing"],
    ["Deichmann", /\bDEICHMANN\b/i, "clothing"],
    ["ZARA", /\bZARA\b/i, "clothing"],
    ["TK Maxx", /\bTK\s?MAXX\b/i, "clothing"],
    ["KiK", /\bKIK\s+Textil/i, "clothing", true],
    ["Decathlon", /\bDECATHLON\b/i, "leisure"],
    ["Thalia", /\bTHALIA\b/i, "leisure"],
    ["Hugendubel", /\bHUGENDUBEL\b/i, "leisure"],
    ["McDonald's", /\bMC\s?DONALD'?S\b/i, "gastro"],
    ["Burger King", /\bBURGER\s?KING\b/i, "gastro"],
    ["Starbucks", /\bSTARBUCKS\b/i, "gastro"],
    ["KFC", /\bKFC\b/, "gastro"],
    ["Subway", /\bSUBWAY\b/i, "gastro"],
    ["Vapiano", /\bVAPIANO\b/i, "gastro"],
    ["NORDSEE", /\bNORDSEE\b/i, "gastro"],
    ["Fielmann", /\bFIELMANN\b/i, "health"],
    ["Apollo-Optik", /\bAPOLLO[\s-]?OPTIK\b/i, "health"]
  ];

  var CATEGORY_WORDS = {
    food: ["baeckerei", "backhaus", "backstube", "backshop", "metzgerei", "fleischerei", "supermarkt", "lebensmittel",
      "getraenke", "getraenkemarkt", "hofladen", "feinkost", "obst", "gemuese", "biomarkt", "bioladen", "konditorei"],
    drug: ["drogerie", "parfuemerie"],
    gastro: ["restaurant", "ristorante", "trattoria", "pizzeria", "cafe", "kaffee", "coffee", "bistro", "imbiss",
      "doener", "gaststaette", "gasthaus", "gasthof", "brauhaus", "kneipe", "bar", "lounge", "sushi", "burger",
      "grill", "eiscafe", "eisdiele", "kantine", "mensa", "wirtshaus", "steakhouse", "trinkgeld", "bedienung", "tisch"],
    mobility: ["tankstelle", "kraftstoff", "diesel", "super e10", "benzin", "parkhaus", "parken", "parkticket", "taxi",
      "verkehrsbetriebe", "fahrkarte", "fahrschein", "waschstrasse", "autowaesche", "werkstatt", "autohaus", "kfz"],
    clothing: ["mode", "fashion", "schuhe", "textil", "boutique", "bekleidung"],
    tech: ["elektronik", "elektro", "computer", "handy", "mobilfunk"],
    home: ["baumarkt", "moebel", "einrichtung", "gartencenter", "garten", "deko", "haushaltswaren", "blumen", "floristik"],
    health: ["apotheke", "optik", "optiker", "sanitaetshaus", "arztpraxis", "praxis", "hoerakustik", "physiotherapie"],
    leisure: ["buchhandlung", "kino", "theater", "museum", "sport", "spielwaren", "zoo", "tierpark", "freizeitpark",
      "schwimmbad", "therme", "fitness", "eintritt"]
  };

  var LEGAL_FORMS = /[\s,]+(?:gmbh\s*&\s*co\.?\s*(?:kg|ohg)(?:aa)?|gmbh|mbh|ag\s*&\s*co\.?\s*(?:kg|ohg)|ag|kgaa|kg|ohg|gbr|e\.\s?k\.?|e\.\s?kfm\.?|e\.\s?kfr\.?|ug(?:\s*\(haftungsbeschr(?:ä|ae)nkt\))?|e\.\s?v\.|ltd\.?|inc\.?|se|& co\.? kg)\.?\s*$/i;

  function cleanMerchantName(s) {
    var name = String(s || "").replace(/\s+/g, " ").replace(/^[\s*#=_\-.:]+|[\s*#=_\-.:]+$/g, "").trim();
    for (var i = 0; i < 3; i++) name = name.replace(LEGAL_FORMS, "").trim();
    name = name.replace(/\s+(?:Filiale|Fil\.|Markt)\s*(?:Nr\.?)?\s*\d+.*$/i, "").trim();
    // GROSSBUCHSTABEN → Wortanfänge groß (bekannte Ketten werden vorher erkannt)
    if (name.length > 3 && name === name.toUpperCase() && /[A-ZÄÖÜ]{4}/.test(name)) {
      name = name.toLowerCase().replace(/(^|[\s\-/&(])([a-zäöü])/g, function (m, a, b) {
        return a + b.toUpperCase();
      });
    }
    return name.slice(0, 60);
  }

  function chainFor(text) {
    for (var i = 0; i < CHAINS.length; i++) {
      var c = CHAINS[i];
      if (c[1].test(text)) return { name: c[0], category: c[2], strong: !!c[3] };
    }
    return null;
  }

  // Kurze Wörter nur als ganzes Wort, mittlere am Wortanfang, lange auch mitten im Wort ("Stadtbäckerei")
  function nameHasWord(foldedName, w) {
    if (w.length >= 6) return foldedName.indexOf(w) >= 0;
    var esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var re = new RegExp("(^|[^a-z0-9])" + esc + (w.length <= 3 ? "($|[^a-z0-9])" : ""));
    return re.test(foldedName);
  }

  function suggestCategory(merchant, text) {
    var m = String(merchant || "");
    var chain = chainFor(m);
    if (chain) return chain.category;
    var fm = fold(m);
    var ft = fold(text || "").slice(0, 3000);
    var ids = Object.keys(CATEGORY_WORDS);
    for (var pass = 0; pass < 2; pass++) {
      var hay = pass === 0 ? fm : ft;
      if (!hay) continue;
      for (var i = 0; i < ids.length; i++) {
        var words = CATEGORY_WORDS[ids[i]];
        for (var j = 0; j < words.length; j++) {
          var w = words[j];
          if (pass === 0 ? nameHasWord(hay, w) : hasWord(hay, [w])) return ids[i];
        }
      }
    }
    return "other";
  }

  // ---------------------------------------------------------------------------
  // TSE-QR-Code nach DSFinV-K
  // V0;Seriennr;Kassenbeleg-V1;Beleg^19%_7%_10,7%_5,5%_0%^Betrag:Art[:Währung]_…;TA-Nr;Sig-Zähler;Start;Ende;Alg;Zeitformat;Signatur;PubKey
  // ---------------------------------------------------------------------------

  var TSE_RATES = [19, 7, 10.7, 5.5, 0];

  function parseTseTime(v, format) {
    if (!v) return null;
    if (/unix/i.test(format || "") && /^\d+$/.test(v)) return toLocalIso(new Date(parseInt(v, 10) * 1000));
    return parseDateValue(v);
  }

  function parseTSE(input) {
    var s = String(input || "").trim();
    if (!/^V0;/.test(s)) return null;
    var p = s.split(";");
    if (p.length < 9) return null;
    var processType = p[2] || "";
    var pd = (p[3] || "").split("^");
    var vat = [];
    var total = 0;
    var gross = (pd[1] || "").split("_");
    for (var i = 0; i < gross.length && i < TSE_RATES.length; i++) {
      var c = parseAmount(gross[i]);
      if (c) {
        vat.push({ rate: TSE_RATES[i], gross: c, tax: Math.round(c * TSE_RATES[i] / (100 + TSE_RATES[i])) });
        total += c;
      }
    }
    var payments = [];
    (pd[2] || "").split("_").forEach(function (entry) {
      if (!entry) return;
      var q = entry.split(":");
      var amt = parseAmount(q[0]);
      if (amt == null) return;
      payments.push({ amount: amt, type: /^bar$/i.test(q[1] || "") ? "Bar" : "Karte", currency: q[2] || "EUR" });
    });
    var start = parseTseTime(p[6], p[9]);
    var end = parseTseTime(p[7], p[9]);
    var payTypes = [];
    payments.forEach(function (x) { if (payTypes.indexOf(x.type) < 0) payTypes.push(x.type); });
    return {
      format: "tse",
      merchant: "",
      date: end || start,
      total: vat.length || payments.length ? total : null,
      currency: payments[0] ? payments[0].currency : "EUR",
      vat: vat,
      payment: payTypes.join(", "),
      items: [],
      tse: {
        serial: p[1] || "",
        processType: processType,
        receiptType: pd[0] || "",
        transaction: p[4] || "",
        signatureCounter: p[5] || "",
        start: p[6] || "",
        end: p[7] || "",
        algorithm: p[8] || "",
        signature: p[10] || ""
      },
      text: [
        "TSE-Daten (Kassenbeleg-QR-Code)",
        "Vorgang: " + (pd[0] || processType),
        "Transaktion: " + (p[4] || "–"),
        "Signaturzähler: " + (p[5] || "–"),
        "TSE-Seriennummer: " + (p[1] || "–"),
        "Start: " + (p[6] || "–"),
        "Ende: " + (p[7] || "–")
      ].join("\n")
    };
  }

  // ---------------------------------------------------------------------------
  // Text (PDF, Webseite, Textdatei)
  // ---------------------------------------------------------------------------

  var JUNK_HEADER = ["kassenbon", "kassenbeleg", "beleg", "rechnung", "quittung", "kundenbeleg", "willkommen", "herzlich",
    "danke", "vielen dank", "tel", "telefon", "fax", "www", "http", "e-mail", "email", "datum", "uhrzeit", "bon", "bon-nr",
    "kasse", "filiale", "uid", "ust-id", "ustid", "steuernummer", "st.-nr", "steuer-nr", "seite", "page", "original",
    "kopie", "duplikat", "digitaler", "digitale", "receipt", "invoice", "bedient", "bediener", "tisch", "oeffnungszeiten",
    "mo-sa", "mo-fr", "ihr einkauf", "einkauf", "eur"];

  var NOT_ITEM = ["summe", "zwischensumme", "zw-summe", "zw.-summe", "gesamt", "gesamtsumme", "gesamtbetrag", "total", "zu zahlen",
    "zahlbetrag", "endbetrag", "rechnungsbetrag", "betrag", "mwst", "mwst.", "ust", "ust.", "steuer", "netto", "brutto",
    "gegeben", "rueckgeld", "wechselgeld", "zurueck", "bar", "barzahlung", "kartenzahlung", "karte", "ec", "ec-cash",
    "ec-karte", "girocard", "visa", "mastercard", "maestro", "v pay", "vpay", "amex", "american express", "kreditkarte",
    "paypal", "apple pay", "google pay", "kontaktlos", "bezahlt", "zahlung", "zahlungsart", "datum", "uhrzeit",
    "bon-nr", "belegnr", "beleg-nr", "bonnr", "kasse", "kassierer", "filiale", "tse", "signatur", "transaktion",
    "terminal", "terminal-id", "trace", "trace-nr", "autorisierung", "genehmigung", "kundenbeleg", "haendlerbeleg",
    "saldo", "payback", "punkte", "posten", "anzahl", "steuernummer", "ust-id", "summe eur", "a=", "b=", "satz",
    "steuersatz", "nettobetrag", "bruttobetrag", "mwst-betrag", "seriennummer", "start", "ende", "kartennr", "pan",
    "vu-nr", "beleg", "bonus", "ersparnis", "sie sparen", "gespart", "rabattsumme"];

  var PAYMENT_WORDS = [
    ["Apple Pay", ["apple pay"]],
    ["Google Pay", ["google pay"]],
    ["PayPal", ["paypal"]],
    ["Kreditkarte", ["visa", "mastercard", "master card", "amex", "american express", "kreditkarte"]],
    ["Karte", ["girocard", "ec-cash", "ec cash", "ec-karte", "electronic cash", "kartenzahlung", "karte", "maestro",
      "v pay", "debit", "kontaktlos"]],
    ["Gutschein", ["gutschein"]],
    ["Bar", ["bar", "barzahlung", "bargeld", "gegeben"]]
  ];

  function splitLines(text) {
    return String(text || "")
      .replace(/\r\n?/g, "\n")
      .replace(/\t/g, "    ")
      .replace(/ /g, " ")
      .split("\n")
      .map(function (l) { return l.replace(/\s+$/, ""); })
      .filter(function (l) { return l.trim().length > 0; });
  }

  function detectMerchant(lines) {
    // Bekannte Kette: die früheste Zeile im Kopf gewinnt
    for (var h = 0; h < Math.min(lines.length, 12); h++) {
      var c = chainFor(lines[h]);
      if (c) return { name: c.name, raw: c.name, category: c.category, confident: true };
    }
    var all = lines.join("\n");
    for (var i = 0; i < CHAINS.length; i++) {
      if (CHAINS[i][3] && CHAINS[i][1].test(all)) return { name: CHAINS[i][0], raw: CHAINS[i][0], category: CHAINS[i][2], confident: true };
    }
    for (var j = 0; j < Math.min(lines.length, 8); j++) {
      var l = lines[j].trim();
      var f = fold(l);
      var letters = (l.match(/[A-Za-zÄÖÜäöüß]/g) || []).length;
      if (letters < 3) continue;
      if (letters < l.replace(/\s/g, "").length * 0.5) continue;
      if (hasWord(f, JUNK_HEADER)) continue;
      if (/@|www\.|https?:/i.test(l)) continue;
      if (/\b\d{5}\b/.test(l) && letters < 25) continue; // PLZ + Ort
      if (/(stra(ss|ß)e|str\.|weg|platz|allee|gasse|ring|damm|ufer|markt)\s*\d/i.test(l)) continue; // Adresse
      if (amountsIn(l).length) continue;
      if (/^\W*\d/.test(l)) continue;
      return { name: cleanMerchantName(l), raw: l, category: null, confident: false };
    }
    return { name: "", raw: "", category: null, confident: false };
  }

  function detectDate(lines) {
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      var f = fold(l);
      var re = /(?<!\d)(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?!\d)|(?<!\d)(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?(?!\d)|(?<!\d)(\d{1,2})\/(\d{1,2})\/(\d{4})(?!\d)/g;
      var m;
      while ((m = re.exec(l))) {
        var y, mo, d, iso = null, score = 1;
        if (m[1]) {
          y = +m[3]; if (y < 100) y += 2000; mo = +m[2]; d = +m[1]; score = 3;
        } else if (m[4]) {
          y = +m[4]; mo = +m[5]; d = +m[6]; score = 2;
          if (m[7] && m[10]) iso = parseDateValue(m[0]);
        } else {
          y = +m[13]; mo = +m[12]; d = +m[11]; score = 1;
        }
        if (!validYmd(y, mo, d)) continue;
        var time = null;
        if (m[7]) time = pad(+m[7]) + ":" + m[8];
        else {
          var rest = l.slice(m.index + m[0].length) + " " + (lines[i + 1] || "");
          var before = l.slice(0, m.index);
          var tm = /(?<![\d:])([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?![\d:])/.exec(rest) ||
            /(?<![\d:])([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?![\d:])/.exec(before);
          if (tm) time = pad(+tm[1]) + ":" + tm[2];
        }
        if (time) score += 2;
        if (/datum|date|belegdatum|rechnungsdatum|kaufdatum/.test(f)) score += 2;
        if (/tse|start|ende|signatur|log|ablauf|gueltig|mhd|haltbar/.test(f)) score -= 2;
        if (iso && /tse|start|ende/.test(f)) score += 1; // UTC-Zeit der TSE ist exakt
        var value = iso || (y + "-" + pad(mo) + "-" + pad(d) + "T" + (time || "00:00"));
        if (score > bestScore) { best = value; bestScore = score; }
      }
    }
    return best;
  }

  var TOTAL_P1 = ["zu zahlen", "zahlbetrag", "endbetrag", "gesamtbetrag", "rechnungsbetrag", "summe eur", "total eur",
    "gesamt eur", "summe brutto", "gesamtsumme", "betrag eur", "zu zahlender betrag"];
  var TOTAL_P2 = ["summe", "gesamt", "total", "brutto", "endsumme"];
  var TOTAL_P3 = ["betrag", "kartenzahlung", "ec-cash", "girocard", "bezahlt", "visa", "mastercard", "bar"];
  var TOTAL_EXCLUDE = ["zwischensumme", "zw-summe", "netto", "mwst", "ust", "steuer", "rueckgeld", "wechselgeld",
    "zurueck", "gegeben", "punkte", "rabatt", "ersparnis", "gespart", "sie sparen", "pfand", "trinkgeld", "anzahl", "posten"];

  function detectTotal(lines) {
    var best = null;
    var firstLine = null;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      var f = fold(l);
      var am = amountsIn(l.replace(/\d{1,2}(?:[,.]\d{1,2})?\s*%/g, " "));
      if (!am.length) continue;
      if (hasWord(f, TOTAL_EXCLUDE)) continue;
      var p = 0;
      if (hasWord(f, TOTAL_P1)) p = 1;
      else if (hasWord(f, TOTAL_P2)) p = 2;
      else if (hasWord(f, TOTAL_P3)) p = 3;
      if (!p) continue;
      var value = am[am.length - 1].cents;
      if (value <= 0) continue;
      if (p <= 2 && firstLine == null) firstLine = i;
      if (!best || p < best.priority) best = { cents: value, line: i, priority: p };
    }
    if (best) best.firstLine = firstLine == null ? best.line : firstLine;
    return best;
  }

  var VAT_RATES = [19, 16, 7, 5, 10.7, 5.5, 0];

  function detectVat(lines) {
    var out = [];
    var seen = {};
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      var rm = /(?<![\d,.])(\d{1,2}(?:[,.]\d{1,2})?)\s*%/.exec(l);
      if (!rm) continue;
      var rate = parseFloat(rm[1].replace(",", "."));
      if (VAT_RATES.indexOf(rate) < 0) continue;
      var rest = l.slice(0, rm.index) + " " + l.slice(rm.index + rm[0].length);
      var am = amountsIn(rest).map(function (a) { return a.cents; }).filter(function (c) { return c >= 0; });
      if (!am.length) continue;
      var r = rate / 100;
      var found = null;
      if (am.length >= 3) {
        var a = am.slice(-3);
        var perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
        for (var k = 0; k < perms.length && !found; k++) {
          var net = a[perms[k][0]], tax = a[perms[k][1]], gross = a[perms[k][2]];
          if (near(net + tax, gross, 1) && near(tax, net * r, Math.max(2, net * r * 0.02))) found = { net: net, tax: tax, gross: gross };
        }
      }
      if (!found && am.length >= 2) {
        var x = am[am.length - 2], y = am[am.length - 1];
        if (rate > 0 && near(y, x * r, Math.max(2, x * r * 0.02))) found = { net: x, tax: y, gross: x + y };
        else if (rate > 0 && near(x, y * r / (1 + r), 2)) found = { tax: x, gross: y, net: y - x };
        else if (rate > 0 && near(y, x * r / (1 + r), 2)) found = { gross: x, tax: y, net: x - y };
        else if (rate > 0 && near(x, y * r, Math.max(2, y * r * 0.02))) found = { net: y, tax: x, gross: x + y };
      }
      if (found && !seen[rate]) {
        seen[rate] = true;
        out.push({ rate: rate, net: found.net, tax: found.tax, gross: found.gross });
      }
    }
    return out;
  }

  function detectPayment(lines) {
    var found = [];
    for (var i = 0; i < lines.length; i++) {
      var f = fold(lines[i]);
      for (var k = 0; k < PAYMENT_WORDS.length; k++) {
        if (found.indexOf(PAYMENT_WORDS[k][0]) >= 0) continue;
        if (hasWord(f, PAYMENT_WORDS[k][1])) {
          if (PAYMENT_WORDS[k][0] === "Bar" && /barcode|bar\s*code/.test(f)) continue;
          found.push(PAYMENT_WORDS[k][0]);
        }
      }
    }
    // "Karte" ist überflüssig, wenn Kreditkarte o. ä. erkannt wurde
    if (found.indexOf("Karte") >= 0 && (found.indexOf("Kreditkarte") >= 0 || found.indexOf("Apple Pay") >= 0 || found.indexOf("Google Pay") >= 0)) {
      found.splice(found.indexOf("Karte"), 1);
    }
    // "Bar" nur behalten, wenn keine Karte erkannt wurde oder ausdrücklich bar gezahlt
    if (found.length > 1 && found.indexOf("Bar") >= 0) {
      var explicit = lines.some(function (l) { return /\b(bar|barzahlung|gegeben)\b/.test(fold(l)) && amountsIn(l).length; });
      if (!explicit) found.splice(found.indexOf("Bar"), 1);
    }
    return found.slice(0, 2).join(", ");
  }

  // Mengenzeile: "2 Stk x 0,89", "2 x 0,89 1,78", "0,764 kg x 1,99 EUR/kg"
  var QTY_RE = /^\s*(\d+(?:,\d{1,3})?)\s*(stk\.?|st\.?|x|kg|g|l)?\s*[x*×]\s*(\d+,\d{2})\s*(?:eur|€)?\s*(?:\/\s*(kg|l|stk|st))?\s*(?:(-?\d+,\d{2})\s*(?:[A-Z]{1,2}|\d|\*)?)?\s*$/i;

  function parseQtyLine(l) {
    var m = QTY_RE.exec(l);
    if (!m) return null;
    var qty = parseFloat(m[1].replace(",", "."));
    var unit = (m[2] || m[4] || "").toLowerCase().replace(/\.$/, "");
    if (unit === "x") unit = "";
    if (unit === "st") unit = "stk";
    return { qty: qty, unit: unit, unitPrice: parseAmount(m[3]), price: m[5] ? parseAmount(m[5]) : null };
  }

  // Artikelzeile: Name … Betrag [Steuerkennzeichen]
  var ITEM_RE = new RegExp("^(.*?[A-Za-zÄÖÜäöüß].*?)\\s+" + "(-\\s?)?(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+\\.\\d{2})(-)?" +
    "\\s*(?:€|EUR)?\\s*(?:[A-Z]{1,2}\\*?|\\d|\\*)?\\s*$");
  // Zeile nur mit Preis (gehört zum Text der Zeile darüber)
  var PRICE_ONLY_RE = /^(-\s?)?(\d{1,3}(?:\.\d{3})*,\d{2})(-)?\s*(?:€|EUR)?\s*(?:[A-Z]{1,2}\*?|\d|\*)?$/;

  function cleanItem(item) {
    item.name = item.name.replace(/\s{2,}/g, " ").replace(/^[\s.:*_-]+|[\s.:*_-]+$/g, "").trim();
    return item;
  }

  /** Menge und Einzelpreis aus dem Artikeltext lösen. */
  function splitItemName(name, cents) {
    var item = { name: name, qty: null, unit: "", unitPrice: null, price: cents };
    var abs = Math.abs(cents);
    var am = amountsIn(name);
    var last = am.length ? am[am.length - 1] : null;
    var tail = last ? name.slice(last.end) : "";
    // "Joghurt 0,89 x 2"
    var q = last && /^\s*[x*×]\s*(\d{1,3})\s*$/i.exec(tail);
    if (q) {
      item.qty = +q[1]; item.unitPrice = last.cents; item.name = name.slice(0, last.index);
      return cleanItem(item);
    }
    var unitAtEnd = last && /^\s*$/.test(tail) ? last : null;
    // "2 x Brötchen 0,40", "2 Pizza Margherita 9,50", "2x Cola"
    var lead = /^(\d{1,3})\s*(x|×|stk\.?|st\.?)?\s+(?=\S*[A-Za-zÄÖÜäöüß])(.*)$/i.exec(name);
    if (lead) {
      var n = +lead[1];
      var rest = lead[3];
      if (unitAtEnd && n > 0 && near(unitAtEnd.cents * n, abs, 1)) {
        item.qty = n; item.unitPrice = unitAtEnd.cents;
        item.name = rest.slice(0, rest.length - (name.length - unitAtEnd.index));
        return cleanItem(item);
      }
      if (lead[2] && n > 0) {
        item.qty = n; item.name = rest;
        return cleanItem(item);
      }
    }
    if (unitAtEnd) {
      var before = name.slice(0, unitAtEnd.index);
      // Gastro-Spalten: "Cola 0,4l  2  3,20" (Menge vor dem Einzelpreis)
      var q3 = /^(.*[A-Za-zÄÖÜäöüß].*?)\s+(\d{1,2})\s+$/.exec(before);
      if (q3 && +q3[2] > 1 && near(unitAtEnd.cents * +q3[2], abs, 1)) {
        item.qty = +q3[2]; item.unitPrice = unitAtEnd.cents; item.name = q3[1];
        return cleanItem(item);
      }
      // Einzelpreis gleich Gesamtpreis: doppelte Angabe entfernen
      if (unitAtEnd.cents === abs && !/pfand/i.test(name)) item.name = before;
    }
    return cleanItem(item);
  }

  function applyPendingQty(item, pendingQty) {
    if (pendingQty && item.qty == null && near(Math.round(pendingQty.qty * pendingQty.unitPrice), Math.abs(item.price), 2)) {
      item.qty = pendingQty.qty; item.unit = pendingQty.unit; item.unitPrice = pendingQty.unitPrice;
    }
    return item;
  }

  function detectItems(lines, stopAt) {
    var items = [];
    var end = stopAt == null ? lines.length : stopAt;
    var pendingName = null; // Textzeile ohne Preis – Preis kann in der nächsten Zeile stehen
    var pendingQty = null; // Mengenzeile über dem Artikel (z. B. bei ALDI)
    for (var i = 0; i < end; i++) {
      var l = lines[i].trim();
      var f = fold(l);
      var qty = parseQtyLine(l);
      if (qty) {
        if (qty.price != null && pendingName) {
          items.push({ name: pendingName, qty: qty.qty, unit: qty.unit, unitPrice: qty.unitPrice, price: qty.price });
        } else {
          var expected = qty.price != null ? qty.price : Math.round(qty.qty * qty.unitPrice);
          var prev = items[items.length - 1];
          if (prev && prev.qty == null && near(prev.price, expected, 2)) {
            prev.qty = qty.qty; prev.unit = qty.unit; prev.unitPrice = qty.unitPrice;
          } else {
            pendingQty = qty;
          }
        }
        pendingName = null;
        continue;
      }
      var excluded = hasWord(f, NOT_ITEM);
      var po = PRICE_ONLY_RE.exec(l);
      if (po) {
        if (pendingName && !excluded) {
          var pc = parseAmount(po[2]);
          if (po[1] || po[3]) pc = -pc;
          items.push(applyPendingQty(cleanItem({ name: pendingName, qty: null, unit: "", unitPrice: null, price: pc }), pendingQty));
          pendingQty = null;
        }
        pendingName = null;
        continue;
      }
      var m = excluded ? null : ITEM_RE.exec(l);
      if (!m) {
        pendingName = !excluded && /[A-Za-zÄÖÜäöüß]{3}/.test(l) && !/^[-=_*#\s]+$/.test(l) ? l : null;
        continue;
      }
      var name = m[1];
      var cents = parseAmount(m[3]);
      if (m[2] || m[4]) cents = -cents;
      pendingName = null;
      if ((name.match(/[A-Za-zÄÖÜäöüß]/g) || []).length < 2) continue;
      if (/^(tel|fax|ust|uid|st\.?-?nr|steuer)/i.test(name.trim())) continue;
      var item = applyPendingQty(splitItemName(name, cents), pendingQty);
      pendingQty = null;
      if (item.name.length < 2) continue;
      items.push(item);
    }
    return items;
  }

  function parseText(text) {
    var lines = splitLines(text);
    var merchant = detectMerchant(lines);
    var date = detectDate(lines);
    var total = detectTotal(lines);
    var vat = detectVat(lines);
    var items = detectItems(lines, total ? total.firstLine : null);
    var itemSum = items.reduce(function (s, it) { return s + (it.price || 0); }, 0);
    var totalCents = total ? total.cents : null;
    if (totalCents == null && vat.length) {
      var g = vat.reduce(function (s, v) { return s + (v.gross || 0); }, 0);
      if (g > 0) totalCents = g;
    }
    if (totalCents == null && items.length) totalCents = itemSum;
    // MwSt.-Zeilen mit nur einem Betrag: anhand der Summe zuordnen
    if (!vat.length && totalCents) {
      lines.forEach(function (l) {
        var rm = /(\d{1,2})(?:[,.]0{1,2})?\s*%/.exec(l);
        if (!rm || !/mwst|ust|steuer/i.test(l)) return;
        var rate = +rm[1];
        if (rate !== 19 && rate !== 7) return;
        var am = amountsIn(l.replace(rm[0], " "));
        if (am.length !== 1) return;
        if (near(am[0].cents, totalCents * rate / (100 + rate), 2) && !vat.some(function (v) { return v.rate === rate; })) {
          vat.push({ rate: rate, tax: am[0].cents, gross: totalCents, net: totalCents - am[0].cents });
        }
      });
    }
    var receiptNo = null;
    for (var i = 0; i < lines.length; i++) {
      var rn = /\b(?:Bon|Beleg|Rechnungs?|Quittungs?|Bon-|Beleg-|Transaktions?)[\s-]*(?:Nr|Nummer)\.?\s*:?\s*([A-Z0-9][A-Z0-9\/-]{1,24})/i.exec(lines[i]);
      if (rn) { receiptNo = rn[1]; break; }
    }
    var tseSerial = null;
    var ts = /TSE[\s-]*(?:Seriennummer|Serien-?Nr\.?|Serial|SN)\s*:?\s*([0-9a-fA-F]{16,})/i.exec(lines.join("\n"));
    if (ts) tseSerial = ts[1];
    return {
      format: "text",
      merchant: merchant.name,
      merchantConfident: merchant.confident,
      category: merchant.category || null,
      date: date,
      total: totalCents,
      totalConfident: !!total && (!items.length || near(itemSum, totalCents, 2) || total.priority <= 2),
      currency: "EUR",
      items: items,
      vat: vat,
      payment: detectPayment(lines),
      receiptNo: receiptNo,
      tse: tseSerial ? { serial: tseSerial } : null,
      text: lines.join("\n")
    };
  }

  // ---------------------------------------------------------------------------
  // Strukturierte Belege (JSON / XML)
  // ---------------------------------------------------------------------------

  function k(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ""); }

  var MERCHANT_PARENTS = ["seller", "merchant", "store", "shop", "vendor", "company", "business", "retailer", "issuer",
    "supplier", "haendler", "verkaeufer", "unternehmen", "sellertradeparty", "accountingsupplierparty", "location", "branch", "filiale"];
  var NAME_KEYS = ["name", "companyname", "displayname", "tradename", "legalname", "registrationname", "title", "firma", "bezeichnung"];
  var MERCHANT_KEYS = ["merchant", "merchantname", "storename", "sellername", "shopname", "companyname", "vendorname", "retailername", "haendler", "firma"];
  var DATE_KEYS = ["date", "datetime", "timestamp", "receiptdate", "transactiondate", "issuedate", "issuedatetime",
    "datetimestring", "created", "createdat", "time", "begin", "start", "starttime", "datumuhrzeit", "belegdatum", "datum",
    "invoicedate", "issuedat", "logtime", "end", "endtime", "purchasedate", "bookingdate", "transactiontime"];
  var TOTAL_KEYS = ["fullamountinclvat", "grandtotalamount", "duepayableamount", "payableamount", "taxinclusiveamount",
    "totalgross", "grosstotal", "grandtotal", "totalamount", "totalcents", "totalamountcents", "amountcents", "amounttotal", "total", "totalprice", "gross", "grossamount",
    "amountinclvat", "brutto", "bruttobetrag", "gesamt", "gesamtbetrag", "summe", "sum", "amount"];
  var ITEM_ARRAY_KEYS = ["lines", "items", "positions", "lineitems", "articles", "products", "entries", "positionen",
    "artikel", "receiptlines", "invoicelines", "invoiceline", "includedsupplychaintradelineitem", "lineitem", "item", "posten"];
  var ITEM_NAME_KEYS = ["text", "name", "description", "title", "articlename", "productname", "bezeichnung", "artikel", "label", "designation"];
  var ITEM_TOTAL_KEYS = ["total", "totalamount", "fullamountinclvat", "linetotal", "linetotalamount", "lineextensionamount",
    "totalprice", "pricetotal", "amount", "gross", "grossamount", "sum", "summe", "betrag", "amountinclvat",
    "amountcents", "totalcents", "pricecents"];
  var ITEM_UNIT_KEYS = ["priceperunit", "unitpricecents", "unitprice", "price", "einzelpreis", "chargeamount", "priceamount"];
  var ITEM_QTY_KEYS = ["quantity", "qty", "count", "menge", "anzahl", "billedquantity", "invoicedquantity"];

  function scalar(v) {
    if (v == null) return null;
    if (typeof v === "object") {
      if ("#text" in v) return v["#text"];
      if ("value" in v && typeof v.value !== "object") return v.value;
      return null;
    }
    return v;
  }

  function amountValue(v, key) {
    v = scalar(v);
    if (v == null || v === "") return null;
    if (typeof v === "number") return /cent/.test(key || "") ? Math.round(v) : Math.round(v * 100);
    var s = String(v).trim();
    if (!/\d/.test(s) || /[a-df-z]{2,}/i.test(s.replace(/eur/i, ""))) return null;
    return parseAmount(s);
  }

  function walk(obj, path, out, depth) {
    if (depth > 12 || obj == null) return;
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length && i < 500; i++) walk(obj[i], path.concat([String(i)]), out, depth + 1);
      return;
    }
    if (typeof obj === "object") {
      Object.keys(obj).forEach(function (key) {
        if (key === "@attrs") return;
        var v = obj[key];
        if (v != null && typeof v === "object" && !Array.isArray(v) && "#text" in v && Object.keys(v).filter(function (x) { return x !== "@attrs"; }).length === 1) {
          out.push({ path: path.concat([key]), key: k(key), value: v["#text"] });
        } else if (v != null && typeof v === "object") {
          walk(v, path.concat([key]), out, depth + 1);
        } else {
          out.push({ path: path.concat([key]), key: k(key), value: v });
        }
      });
    }
  }

  function pathHas(path, list) {
    for (var i = 0; i < path.length; i++) if (list.indexOf(k(path[i])) >= 0) return true;
    return false;
  }

  function findFirst(obj, keys) {
    if (!obj || typeof obj !== "object") return undefined;
    for (var i = 0; i < keys.length; i++) {
      for (var key in obj) {
        if (k(key) === keys[i]) {
          var v = scalar(obj[key]);
          if (v != null && v !== "") return { key: k(key), value: v, raw: obj[key] };
        }
      }
    }
    return undefined;
  }

  function deepGet(obj, keys) {
    var cur = obj;
    for (var i = 0; i < keys.length; i++) {
      if (cur == null || typeof cur !== "object") return undefined;
      if (Array.isArray(cur)) cur = cur[0];
      var next;
      for (var key in cur) if (k(key) === keys[i]) { next = cur[key]; break; }
      cur = next;
    }
    if (Array.isArray(cur)) cur = cur[0];
    return cur;
  }

  function asArray(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }

  function itemFromObject(o) {
    if (!o || typeof o !== "object") return null;
    var nameHit = findFirst(o, ITEM_NAME_KEYS);
    var name = nameHit ? nameHit.value : null;
    if (!name) {
      var nested = deepGet(o, ["item"]) || deepGet(o, ["specifiedtradeproduct"]) || deepGet(o, ["product"]) || deepGet(o, ["article"]);
      if (nested) { var nh = findFirst(nested, ITEM_NAME_KEYS); if (nh) name = nh.value; }
    }
    if (!name || typeof name === "object") return null;
    var qtyHit = findFirst(o, ITEM_QTY_KEYS) ||
      findFirst(deepGet(o, ["specifiedlinetradedelivery"]) || {}, ITEM_QTY_KEYS);
    var qty = qtyHit ? parseFloat(String(qtyHit.value).replace(",", ".")) : null;
    var totalHit = findFirst(o, ITEM_TOTAL_KEYS) ||
      findFirst(deepGet(o, ["specifiedlinetradesettlement", "specifiedtradesettlementlinemonetarysummation"]) || {}, ITEM_TOTAL_KEYS);
    var unitHit = findFirst(o, ITEM_UNIT_KEYS) || findFirst(deepGet(o, ["price"]) || {}, ITEM_UNIT_KEYS) ||
      findFirst(deepGet(o, ["specifiedlinetradeagreement", "netpriceproducttradeprice"]) || {}, ITEM_UNIT_KEYS);
    var price = totalHit ? amountValue(totalHit.value, totalHit.key) : null;
    var unitPrice = unitHit ? amountValue(unitHit.value, unitHit.key) : null;
    if (price == null && unitPrice != null) price = Math.round(unitPrice * (qty || 1));
    if (price == null) return null;
    return {
      name: String(name).replace(/\s+/g, " ").trim().slice(0, 120),
      qty: qty && isFinite(qty) && qty !== 1 ? qty : (qty === 1 ? 1 : null),
      unit: "",
      unitPrice: unitPrice != null && unitPrice !== price ? unitPrice : null,
      price: price
    };
  }

  function parseStructured(obj, format) {
    var entries = [];
    walk(obj, [], entries, 0);

    // Geschäft
    var merchant = "";
    var cands = entries.filter(function (e) {
      return typeof e.value === "string" && e.value.trim() && NAME_KEYS.indexOf(e.key) >= 0 && pathHas(e.path.slice(0, -1), MERCHANT_PARENTS) &&
        !pathHas(e.path, ["buyer", "customer", "buyertradeparty", "accountingcustomerparty", "kunde", "address", "postaladdress", "contact"]);
    }).sort(function (a, b) { return a.path.length - b.path.length; });
    if (cands.length) merchant = cands[0].value;
    if (!merchant) {
      var direct = entries.filter(function (e) { return typeof e.value === "string" && MERCHANT_KEYS.indexOf(e.key) >= 0; })
        .sort(function (a, b) { return a.path.length - b.path.length; });
      if (direct.length) merchant = direct[0].value;
    }

    // Datum
    var date = null;
    var lineKeys = ITEM_ARRAY_KEYS;
    for (var di = 0; di < DATE_KEYS.length && !date; di++) {
      var dk = DATE_KEYS[di];
      var dEntries = entries.filter(function (e) { return e.key === dk && !pathHas(e.path.slice(0, -1), lineKeys) && !pathHas(e.path, ["duedate", "deliverydate", "paymentterms", "specifiedtradepaymentterms", "validity", "certificate"]); })
        .sort(function (a, b) { return a.path.length - b.path.length; });
      for (var dj = 0; dj < dEntries.length && !date; dj++) date = parseDateValue(dEntries[dj].value);
    }

    // Summe
    var total = null;
    for (var ti = 0; ti < TOTAL_KEYS.length && total == null; ti++) {
      var tk = TOTAL_KEYS[ti];
      var tEntries = entries.filter(function (e) {
        return e.key === tk && !pathHas(e.path.slice(0, -1), lineKeys.concat(["vatamounts", "taxes", "vat", "taxtotal", "taxsubtotal",
          "applicabletradetax", "payments", "paymenttypes", "payment", "allowancecharge", "discounts", "taxamounts"]));
      }).sort(function (a, b) { return a.path.length - b.path.length; });
      for (var tj = 0; tj < tEntries.length && total == null; tj++) {
        var c = amountValue(tEntries[tj].value, tEntries[tj].key);
        if (c != null && c > 0) total = c;
      }
    }

    // Artikel: größtes passendes Array
    var items = [];
    (function findArrays(o, depth) {
      if (!o || typeof o !== "object" || depth > 8) return;
      Object.keys(o).forEach(function (key) {
        var v = o[key];
        if (ITEM_ARRAY_KEYS.indexOf(k(key)) >= 0) {
          var arr = asArray(v).map(itemFromObject).filter(Boolean);
          if (arr.length > items.length) items = arr;
        }
        if (v && typeof v === "object") {
          if (Array.isArray(v)) v.slice(0, 50).forEach(function (x) { findArrays(x, depth + 1); });
          else findArrays(v, depth + 1);
        }
      });
    })(obj, 0);

    // MwSt.
    var vat = [];
    (function findVat(o, depth) {
      if (!o || typeof o !== "object" || depth > 8 || vat.length) return;
      Object.keys(o).forEach(function (key) {
        var kk = k(key);
        var v = o[key];
        if (["vatamounts", "taxes", "vat", "taxamounts", "taxlines", "taxsubtotal", "applicabletradetax", "mwst", "vatlines"].indexOf(kk) >= 0 && !vat.length) {
          asArray(v).forEach(function (t) {
            if (!t || typeof t !== "object") return;
            var rateHit = findFirst(t, ["percentage", "rate", "vatrate", "taxrate", "percent", "rateapplicablepercent", "satz"]) ||
              findFirst(deepGet(t, ["taxcategory"]) || {}, ["percent"]);
            if (!rateHit) return;
            var rate = parseFloat(String(rateHit.value).replace(",", "."));
            if (!isFinite(rate)) return;
            if (rate > 0 && rate < 1) rate = Math.round(rate * 1000) / 10;
            var gross = findFirst(t, ["inclvat", "gross", "grossamount", "brutto", "amountinclvat"]);
            var net = findFirst(t, ["exclvat", "net", "netamount", "netto", "basisamount", "taxableamount", "amountexclvat"]);
            var tax = findFirst(t, ["vat", "tax", "taxamount", "vatamount", "calculatedamount", "mwst", "amount"]);
            var e = {
              rate: rate,
              gross: gross ? amountValue(gross.value, gross.key) : null,
              net: net ? amountValue(net.value, net.key) : null,
              tax: tax ? amountValue(tax.value, tax.key) : null
            };
            if (e.gross == null && e.net != null && e.tax != null) e.gross = e.net + e.tax;
            if (e.net == null && e.gross != null && e.tax != null) e.net = e.gross - e.tax;
            if (e.gross != null || e.tax != null) vat.push(e);
          });
        }
        if (v && typeof v === "object") findVat(Array.isArray(v) ? { _: v[0] } : v, depth + 1);
      });
    })(obj, 0);

    // Zahlungsart
    var payment = "";
    var pay = entries.filter(function (e) {
      return typeof e.value === "string" && pathHas(e.path, ["paymenttypes", "payments", "payment", "paymentmeans", "zahlungsart", "specifiedtradesettlementpaymentmeans"]) &&
        ["name", "type", "method", "paymenttype", "description", "information", "art"].indexOf(e.key) >= 0;
    });
    if (pay.length) {
      var f = fold(pay.map(function (p) { return p.value; }).join(" "));
      for (var pi = 0; pi < PAYMENT_WORDS.length; pi++) if (hasWord(f, PAYMENT_WORDS[pi][1]) || f.indexOf(PAYMENT_WORDS[pi][0].toLowerCase()) >= 0) { payment = PAYMENT_WORDS[pi][0]; break; }
      if (!payment) payment = /cash/.test(f) ? "Bar" : /card|karte/.test(f) ? "Karte" : pay[0].value.slice(0, 30);
    }

    var currencyHit = entries.filter(function (e) { return ["currency", "currencycode", "invoicecurrencycode", "documentcurrencycode", "waehrung"].indexOf(e.key) >= 0 && /^[A-Z]{3}$/.test(String(e.value)); })[0];

    if (total == null && vat.length) {
      var g = vat.reduce(function (s, v) { return s + (v.gross || 0); }, 0);
      if (g > 0) total = g;
    }
    if (total == null && items.length) total = items.reduce(function (s, it) { return s + it.price; }, 0);

    // Lesbarer Text für Suche und Anzeige
    var seenText = {};
    var textParts = [];
    entries.forEach(function (e) {
      if (typeof e.value !== "string") return;
      var v = e.value.trim();
      if (!v || v.length > 200 || seenText[v] || /^[A-Za-z0-9+/=]{40,}$/.test(v)) return;
      seenText[v] = true;
      textParts.push(v);
    });

    var name = merchant ? cleanMerchantName(merchant) : "";
    var chain = name ? chainFor(merchant) : null;
    if (!chain && !name) chain = chainFor(textParts.slice(0, 15).join("\n"));
    if (chain) name = chain.name;

    return {
      format: format,
      merchant: name,
      merchantConfident: !!name,
      category: chain ? chain.category : null,
      date: date,
      total: total,
      totalConfident: total != null,
      currency: currencyHit ? currencyHit.value : "EUR",
      items: items,
      vat: vat,
      payment: payment,
      receiptNo: null,
      tse: null,
      text: textParts.join("\n").slice(0, 20000)
    };
  }

  function parseJsonReceipt(input) {
    var obj = input;
    if (typeof input === "string") {
      try { obj = JSON.parse(input); } catch (e) { return null; }
    }
    if (!obj || typeof obj !== "object") return null;
    return parseStructured(obj, "json");
  }

  // Kleiner XML-Leser (ohne DTD), liefert Objektbaum mit lokalen Namen
  function decodeEntities(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, function (m, e) {
      var el = e.toLowerCase();
      if (el === "amp") return "&";
      if (el === "lt") return "<";
      if (el === "gt") return ">";
      if (el === "quot") return '"';
      if (el === "apos") return "'";
      if (el[1] === "x") return String.fromCharCode(parseInt(el.slice(2), 16));
      return String.fromCharCode(parseInt(el.slice(1), 10));
    });
  }

  function parseXml(xml) {
    var s = String(xml).replace(/^﻿/, "");
    var rootNode = { name: "#root", children: [], attrs: {}, text: "" };
    var stack = [rootNode];
    var re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/\s*([^\s>]+)\s*>|<\s*([^\s>/]+)((?:\s+[^\s=>/]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
    var m;
    var guard = 0;
    while ((m = re.exec(s)) && guard++ < 200000) {
      var top = stack[stack.length - 1];
      if (m[1] != null) top.text += m[1];
      else if (m[2]) { if (stack.length > 1) stack.pop(); }
      else if (m[3]) {
        var node = { name: m[3].replace(/^.*:/, ""), children: [], attrs: {}, text: "" };
        var ar = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
        var a;
        while ((a = ar.exec(m[4] || ""))) node.attrs[a[1].replace(/^.*:/, "")] = decodeEntities(a[2] != null ? a[2] : a[3]);
        top.children.push(node);
        if (!m[5]) stack.push(node);
      } else if (m[6] != null) top.text += decodeEntities(m[6]);
    }
    return rootNode;
  }

  function xmlToObject(node) {
    var hasChildren = node.children.length > 0;
    var text = node.text.trim();
    var attrKeys = Object.keys(node.attrs);
    if (!hasChildren) {
      if (!attrKeys.length) return text;
      var leaf = { "#text": text, "@attrs": node.attrs };
      return leaf;
    }
    var o = {};
    if (attrKeys.length) o["@attrs"] = node.attrs;
    node.children.forEach(function (c) {
      var v = xmlToObject(c);
      if (c.name in o) {
        if (!Array.isArray(o[c.name])) o[c.name] = [o[c.name]];
        o[c.name].push(v);
      } else o[c.name] = v;
    });
    if (text) o["#text"] = text;
    return o;
  }

  function parseXmlReceipt(xml) {
    var tree = parseXml(xml);
    if (!tree.children.length) return null;
    var rootEl = tree.children[0];
    var obj = {};
    obj[rootEl.name] = xmlToObject(rootEl);
    var draft = parseStructured(obj, "xml");
    // ZUGFeRD/Factur-X (CII): Datum im Format 102 (yyyymmdd)
    var dts = deepGet(obj, [k(rootEl.name), "exchangeddocument", "issuedatetime", "datetimestring"]);
    if (dts) draft.date = parseDateValue(scalar(dts)) || draft.date;
    var cii = deepGet(obj, [k(rootEl.name), "supplychaintradetransaction", "applicableheadertradesettlement", "specifiedtradesettlementheadermonetarysummation"]);
    if (cii) {
      var gt = findFirst(cii, ["grandtotalamount", "duepayableamount"]);
      if (gt) draft.total = amountValue(gt.value);
    }
    var seller = deepGet(obj, [k(rootEl.name), "supplychaintradetransaction", "applicableheadertradeagreement", "sellertradeparty", "name"]) ||
      deepGet(obj, [k(rootEl.name), "accountingsupplierparty", "party", "partyname", "name"]) ||
      deepGet(obj, [k(rootEl.name), "accountingsupplierparty", "party", "partylegalentity", "registrationname"]);
    if (scalar(seller)) {
      var chain = chainFor(String(scalar(seller)));
      draft.merchant = chain ? chain.name : cleanMerchantName(scalar(seller));
      draft.category = chain ? chain.category : draft.category;
      draft.merchantConfident = true;
    }
    var ubl = deepGet(obj, [k(rootEl.name), "legalmonetarytotal"]);
    if (ubl) {
      var pa = findFirst(ubl, ["payableamount", "taxinclusiveamount"]);
      if (pa) draft.total = amountValue(pa.value);
    }
    var issue = deepGet(obj, [k(rootEl.name), "issuedate"]);
    if (scalar(issue)) draft.date = parseDateValue(scalar(issue)) || draft.date;
    if (/^(crossindustryinvoice|invoice|creditnote)$/i.test(rootEl.name)) draft.isInvoice = true;
    return draft;
  }

  // ---------------------------------------------------------------------------
  // Einstieg: beliebiger Inhalt (z. B. aus QR-Code oder Datei)
  // ---------------------------------------------------------------------------

  function classifyQr(text) {
    var s = String(text || "").trim();
    if (/^https?:\/\//i.test(s)) return { type: "url", url: s };
    if (/^www\.[^\s]+\.[a-z]{2,}/i.test(s)) return { type: "url", url: "https://" + s };
    if (/^V0;/.test(s)) return { type: "tse" };
    if (/^[\[{]/.test(s)) {
      try { JSON.parse(s); return { type: "json" }; } catch (e) { /* kein JSON */ }
    }
    if (/^<(\?xml|[A-Za-z])/.test(s)) return { type: "xml" };
    var urlInside = /https?:\/\/[^\s"'<>]+/i.exec(s);
    if (urlInside && s.length < 600) return { type: "url", url: urlInside[0].replace(/[).,;]+$/, "") };
    return { type: "text" };
  }

  function emptyDraft() {
    return { format: "manual", merchant: "", date: null, total: null, currency: "EUR", items: [], vat: [], payment: "", text: "" };
  }

  /** Mehrere Erkennungen zusammenführen (z. B. PDF-Text + eingebettetes XML + TSE-QR). */
  function mergeDrafts(primary, secondary) {
    if (!secondary) return primary;
    if (!primary) return secondary;
    var out = {};
    Object.keys(secondary).forEach(function (key) { out[key] = secondary[key]; });
    Object.keys(primary).forEach(function (key) {
      var v = primary[key];
      var empty = v == null || v === "" || (Array.isArray(v) && !v.length);
      if (!empty) out[key] = v;
    });
    return out;
  }

  var api = {
    fold: fold,
    keyOf: keyOf,
    parseAmount: parseAmount,
    formatAmount: formatAmount,
    formatPlain: formatPlain,
    amountsIn: amountsIn,
    parseDateValue: parseDateValue,
    toLocalIso: toLocalIso,
    parseTSE: parseTSE,
    parseText: parseText,
    parseJsonReceipt: parseJsonReceipt,
    parseXmlReceipt: parseXmlReceipt,
    parseXml: parseXml,
    classifyQr: classifyQr,
    cleanMerchantName: cleanMerchantName,
    suggestCategory: suggestCategory,
    chainFor: chainFor,
    mergeDrafts: mergeDrafts,
    emptyDraft: emptyDraft,
    CATEGORIES: CATEGORIES
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BonParser = api;
})(typeof window !== "undefined" ? window : this);
