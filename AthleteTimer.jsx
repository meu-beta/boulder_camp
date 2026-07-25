// Client-side ranking calculation, mirroring the `ranking` SQL view.
// Standard bouldering rule: most tops first, tie-break by fewest
// attempts-to-top, then most zones, then fewest attempts-to-zone.
export function computeRanking(athletes, boulders, scores) {
  const boulderIds = boulders.map((b) => b.id).sort((a, b) => a - b);

  const rows = athletes.map((athlete) => {
    const byBoulder = {};
    for (const b of boulderIds) byBoulder[b] = null;

    let tops = 0;
    let zones = 0;
    let topAttempts = 0;
    let zoneAttempts = 0;
    let totalAttempts = 0;

    for (const s of scores.filter((s) => s.athlete_id === athlete.id)) {
      byBoulder[s.boulder_id] = s;
      if (s.top) {
        tops += 1;
        topAttempts += s.top_attempts || 0;
      }
      if (s.zone) {
        zones += 1;
        zoneAttempts += s.zone_attempts || 0;
      }
      totalAttempts += Math.max(s.top_attempts || 0, s.zone_attempts || 0);
    }

    return {
      athlete,
      boulderIds,
      byBoulder,
      tops,
      zones,
      topAttempts,
      zoneAttempts,
      totalAttempts,
    };
  });

  rows.sort((a, b) => {
    if (b.tops !== a.tops) return b.tops - a.tops;
    const aTA = a.tops === 0 ? Infinity : a.topAttempts;
    const bTA = b.tops === 0 ? Infinity : b.topAttempts;
    if (aTA !== bTA) return aTA - bTA;
    if (b.zones !== a.zones) return b.zones - a.zones;
    const aZA = a.zones === 0 ? Infinity : a.zoneAttempts;
    const bZA = b.zones === 0 ? Infinity : b.zoneAttempts;
    return aZA - bZA;
  });

  let rank = 0;
  let prevKey = null;
  return rows.map((row, idx) => {
    const key = `${row.tops}-${row.topAttempts}-${row.zones}-${row.zoneAttempts}`;
    if (key !== prevKey) rank = idx + 1;
    prevKey = key;
    return { ...row, rank };
  });
}
