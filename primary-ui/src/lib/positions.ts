// What each position does, in two plain sentences (§7: fixed text per position),
// and where it stands on the field diagram (x, y in % of the field).

export const POSITION_TEXT: Record<string, string> = {
  QB: 'The quarterback runs the offense and touches the ball on almost every play. He throws, hands off, and reads the defense before the snap.',
  RB: 'The running back carries the ball on running plays. He also catches short passes and helps block the quarterback.',
  FB: 'The fullback is a blocking back who clears the way for the running back. He occasionally carries or catches the ball.',
  WR: 'Wide receivers line up near the sideline and run routes to catch passes. The best ones win one-on-one against cornerbacks.',
  TE: 'The tight end lines up next to the offensive line. He blocks like a lineman and catches passes like a receiver.',
  LT: "The left tackle protects the quarterback's blind side. It's one of the most valuable spots on the line.",
  LG: 'The left guard blocks next to the center. Guards open holes for runs and stop rushers up the middle.',
  C: 'The center snaps the ball to the quarterback. He also calls out blocking assignments for the line.',
  RG: 'The right guard blocks next to the center. Guards open holes for runs and stop rushers up the middle.',
  RT: 'The right tackle blocks on the right edge. He faces some of the best pass rushers in the league.',
  LDE: 'The defensive end rushes the quarterback from the edge. He also has to set the edge against runs to his side.',
  RDE: 'The defensive end rushes the quarterback from the edge. He also has to set the edge against runs to his side.',
  DE: 'The defensive end rushes the quarterback from the edge. He also has to set the edge against runs to his side.',
  LDT: 'The defensive tackle plays in the middle of the line. He clogs running lanes and pushes the pocket.',
  RDT: 'The defensive tackle plays in the middle of the line. He clogs running lanes and pushes the pocket.',
  DT: 'The defensive tackle plays in the middle of the line. He clogs running lanes and pushes the pocket.',
  NT: 'The nose tackle lines up right over the center. He takes on two blockers so the linebackers can make plays.',
  WLB: 'The weak-side linebacker plays away from the tight end. He chases runs sideline to sideline and covers backs.',
  SLB: 'The strong-side linebacker lines up over the tight end. He sets the edge on runs and often rushes the passer.',
  MLB: 'The middle linebacker is the quarterback of the defense. He calls the plays and makes a lot of tackles.',
  LILB: 'The inside linebacker plays behind the line in the middle. He fills running lanes and drops into coverage.',
  RILB: 'The inside linebacker plays behind the line in the middle. He fills running lanes and drops into coverage.',
  OLB: 'The outside linebacker plays on the edge. In many defenses he is the main pass rusher.',
  LCB: 'The cornerback covers wide receivers. He has to stay with the fastest players on the field.',
  RCB: 'The cornerback covers wide receivers. He has to stay with the fastest players on the field.',
  CB: 'The cornerback covers wide receivers. He has to stay with the fastest players on the field.',
  NB: 'The nickel back covers the slot receiver. Teams use him on passing downs as a fifth defensive back.',
  SS: 'The strong safety plays deep but comes up to help against the run. He often covers tight ends.',
  FS: 'The free safety is the last line of defense. He reads the quarterback and helps over the top on deep passes.',
};

export function explainPosition(pos: string): string {
  return POSITION_TEXT[pos] ?? 'A starter in the base lineup.';
}

const SPOTS: Record<string, [number, number][]> = {
  // Offense below the line of scrimmage (y = 50).
  LT: [[32, 56]], LG: [[41, 56]], C: [[50, 56]], RG: [[59, 56]], RT: [[68, 56]],
  TE: [[78, 57]], WR: [[7, 55], [93, 55], [19, 60]], QB: [[50, 68]], RB: [[50, 82]], FB: [[42, 76]],
  // Defense above it.
  LDE: [[33, 43]], RDE: [[67, 43]], DE: [[33, 43], [67, 43]], LDT: [[44, 43]], RDT: [[56, 43]], DT: [[44, 43], [56, 43]], NT: [[50, 43]],
  WLB: [[24, 38]], SLB: [[76, 38]], OLB: [[24, 38], [76, 38]], LILB: [[43, 32]], RILB: [[57, 32]], MLB: [[50, 32]], ILB: [[43, 32], [57, 32]],
  LCB: [[7, 40]], RCB: [[93, 40]], CB: [[7, 40], [93, 40]], NB: [[18, 34]], SS: [[38, 16]], FS: [[62, 16]], S: [[38, 16], [62, 16]],
};

/** Field coordinates for each starter, spreading repeats of a position. */
export function placeOnField<T extends { pos: string }>(players: T[]): (T & { x: number; y: number })[] {
  const used: Record<string, number> = {};
  return players.map((p, i) => {
    const spots = SPOTS[p.pos] ?? [];
    const n = used[p.pos] ?? 0;
    used[p.pos] = n + 1;
    const [x, y] = spots[n] ?? [10 + ((i * 9) % 80), spots.length ? spots[0][1] + 8 : 90];
    return { ...p, x, y };
  });
}
