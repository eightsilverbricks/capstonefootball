import { describe, it, expect } from 'vitest';
import {
  billingReason,
  billingScore,
  formatKickoff,
  getSlateWindow,
  groupBySlate,
  isContrarian,
  isTossUp,
  kickoffSortKey,
  parseKickoffHour,
  selectLeadGame,
} from './slate';
import { ApiPrediction } from '@/types/prediction';

// Minimal game factory — only the fields the slate helpers read.
function game(partial: Partial<ApiPrediction> & { game_id: string }): ApiPrediction {
  return {
    season: 2024,
    week: 1,
    week_label: 'Week 1',
    game_date: '2024-09-08',
    weekday: 'Sunday',
    gametime: '13:00',
    game_type: 'REG',
    home_team: 'HOME',
    away_team: 'AWAY',
    predicted_winner: 'HOME',
    home_win_prob: 0.6,
    away_win_prob: 0.4,
    confidence_label: 'Medium',
    confidence_score: 20,
    ...partial,
  } as ApiPrediction;
}

/** Market context whose implied favorite is `favorite`. */
function market(favorite: 'HOME' | 'AWAY') {
  return {
    market_used: true,
    market_favorite: favorite,
    spread_line: -3,
    home_moneyline: favorite === 'HOME' ? -200 : 170,
    away_moneyline: favorite === 'AWAY' ? -200 : 170,
    interpretation: '',
  };
}

describe('parseKickoffHour', () => {
  it('reads the hour from a well-formed time', () => {
    expect(parseKickoffHour('13:00')).toBe(13);
    expect(parseKickoffHour('09:30')).toBe(9);
  });

  it('returns null for missing or malformed input', () => {
    expect(parseKickoffHour(undefined)).toBeNull();
    expect(parseKickoffHour('')).toBeNull();
    expect(parseKickoffHour('afternoon')).toBeNull();
    expect(parseKickoffHour('25:00')).toBeNull();
    expect(parseKickoffHour('13:99')).toBeNull();
  });
});

describe('formatKickoff', () => {
  it('renders Eastern wall-clock times in 12-hour form', () => {
    expect(formatKickoff('13:00')).toBe('1:00 PM ET');
    expect(formatKickoff('20:15')).toBe('8:15 PM ET');
    expect(formatKickoff('09:30')).toBe('9:30 AM ET');
  });

  it('renders noon as 12 rather than 0', () => {
    expect(formatKickoff('12:00')).toBe('12:00 PM ET');
  });

  it('returns an empty string when the time is unreadable', () => {
    expect(formatKickoff(undefined)).toBe('');
    expect(formatKickoff('nope')).toBe('');
  });
});

describe('getSlateWindow', () => {
  it('splits the Sunday slate by kickoff hour', () => {
    expect(getSlateWindow(game({ game_id: 'a', gametime: '09:30' })).id).toBe('international');
    expect(getSlateWindow(game({ game_id: 'b', gametime: '13:00' })).id).toBe('sundayEarly');
    expect(getSlateWindow(game({ game_id: 'c', gametime: '16:25' })).id).toBe('sundayAfternoon');
    expect(getSlateWindow(game({ game_id: 'd', gametime: '20:20' })).id).toBe('sundayNight');
  });

  it('marks the standalone primetime windows', () => {
    const tnf = game({ game_id: 'e', weekday: 'Thursday', gametime: '20:15', game_date: '2024-09-12' });
    const mnf = game({ game_id: 'f', weekday: 'Monday', gametime: '20:15', game_date: '2024-09-09' });
    expect(getSlateWindow(tnf)).toMatchObject({ id: 'thursdayNight', primetime: true });
    expect(getSlateWindow(mnf)).toMatchObject({ id: 'mondayNight', primetime: true });
    expect(getSlateWindow(game({ game_id: 'g' })).primetime).toBe(false);
  });

  it('names holiday slates instead of calling them weekday afternoons', () => {
    const thanksgiving = game({
      game_id: 'h', weekday: 'Thursday', gametime: '12:30', game_date: '2024-11-28',
    });
    const christmas = game({
      game_id: 'i', weekday: 'Wednesday', gametime: '13:00', game_date: '2024-12-25',
    });
    expect(getSlateWindow(thanksgiving).label).toBe('Thanksgiving Day');
    expect(getSlateWindow(christmas).label).toBe('Christmas Day');
  });

  it('keeps a holiday game in its primetime window when it kicks at night', () => {
    const blackFridayNight = game({
      game_id: 'j', weekday: 'Thursday', gametime: '20:20', game_date: '2024-11-28',
    });
    expect(getSlateWindow(blackFridayNight).id).toBe('thursdayNight');
  });

  it('falls back to a labelled bucket rather than dropping unreadable games', () => {
    expect(getSlateWindow(game({ game_id: 'k', gametime: undefined })).id).toBe('unscheduled');
    expect(getSlateWindow(game({ game_id: 'l', weekday: '' })).id).toBe('unscheduled');
    expect(getSlateWindow(game({ game_id: 'm', weekday: 'Funday' })).id).toBe('unscheduled');
  });

  it('reads weekdays case-insensitively', () => {
    expect(getSlateWindow(game({ game_id: 'n', weekday: 'SUNDAY' })).id).toBe('sundayEarly');
  });
});

describe('kickoffSortKey', () => {
  it('orders chronologically as plain strings', () => {
    const early = kickoffSortKey(game({ game_id: 'a', game_date: '2024-09-08', gametime: '13:00' }));
    const late = kickoffSortKey(game({ game_id: 'b', game_date: '2024-09-08', gametime: '16:25' }));
    const nextDay = kickoffSortKey(game({ game_id: 'c', game_date: '2024-09-09', gametime: '09:00' }));
    expect(early < late).toBe(true);
    expect(late < nextDay).toBe(true);
  });

  it('sorts unscheduled games last', () => {
    const scheduled = kickoffSortKey(game({ game_id: 'a' }));
    const unscheduled = kickoffSortKey(game({ game_id: 'b', game_date: undefined, gametime: undefined }));
    expect(scheduled < unscheduled).toBe(true);
  });
});

describe('isContrarian', () => {
  it('is true only when the market favors the other side', () => {
    expect(isContrarian(game({ game_id: 'a', market_context: market('AWAY') }))).toBe(true);
    expect(isContrarian(game({ game_id: 'b', market_context: market('HOME') }))).toBe(false);
  });

  it('is false when there is no market data to disagree with', () => {
    expect(isContrarian(game({ game_id: 'c' }))).toBe(false);
  });
});

describe('isTossUp', () => {
  it('flags games the model sees as near coin flips', () => {
    expect(isTossUp(game({ game_id: 'a', home_win_prob: 0.52, away_win_prob: 0.48 }))).toBe(true);
    expect(isTossUp(game({ game_id: 'b', home_win_prob: 0.78, away_win_prob: 0.22 }))).toBe(false);
  });
});

describe('billingScore', () => {
  it('ranks the playoffs above any regular-season window', () => {
    const superBowl = game({ game_id: 'a', game_type: 'SB' });
    const sundayNight = game({ game_id: 'b', gametime: '20:20' });
    expect(billingScore(superBowl)).toBeGreaterThan(billingScore(sundayNight));
  });

  it('rewards disagreeing with the market', () => {
    const plain = game({ game_id: 'a' });
    const contrarian = game({ game_id: 'b', market_context: market('AWAY') });
    expect(billingScore(contrarian)).toBeGreaterThan(billingScore(plain));
  });

  it('gives an ordinary early-window blowout no billing at all', () => {
    expect(billingScore(game({ game_id: 'a', home_win_prob: 0.85, away_win_prob: 0.15 }))).toBe(0);
  });
});

describe('billingReason', () => {
  it('names the playoff round first', () => {
    expect(billingReason(game({ game_id: 'a', game_type: 'SB' }))).toBe('The Super Bowl');
    expect(billingReason(game({ game_id: 'b', game_type: 'WC' }))).toBe('Wild Card Weekend');
  });

  it('explains a contrarian or toss-up lead', () => {
    expect(billingReason(game({ game_id: 'c', market_context: market('AWAY') })))
      .toBe('Clark is picking against the market');
    expect(billingReason(game({ game_id: 'd', home_win_prob: 0.51, away_win_prob: 0.49 })))
      .toBe('The closest call on the board');
  });

  it('returns null when there is no headline reason', () => {
    expect(billingReason(game({ game_id: 'e' }))).toBeNull();
  });
});

describe('selectLeadGame', () => {
  it('returns null for an empty slate', () => {
    expect(selectLeadGame([])).toBeNull();
  });

  it('picks the highest-billed game', () => {
    const ordinary = game({ game_id: 'a' });
    const primetime = game({ game_id: 'b', gametime: '20:20' });
    expect(selectLeadGame([ordinary, primetime])?.game_id).toBe('b');
  });

  it('is stable — the same slate always leads with the same game', () => {
    const a = game({ game_id: 'a' });
    const b = game({ game_id: 'b' });
    const c = game({ game_id: 'c' });
    expect(selectLeadGame([a, b, c])?.game_id).toBe(selectLeadGame([c, b, a])?.game_id);
  });
});

describe('groupBySlate', () => {
  const thursday = game({ game_id: 't', weekday: 'Thursday', gametime: '20:15', game_date: '2024-09-05' });
  const early = game({ game_id: 'e', weekday: 'Sunday', gametime: '13:00', game_date: '2024-09-08' });
  const earlyTwo = game({ game_id: 'e2', weekday: 'Sunday', gametime: '13:00', game_date: '2024-09-08' });
  const late = game({ game_id: 'l', weekday: 'Sunday', gametime: '16:25', game_date: '2024-09-08' });
  const monday = game({ game_id: 'm', weekday: 'Monday', gametime: '20:15', game_date: '2024-09-09' });

  it('orders windows by when they are actually played', () => {
    const groups = groupBySlate([monday, late, thursday, early]);
    expect(groups.map((g) => g.window.id)).toEqual([
      'thursdayNight', 'sundayEarly', 'sundayAfternoon', 'mondayNight',
    ]);
  });

  it('keeps every game exactly once', () => {
    const all = [thursday, early, earlyTwo, late, monday];
    const grouped = groupBySlate(all).flatMap((g) => g.games.map((x) => x.game_id));
    expect(grouped).toHaveLength(all.length);
    expect(new Set(grouped).size).toBe(all.length);
  });

  it('shows a shared kickoff time only when the whole window starts together', () => {
    const [group] = groupBySlate([early, earlyTwo]);
    expect(group.kickoff).toBe('1:00 PM ET');

    const mixed = groupBySlate([
      game({ game_id: 'x', weekday: 'Sunday', gametime: '16:05' }),
      game({ game_id: 'y', weekday: 'Sunday', gametime: '16:25' }),
    ]);
    expect(mixed[0].kickoff).toBe('');
  });

  it('returns nothing for an empty slate', () => {
    expect(groupBySlate([])).toEqual([]);
  });
});
