// ─── Real stadium photography, keyed by home team ─────────────────────────────
//
// Each entry points at a Creative-Commons photo on Wikimedia Commons, served via
// the stable `Special:FilePath` redirect (resolves to the current upload URL for
// that exact filename, at a requested width). Every filename here was pulled
// from the venue's English-Wikipedia article lead image via the MediaWiki
// `pageimages` API, so each one provably exists — a broken/renamed file simply
// triggers the SVG fallback in <StadiumImage>, never an empty box.
//
// Honesty note: these are the *actual physical venues* (some under a former
// naming-rights name — e.g. Bills Stadium = Highmark, Paul Brown = Paycor,
// FirstEnergy = Cleveland Browns Stadium). Same building, so the depiction is
// truthful. LAR/LAC/LA share SoFi; NYG/NYJ share MetLife — matching reality.

export interface StadiumImageMeta {
  /** Exact Wikimedia Commons filename (as stored on Commons). */
  file: string;
  /** Short human credit — CC image sourced from Wikimedia Commons. */
  credit: string;
}

export const STADIUM_IMAGES: Record<string, StadiumImageMeta> = {
  ARI: { file: 'State_Farm_Stadium_2022.jpg', credit: 'Wikimedia Commons' },
  ATL: { file: 'Mercedes_Benz_Stadium_time_lapse_capture_2017-08-13.jpg', credit: 'Wikimedia Commons' },
  BAL: { file: 'M&T_Bank_Stadium_in_Baltimore.jpg', credit: 'Wikimedia Commons' },
  BUF: { file: 'Bills_Stadium_May26.jpg', credit: 'Wikimedia Commons' },
  CAR: { file: 'Aerial_view_of_Bank_of_America_Stadium_in_Charlotte.jpg', credit: 'Wikimedia Commons' },
  CHI: { file: 'Soldier_Field_S.jpg', credit: 'Wikimedia Commons' },
  CIN: { file: 'Paul_Brown_Stadium_interior_2017.jpg', credit: 'Wikimedia Commons' },
  CLE: { file: 'FirstEnergy_Stadium_50_yardline_panorama.png', credit: 'Wikimedia Commons' },
  DAL: { file: 'Arlington_June_2020_4_(AT&T_Stadium).jpg', credit: 'Wikimedia Commons' },
  DEN: { file: 'Empower_Field_at_Mile_High_20241001.jpg', credit: 'Wikimedia Commons' },
  DET: { file: 'Detroit_December_2015_09_(Ford_Field).jpg', credit: 'Wikimedia Commons' },
  GB:  { file: 'Lambeau_Field_-_Green_Bay_Packers_Football_Stadium_-_Wisconsin.jpg', credit: 'Wikimedia Commons' },
  HOU: { file: 'Nrg_stadium.jpg', credit: 'Wikimedia Commons' },
  IND: { file: 'Aerial_view_of_Indianapolis,_Indiana,_with_a_focus_on_Lucas_Oil_Stadium,_highsm.40934.jpg', credit: 'Wikimedia Commons' },
  JAX: { file: 'EverBank_Stadium_aerial_view.jpg', credit: 'Wikimedia Commons' },
  KC:  { file: 'Aerial_view_of_Arrowhead_Stadium_08-31-2013.jpg', credit: 'Wikimedia Commons' },
  LA:  { file: 'SoFi_Stadium_2023.jpg', credit: 'Wikimedia Commons' },
  LAC: { file: 'SoFi_Stadium_2023.jpg', credit: 'Wikimedia Commons' },
  LAR: { file: 'SoFi_Stadium_2023.jpg', credit: 'Wikimedia Commons' },
  LV:  { file: 'Allegiant_Stadium_Street_View_on_Super_Bowl_LVIII.jpg', credit: 'Wikimedia Commons' },
  MIA: { file: 'Hard_Rock_Stadium_for_Super_Bowl_LIV_(49606710103).jpg', credit: 'Wikimedia Commons' },
  MIN: { file: 'U.S._Bank_Stadium_2021-09-23.jpg', credit: 'Wikimedia Commons' },
  NE:  { file: 'Gillette_Stadium_(Top_View).jpg', credit: 'Wikimedia Commons' },
  NO:  { file: 'DHS_Agencies_Support_Super_Bowl_LIX_Security_February_2025_-_108.jpg', credit: 'Wikimedia Commons' },
  NYG: { file: 'Metlife_stadium_(Aerial_view).jpg', credit: 'Wikimedia Commons' },
  NYJ: { file: 'Metlife_stadium_(Aerial_view).jpg', credit: 'Wikimedia Commons' },
  PHI: { file: 'Lincoln_Financial_Field_(Aerial_view).jpg', credit: 'Wikimedia Commons' },
  PIT: { file: 'Acrisure_Stadium_2024.jpg', credit: 'Wikimedia Commons' },
  SEA: { file: '2026_FIFA_World_Cup_-_Belgium_v._Egypt_in_Seattle_-_04.jpg', credit: 'Wikimedia Commons' },
  SF:  { file: "Levi's_Stadium_in_February_2016_prior_to_Super_Bowl_50_(24398261729).jpg", credit: 'Wikimedia Commons' },
  TB:  { file: 'Raymond_James_Stadium_Aerial_(2).jpg', credit: 'Wikimedia Commons' },
  TEN: { file: 'Aerial_view_of_Nissan_Stadium_(Tennessee_Titans).jpg', credit: 'Wikimedia Commons' },
  WAS: { file: 'Commanders_vs_Giants_(53345178211).jpg', credit: 'Wikimedia Commons' },
};

/**
 * Stable URL for a team's stadium photo at a requested pixel width, or null when
 * we have no mapping for that team (caller should fall back to the SVG scene).
 */
export function stadiumImageUrl(team: string, width = 1000): string | null {
  const meta = STADIUM_IMAGES[team];
  if (!meta) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(meta.file)}?width=${width}`;
}

/** Short attribution string for a team's stadium photo, or null when unmapped. */
export function stadiumImageCredit(team: string): string | null {
  return STADIUM_IMAGES[team]?.credit ?? null;
}
