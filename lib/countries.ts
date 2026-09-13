/* ============================================================
   The PIPELINE table's `country` field is entered in French
   ("Maroc", "Côte d'Ivoire", "États-Unis"...). world-atlas's
   country topojson (components/charts/WorldMap.tsx) names
   countries in English. This is the FR -> English lookup that
   bridges the two — countries not listed here simply don't light
   up on the map rather than guessing, consistent with the rest of
   the app never fabricating data.
   ============================================================ */

const FR_TO_EN: Record<string, string> = {
  maroc: "Morocco",
  france: "France",
  senegal: "Senegal",
  "cote d'ivoire": "Ivory Coast",
  "côte d'ivoire": "Ivory Coast",
  tunisie: "Tunisia",
  algerie: "Algeria",
  algérie: "Algeria",
  egypte: "Egypt",
  égypte: "Egypt",
  "etats-unis": "United States of America",
  "états-unis": "United States of America",
  usa: "United States of America",
  canada: "Canada",
  "emirats arabes unis": "United Arab Emirates",
  "émirats arabes unis": "United Arab Emirates",
  "royaume-uni": "United Kingdom",
  "angleterre": "United Kingdom",
  allemagne: "Germany",
  espagne: "Spain",
  italie: "Italy",
  belgique: "Belgium",
  suisse: "Switzerland",
  portugal: "Portugal",
  pays_bas: "Netherlands",
  "pays-bas": "Netherlands",
  nigeria: "Nigeria",
  kenya: "Kenya",
  rwanda: "Rwanda",
  cameroun: "Cameroon",
  ghana: "Ghana",
  "afrique du sud": "South Africa",
  mali: "Mali",
  gabon: "Gabon",
  "burkina faso": "Burkina Faso",
  benin: "Benin",
  bénin: "Benin",
  togo: "Togo",
  "guinee": "Guinea",
  "guinée": "Guinea",
  mauritanie: "Mauritania",
  jordanie: "Jordan",
  liban: "Lebanon",
  "arabie saoudite": "Saudi Arabia",
  qatar: "Qatar",
  turquie: "Turkey",
  chine: "China",
  inde: "India",
  singapour: "Singapore",
};

function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** French country name (as entered in Airtable) -> English name matching
    world-atlas's topojson `properties.name`. Returns null when unknown
    rather than guessing. */
export function toMapCountryName(raw: string | null): string | null {
  if (!raw) return null;
  return FR_TO_EN[normalize(raw)] ?? null;
}
