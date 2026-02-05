// NFL Teams and Game Data

export interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  record: string;
  wins: number;
  losses: number;
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  number: number;
  team: string;
  image: string;
  stats: {
    passingYards?: number;
    rushingYards?: number;
    receivingYards?: number;
    touchdowns?: number;
    interceptions?: number;
    completionPct?: number;
    tackles?: number;
    sacks?: number;
    qbRating?: number;
  };
  recentForm: 'hot' | 'cold' | 'neutral';
  aiInsight: string;
}

export interface PredictionKey {
  id: number;
  name: string;
  description: string;
  weight: number;
  homeTeamScore: number;
  awayTeamScore: number;
  icon: string;
}

export interface Game {
  id: string;
  week: number;
  homeTeam: Team;
  awayTeam: Team;
  homeWinProbability: number;
  awayWinProbability: number;
  spread: number;
  overUnder: number;
  gameTime: string;
  stadium: string;
  stadiumImage: string;
  weather: string;
  temperature: number;
  keyPlayers: {
    home: Player[];
    away: Player[];
  };
  predictionKeys: PredictionKey[];
  aiNarrative: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  timestamp: string;
  likes: number;
  prediction: 'home' | 'away';
}

export interface UserPrediction {
  gameId: string;
  pick: 'home' | 'away';
  confidence: number;
}

// Bobblehead images
export const bobbleheadImages = [
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101543283_56e35ef3.jpg',
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101544556_abaebc34.png',
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101546430_0cc8ce2d.png',
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101545435_9f6ecfdf.jpg',
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101546084_e58f255a.jpg',
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101550203_0f843272.png',
];

export const stadiumImages = [
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101601348_8c98a44c.png',
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101595555_d954a8aa.jpg',
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101601078_9225bb23.png',
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101601286_a759a96e.jpg',
];

export const heroImage = 'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101527992_8e96bca5.jpg';
export const fieldImage = 'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101578148_f754b433.png';

// Sample Teams
export const teams: Team[] = [
  { id: 'phi', name: 'Eagles', city: 'Philadelphia', abbreviation: 'PHI', record: '12-2', wins: 12, losses: 2, primaryColor: '#004C54', secondaryColor: '#A5ACAF' },
  { id: 'dal', name: 'Cowboys', city: 'Dallas', abbreviation: 'DAL', record: '6-8', wins: 6, losses: 8, primaryColor: '#003594', secondaryColor: '#869397' },
  { id: 'kc', name: 'Chiefs', city: 'Kansas City', abbreviation: 'KC', record: '13-1', wins: 13, losses: 1, primaryColor: '#E31837', secondaryColor: '#FFB81C' },
  { id: 'buf', name: 'Bills', city: 'Buffalo', abbreviation: 'BUF', record: '11-3', wins: 11, losses: 3, primaryColor: '#00338D', secondaryColor: '#C60C30' },
  { id: 'det', name: 'Lions', city: 'Detroit', abbreviation: 'DET', record: '12-2', wins: 12, losses: 2, primaryColor: '#0076B6', secondaryColor: '#B0B7BC' },
  { id: 'gb', name: 'Packers', city: 'Green Bay', abbreviation: 'GB', record: '10-4', wins: 10, losses: 4, primaryColor: '#203731', secondaryColor: '#FFB612' },
  { id: 'sf', name: '49ers', city: 'San Francisco', abbreviation: 'SF', record: '6-8', wins: 6, losses: 8, primaryColor: '#AA0000', secondaryColor: '#B3995D' },
  { id: 'bal', name: 'Ravens', city: 'Baltimore', abbreviation: 'BAL', record: '9-5', wins: 9, losses: 5, primaryColor: '#241773', secondaryColor: '#000000' },
  { id: 'min', name: 'Vikings', city: 'Minnesota', abbreviation: 'MIN', record: '12-2', wins: 12, losses: 2, primaryColor: '#4F2683', secondaryColor: '#FFC62F' },
  { id: 'lar', name: 'Rams', city: 'Los Angeles', abbreviation: 'LAR', record: '8-6', wins: 8, losses: 6, primaryColor: '#003594', secondaryColor: '#FFA300' },
  { id: 'pit', name: 'Steelers', city: 'Pittsburgh', abbreviation: 'PIT', record: '10-4', wins: 10, losses: 4, primaryColor: '#FFB612', secondaryColor: '#101820' },
  { id: 'cin', name: 'Bengals', city: 'Cincinnati', abbreviation: 'CIN', record: '6-8', wins: 6, losses: 8, primaryColor: '#FB4F14', secondaryColor: '#000000' },
  { id: 'mia', name: 'Dolphins', city: 'Miami', abbreviation: 'MIA', record: '6-8', wins: 6, losses: 8, primaryColor: '#008E97', secondaryColor: '#FC4C02' },
  { id: 'nyj', name: 'Jets', city: 'New York', abbreviation: 'NYJ', record: '4-10', wins: 4, losses: 10, primaryColor: '#125740', secondaryColor: '#000000' },
  { id: 'lac', name: 'Chargers', city: 'Los Angeles', abbreviation: 'LAC', record: '9-5', wins: 9, losses: 5, primaryColor: '#0080C6', secondaryColor: '#FFC20E' },
  { id: 'den', name: 'Broncos', city: 'Denver', abbreviation: 'DEN', record: '9-5', wins: 9, losses: 5, primaryColor: '#FB4F14', secondaryColor: '#002244' },
];

// Sample Players
export const players: Player[] = [
  {
    id: 'jalen-hurts',
    name: 'Jalen Hurts',
    position: 'QB',
    number: 1,
    team: 'phi',
    image: bobbleheadImages[0],
    stats: { passingYards: 2903, touchdowns: 16, interceptions: 5, completionPct: 68.7, qbRating: 103.2 },
    recentForm: 'hot',
    aiInsight: 'Hurts has been dominant at home this season with a 7-0 record. His dual-threat ability creates mismatches, averaging 45 rushing yards per game. Watch for RPO plays in the red zone.'
  },
  {
    id: 'dak-prescott',
    name: 'Dak Prescott',
    position: 'QB',
    number: 4,
    team: 'dal',
    image: bobbleheadImages[1],
    stats: { passingYards: 1978, touchdowns: 11, interceptions: 8, completionPct: 63.2, qbRating: 84.7 },
    recentForm: 'cold',
    aiInsight: 'Prescott has struggled with 4 INTs in his last 3 games. Pocket pressure has been his kryptonite - he\'s been sacked 38 times this season. Injury concerns linger.'
  },
  {
    id: 'patrick-mahomes',
    name: 'Patrick Mahomes',
    position: 'QB',
    number: 15,
    team: 'kc',
    image: bobbleheadImages[2],
    stats: { passingYards: 3561, touchdowns: 24, interceptions: 11, completionPct: 67.1, qbRating: 98.4 },
    recentForm: 'hot',
    aiInsight: 'Mahomes continues to be the league\'s most dangerous QB in crunch time. His 4th quarter passer rating of 118.3 leads the NFL. The Chiefs are 10-0 in one-score games.'
  },
  {
    id: 'josh-allen',
    name: 'Josh Allen',
    position: 'QB',
    number: 17,
    team: 'buf',
    image: bobbleheadImages[3],
    stats: { passingYards: 3549, touchdowns: 28, interceptions: 6, completionPct: 63.8, qbRating: 101.2 },
    recentForm: 'hot',
    aiInsight: 'Allen is having an MVP-caliber season with the best TD-INT ratio of his career. His chemistry with Amari Cooper has added a new dimension to Buffalo\'s offense.'
  },
  {
    id: 'jared-goff',
    name: 'Jared Goff',
    position: 'QB',
    number: 16,
    team: 'det',
    image: bobbleheadImages[4],
    stats: { passingYards: 4042, touchdowns: 32, interceptions: 10, completionPct: 72.4, qbRating: 112.8 },
    recentForm: 'hot',
    aiInsight: 'Goff leads the league in completion percentage and has transformed into an elite QB. The Lions\' offensive line gives him time, and he\'s making defenses pay.'
  },
  {
    id: 'jordan-love',
    name: 'Jordan Love',
    position: 'QB',
    number: 10,
    team: 'gb',
    image: bobbleheadImages[5],
    stats: { passingYards: 3389, touchdowns: 25, interceptions: 11, completionPct: 64.2, qbRating: 96.8 },
    recentForm: 'neutral',
    aiInsight: 'Love has shown flashes of brilliance but inconsistency remains. His deep ball accuracy (47.2%) is elite, but decision-making under pressure needs work.'
  },
];

// Default Prediction Keys (13 Keys model)
export const defaultPredictionKeys: PredictionKey[] = [
  { id: 1, name: 'QB Performance', description: 'Quarterback efficiency rating and recent form', weight: 15, homeTeamScore: 0, awayTeamScore: 0, icon: 'crown' },
  { id: 2, name: 'Turnover Differential', description: 'Net turnovers forced vs committed', weight: 12, homeTeamScore: 0, awayTeamScore: 0, icon: 'refresh' },
  { id: 3, name: 'Red Zone Efficiency', description: 'Touchdown percentage in red zone', weight: 10, homeTeamScore: 0, awayTeamScore: 0, icon: 'target' },
  { id: 4, name: 'Third Down Conversion', description: 'Ability to sustain drives', weight: 8, homeTeamScore: 0, awayTeamScore: 0, icon: 'trending' },
  { id: 5, name: 'Rushing Attack', description: 'Ground game effectiveness', weight: 8, homeTeamScore: 0, awayTeamScore: 0, icon: 'run' },
  { id: 6, name: 'Pass Defense', description: 'Opponent passing yards allowed', weight: 9, homeTeamScore: 0, awayTeamScore: 0, icon: 'shield' },
  { id: 7, name: 'Home Field Advantage', description: 'Historical home performance', weight: 7, homeTeamScore: 0, awayTeamScore: 0, icon: 'home' },
  { id: 8, name: 'Injury Report', description: 'Key player availability', weight: 8, homeTeamScore: 0, awayTeamScore: 0, icon: 'medical' },
  { id: 9, name: 'Recent Form', description: 'Last 3 games performance', weight: 9, homeTeamScore: 0, awayTeamScore: 0, icon: 'chart' },
  { id: 10, name: 'Special Teams', description: 'Kicking and return game', weight: 5, homeTeamScore: 0, awayTeamScore: 0, icon: 'star' },
  { id: 11, name: 'Time of Possession', description: 'Ball control and clock management', weight: 4, homeTeamScore: 0, awayTeamScore: 0, icon: 'clock' },
  { id: 12, name: 'Coaching', description: 'Play-calling and adjustments', weight: 3, homeTeamScore: 0, awayTeamScore: 0, icon: 'clipboard' },
  { id: 13, name: 'Historical Matchup', description: 'Head-to-head record', weight: 2, homeTeamScore: 0, awayTeamScore: 0, icon: 'history' },
];

// Generate sample games
export const generateGames = (): Game[] => {
  const games: Game[] = [
    {
      id: 'game-1',
      week: 16,
      homeTeam: teams[0], // Eagles
      awayTeam: teams[1], // Cowboys
      homeWinProbability: 72,
      awayWinProbability: 28,
      spread: -6.5,
      overUnder: 47.5,
      gameTime: 'Sun 4:25 PM ET',
      stadium: 'Lincoln Financial Field',
      stadiumImage: stadiumImages[0],
      weather: 'Partly Cloudy',
      temperature: 42,
      keyPlayers: {
        home: [players[0]], // Hurts
        away: [players[1]], // Prescott
      },
      predictionKeys: defaultPredictionKeys.map(key => ({
        ...key,
        homeTeamScore: Math.floor(Math.random() * 10) + 1,
        awayTeamScore: Math.floor(Math.random() * 10) + 1,
      })),
      aiNarrative: `The Eagles are poised to dominate this NFC East showdown. Jalen Hurts has been exceptional at home (7-0), while Dak Prescott's recent struggles (4 INTs in 3 games) spell trouble for Dallas. Philadelphia's league-best rushing attack should control the clock, and their pass rush will pressure an already shaky Prescott. The Cowboys' playoff hopes are fading fast, and this game could be the nail in the coffin. Expect Saquon Barkley to have a monster game against Dallas's 28th-ranked run defense.`,
      comments: [
        { id: '1', user: 'EaglesFan2024', avatar: '', text: 'Eagles by 14! Saquon is going to feast!', timestamp: '2h ago', likes: 24, prediction: 'home' },
        { id: '2', user: 'CowboysNation', avatar: '', text: 'Never count out America\'s Team. Dak bounces back here.', timestamp: '1h ago', likes: 8, prediction: 'away' },
      ],
    },
    {
      id: 'game-2',
      week: 16,
      homeTeam: teams[2], // Chiefs
      awayTeam: teams[3], // Bills
      homeWinProbability: 54,
      awayWinProbability: 46,
      spread: -1.5,
      overUnder: 51.5,
      gameTime: 'Sun 8:20 PM ET',
      stadium: 'Arrowhead Stadium',
      stadiumImage: stadiumImages[1],
      weather: 'Snow',
      temperature: 28,
      keyPlayers: {
        home: [players[2]], // Mahomes
        away: [players[3]], // Allen
      },
      predictionKeys: defaultPredictionKeys.map(key => ({
        ...key,
        homeTeamScore: Math.floor(Math.random() * 10) + 1,
        awayTeamScore: Math.floor(Math.random() * 10) + 1,
      })),
      aiNarrative: `This is the game of the year. Mahomes vs Allen in a potential AFC Championship preview. The Chiefs' home-field advantage is legendary (10-0 in one-score games), but Josh Allen is playing the best football of his career. Snow conditions favor the running game, which benefits Buffalo. However, Mahomes' magic in the 4th quarter (118.3 passer rating) gives KC the edge. This one goes down to the wire.`,
      comments: [
        { id: '1', user: 'ChiefsKingdom', avatar: '', text: 'Arrowhead in the snow? Mahomes owns this.', timestamp: '3h ago', likes: 45, prediction: 'home' },
        { id: '2', user: 'BillsMafia', avatar: '', text: 'Josh Allen MVP season continues. Bills by 7!', timestamp: '2h ago', likes: 38, prediction: 'away' },
      ],
    },
    {
      id: 'game-3',
      week: 16,
      homeTeam: teams[4], // Lions
      awayTeam: teams[5], // Packers
      homeWinProbability: 68,
      awayWinProbability: 32,
      spread: -5.5,
      overUnder: 52.5,
      gameTime: 'Sun 1:00 PM ET',
      stadium: 'Ford Field',
      stadiumImage: stadiumImages[2],
      weather: 'Dome',
      temperature: 72,
      keyPlayers: {
        home: [players[4]], // Goff
        away: [players[5]], // Love
      },
      predictionKeys: defaultPredictionKeys.map(key => ({
        ...key,
        homeTeamScore: Math.floor(Math.random() * 10) + 1,
        awayTeamScore: Math.floor(Math.random() * 10) + 1,
      })),
      aiNarrative: `Detroit is the hottest team in football and looking to clinch the NFC North. Jared Goff's transformation into an elite QB has been remarkable - he leads the league in completion percentage (72.4%). The Lions' offense is averaging 33.2 points per game, and their defense has improved dramatically. Jordan Love has shown flashes but inconsistency hurts Green Bay. Expect a high-scoring affair with Detroit pulling away late.`,
      comments: [
        { id: '1', user: 'DetroitVsEverybody', avatar: '', text: 'Lions are LEGIT this year. NFC North champs incoming!', timestamp: '4h ago', likes: 67, prediction: 'home' },
      ],
    },
    {
      id: 'game-4',
      week: 16,
      homeTeam: teams[8], // Vikings
      awayTeam: teams[6], // 49ers
      homeWinProbability: 71,
      awayWinProbability: 29,
      spread: -7.0,
      overUnder: 45.5,
      gameTime: 'Mon 8:15 PM ET',
      stadium: 'U.S. Bank Stadium',
      stadiumImage: stadiumImages[3],
      weather: 'Dome',
      temperature: 70,
      keyPlayers: {
        home: [players[0]],
        away: [players[1]],
      },
      predictionKeys: defaultPredictionKeys.map(key => ({
        ...key,
        homeTeamScore: Math.floor(Math.random() * 10) + 1,
        awayTeamScore: Math.floor(Math.random() * 10) + 1,
      })),
      aiNarrative: `Minnesota has been one of the biggest surprises this season. Sam Darnold's career resurgence has been incredible, and the Vikings' defense is playing at an elite level. San Francisco's injury-plagued season continues, and they're struggling to find consistency. The 49ers' dynasty window may be closing. Vikings should handle business at home in prime time.`,
      comments: [],
    },
    {
      id: 'game-5',
      week: 16,
      homeTeam: teams[7], // Ravens
      awayTeam: teams[10], // Steelers
      homeWinProbability: 62,
      awayWinProbability: 38,
      spread: -4.0,
      overUnder: 44.5,
      gameTime: 'Sat 4:30 PM ET',
      stadium: 'M&T Bank Stadium',
      stadiumImage: stadiumImages[0],
      weather: 'Clear',
      temperature: 38,
      keyPlayers: {
        home: [players[2]],
        away: [players[3]],
      },
      predictionKeys: defaultPredictionKeys.map(key => ({
        ...key,
        homeTeamScore: Math.floor(Math.random() * 10) + 1,
        awayTeamScore: Math.floor(Math.random() * 10) + 1,
      })),
      aiNarrative: `AFC North rivalry game with playoff implications. Lamar Jackson is making another MVP push, and the Ravens' ground game is unstoppable. Pittsburgh's defense is solid but may not have the firepower to keep up. Russell Wilson has been serviceable but not spectacular. Baltimore's home-field advantage should be the difference in this physical matchup.`,
      comments: [],
    },
    {
      id: 'game-6',
      week: 16,
      homeTeam: teams[14], // Chargers
      awayTeam: teams[15], // Broncos
      homeWinProbability: 58,
      awayWinProbability: 42,
      spread: -3.0,
      overUnder: 42.5,
      gameTime: 'Thu 8:15 PM ET',
      stadium: 'SoFi Stadium',
      stadiumImage: stadiumImages[1],
      weather: 'Clear',
      temperature: 65,
      keyPlayers: {
        home: [players[4]],
        away: [players[5]],
      },
      predictionKeys: defaultPredictionKeys.map(key => ({
        ...key,
        homeTeamScore: Math.floor(Math.random() * 10) + 1,
        awayTeamScore: Math.floor(Math.random() * 10) + 1,
      })),
      aiNarrative: `AFC West showdown between two playoff hopefuls. Justin Herbert has been excellent under Jim Harbaugh's system, and the Chargers' defense is much improved. Bo Nix has exceeded expectations as a rookie, but Denver's offense can be inconsistent. This should be a defensive battle with the Chargers' home crowd providing the edge.`,
      comments: [],
    },
    {
      id: 'game-7',
      week: 16,
      homeTeam: teams[9], // Rams
      awayTeam: teams[11], // Bengals
      homeWinProbability: 52,
      awayWinProbability: 48,
      spread: -1.0,
      overUnder: 49.5,
      gameTime: 'Sun 4:05 PM ET',
      stadium: 'SoFi Stadium',
      stadiumImage: stadiumImages[2],
      weather: 'Clear',
      temperature: 68,
      keyPlayers: {
        home: [players[0]],
        away: [players[1]],
      },
      predictionKeys: defaultPredictionKeys.map(key => ({
        ...key,
        homeTeamScore: Math.floor(Math.random() * 10) + 1,
        awayTeamScore: Math.floor(Math.random() * 10) + 1,
      })),
      aiNarrative: `Super Bowl LVI rematch! Both teams have underperformed this season but are fighting for playoff positioning. Matthew Stafford has been solid, and Puka Nacua is a star. Joe Burrow is healthy and dangerous, but the Bengals' defense has been a liability. This could be a shootout with the home team barely edging it out.`,
      comments: [],
    },
    {
      id: 'game-8',
      week: 16,
      homeTeam: teams[12], // Dolphins
      awayTeam: teams[13], // Jets
      homeWinProbability: 65,
      awayWinProbability: 35,
      spread: -5.5,
      overUnder: 40.5,
      gameTime: 'Sun 1:00 PM ET',
      stadium: 'Hard Rock Stadium',
      stadiumImage: stadiumImages[3],
      weather: 'Sunny',
      temperature: 78,
      keyPlayers: {
        home: [players[2]],
        away: [players[3]],
      },
      predictionKeys: defaultPredictionKeys.map(key => ({
        ...key,
        homeTeamScore: Math.floor(Math.random() * 10) + 1,
        awayTeamScore: Math.floor(Math.random() * 10) + 1,
      })),
      aiNarrative: `AFC East rivalry with Miami looking to salvage their season. Tua Tagovailoa has been inconsistent, but the Dolphins' speed in the warm Miami weather is always dangerous. The Jets' season has been a disaster, and Aaron Rodgers looks washed. Miami should win comfortably, but don't expect style points.`,
      comments: [],
    },
  ];

  return games;
};

export const games = generateGames();

// Model accuracy data
export const modelAccuracy = {
  thisWeek: 11,
  thisWeekTotal: 16,
  season: 156,
  seasonTotal: 224,
  lastSeason: 178,
  lastSeasonTotal: 256,
  allTime: 892,
  allTimeTotal: 1200,
};

// Top factors for success
export const topFactors = [
  { rank: 1, name: 'Quarterback Play', importance: 15, description: 'Elite QB play is the strongest predictor of success' },
  { rank: 2, name: 'Turnover Margin', importance: 12, description: 'Teams that win the turnover battle win 78% of games' },
  { rank: 3, name: 'Red Zone TD%', importance: 10, description: 'Converting red zone trips to TDs is crucial' },
  { rank: 4, name: 'Pass Defense', importance: 9, description: 'Stopping the pass in today\'s NFL is paramount' },
  { rank: 5, name: 'Recent Form', importance: 9, description: 'Momentum and confidence matter' },
  { rank: 6, name: 'Third Down Rate', importance: 8, description: 'Sustaining drives keeps defenses on the field' },
  { rank: 7, name: 'Rushing Attack', importance: 8, description: 'Running the ball controls clock and opens play-action' },
  { rank: 8, name: 'Injury Report', importance: 8, description: 'Key player availability can swing games' },
  { rank: 9, name: 'Home Field', importance: 7, description: 'Home teams win 57% of games historically' },
  { rank: 10, name: 'Special Teams', importance: 5, description: 'Field position and hidden yards matter' },
];
