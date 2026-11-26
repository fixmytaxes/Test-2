// ISO-3166-1-Ländercodes (plus XK für Kosovo) und die Zuordnung von Überseegebieten zum Mutterland
// (R 9.6 Abs. 3 Satz 2 LStR: nicht erfasste Übersee- und Außengebiete erhalten den Pauschbetrag des Mutterlandes).
export const COUNTRY_CODES: string[] = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD ' +
  'CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF ' +
  'GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN ' +
  'KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA ' +
  'NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI ' +
  'SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI ' +
  'VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ');

export const SOVEREIGN_OF: Record<string, string> = {
  AI: 'GB', AS: 'US', AW: 'NL', AX: 'FI', BL: 'FR', BM: 'GB', BQ: 'NL', BV: 'NO', CC: 'AU', CK: 'NZ', CW: 'NL', CX: 'AU',
  FK: 'GB', FO: 'DK', GF: 'FR', GG: 'GB', GI: 'GB', GL: 'DK', GP: 'FR', GS: 'GB', GU: 'US', HM: 'AU', IM: 'GB', IO: 'GB',
  JE: 'GB', KY: 'GB', MF: 'FR', MO: 'CN', MP: 'US', MQ: 'FR', MS: 'GB', NC: 'FR', NF: 'AU', NU: 'NZ', PF: 'FR', PM: 'FR',
  PN: 'GB', PR: 'US', RE: 'FR', SH: 'GB', SJ: 'NO', SX: 'NL', TC: 'GB', TF: 'FR', TK: 'NZ', UM: 'US', VG: 'GB', VI: 'US',
  WF: 'FR', YT: 'FR',
};

let displayNames: Intl.DisplayNames | null = null;
try {
  displayNames = new Intl.DisplayNames(['de'], { type: 'region' });
} catch {
  displayNames = null;
}

const FALLBACK: Record<string, string> = { DE: 'Deutschland', XK: 'Kosovo' };

export function countryName(code: string): string {
  if (!code) return '';
  if (FALLBACK[code] && !displayNames) return FALLBACK[code];
  try {
    return displayNames?.of(code) ?? FALLBACK[code] ?? code;
  } catch {
    return FALLBACK[code] ?? code;
  }
}

let sorted: { code: string; name: string }[] | null = null;
/** Alle Länder alphabetisch, Deutschland zuerst */
export function countryOptions(): { code: string; name: string }[] {
  if (!sorted) {
    const coll = new Intl.Collator('de');
    sorted = COUNTRY_CODES.filter((c) => c !== 'DE' && c !== 'AQ')
      .map((code) => ({ code, name: countryName(code) }))
      .sort((a, b) => coll.compare(a.name, b.name));
    sorted.unshift({ code: 'DE', name: 'Deutschland' });
  }
  return sorted;
}
