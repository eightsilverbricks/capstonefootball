// ─── Stadium photo proxy (Vercel serverless function, repo-root /api) ────────
//
// Duplicate of primary-ui/api/stadium.js so the proxy resolves regardless of
// whether the Vercel project's Root Directory is the repo root (this file) or
// primary-ui (that file). Whichever is the active root, its /api is deployed.
//
// This copy is CommonJS: the repo root has no package.json, so .js defaults to
// CommonJS here. (The primary-ui copy is ESM because primary-ui is type:module.)
//
// Wikimedia Commons blocks/rate-limits third-party hotlinking from a deployed
// origin, so we fetch server-side with a policy-compliant User-Agent and cache
// hard at the edge. The team → filename allowlist is kept in sync with
// primary-ui/src/data/stadiumImages.ts and prevents open-proxy abuse.

const FILES = {
  ARI: 'State_Farm_Stadium_2022.jpg',
  ATL: 'Mercedes_Benz_Stadium_time_lapse_capture_2017-08-13.jpg',
  BAL: 'M&T_Bank_Stadium_in_Baltimore.jpg',
  BUF: 'Bills_Stadium_May26.jpg',
  CAR: 'Aerial_view_of_Bank_of_America_Stadium_in_Charlotte.jpg',
  CHI: 'Soldier_Field_S.jpg',
  CIN: 'Paul_Brown_Stadium_interior_2017.jpg',
  CLE: 'FirstEnergy_Stadium_50_yardline_panorama.png',
  DAL: 'Arlington_June_2020_4_(AT&T_Stadium).jpg',
  DEN: 'Empower_Field_at_Mile_High_20241001.jpg',
  DET: 'Detroit_December_2015_09_(Ford_Field).jpg',
  GB: 'Lambeau_Field_-_Green_Bay_Packers_Football_Stadium_-_Wisconsin.jpg',
  HOU: 'Nrg_stadium.jpg',
  IND: 'Aerial_view_of_Indianapolis,_Indiana,_with_a_focus_on_Lucas_Oil_Stadium,_highsm.40934.jpg',
  JAX: 'EverBank_Stadium_aerial_view.jpg',
  KC: 'Aerial_view_of_Arrowhead_Stadium_08-31-2013.jpg',
  LA: 'SoFi_Stadium_2023.jpg',
  LAC: 'SoFi_Stadium_2023.jpg',
  LAR: 'SoFi_Stadium_2023.jpg',
  LV: 'Allegiant_Stadium_Street_View_on_Super_Bowl_LVIII.jpg',
  MIA: 'Hard_Rock_Stadium_for_Super_Bowl_LIV_(49606710103).jpg',
  MIN: 'U.S._Bank_Stadium_2021-09-23.jpg',
  NE: 'Gillette_Stadium_(Top_View).jpg',
  NO: 'DHS_Agencies_Support_Super_Bowl_LIX_Security_February_2025_-_108.jpg',
  NYG: 'Metlife_stadium_(Aerial_view).jpg',
  NYJ: 'Metlife_stadium_(Aerial_view).jpg',
  PHI: 'Lincoln_Financial_Field_(Aerial_view).jpg',
  PIT: 'Acrisure_Stadium_2024.jpg',
  SEA: '2026_FIFA_World_Cup_-_Belgium_v._Egypt_in_Seattle_-_04.jpg',
  SF: "Levi's_Stadium_in_February_2016_prior_to_Super_Bowl_50_(24398261729).jpg",
  TB: 'Raymond_James_Stadium_Aerial_(2).jpg',
  TEN: 'Aerial_view_of_Nissan_Stadium_(Tennessee_Titans).jpg',
  WAS: 'Commanders_vs_Giants_(53345178211).jpg',
};

const ALLOWED_WIDTHS = new Set([640, 1000]);

module.exports = async function handler(req, res) {
  const team = String((req.query && req.query.team) || '').toUpperCase();
  const file = FILES[team];
  if (!file) {
    res.status(404).json({ error: 'unknown team' });
    return;
  }

  let width = parseInt((req.query && req.query.w) || '', 10);
  if (!ALLOWED_WIDTHS.has(width)) width = 1000;

  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'ClarkIndex/1.0 (NFL capstone; +https://github.com/eightsilverbricks/capstonefootball)',
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      res.status(502).json({ error: 'upstream error', status: upstream.status });
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    res.status(200).send(buf);
  } catch {
    res.status(502).json({ error: 'fetch failed' });
  }
};
