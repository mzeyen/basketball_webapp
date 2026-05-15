"use client";

import { useMemo, useState } from "react";

import type { TeamStandings } from "@/lib/team-standings";
import { getTeamGroupLabel } from "@/lib/teams";

type TeamStandingsWidgetProps = {
  standingsList: TeamStandings[];
};

function formatValue(value: number | string | null): string {
  return value === null ? "-" : String(value);
}

export function TeamStandingsWidget({ standingsList }: TeamStandingsWidgetProps) {
  const visibleStandings = useMemo(
    () => (standingsList.length > 0 ? standingsList : [{ configured: false, fetchedAt: null, rows: [], stale: false, team: null }]),
    [standingsList],
  );
  const [index, setIndex] = useState(0);
  const currentIndex = Math.min(index, visibleStandings.length - 1);
  const standings = visibleStandings[currentIndex];
  const fetchedAt = standings.fetchedAt ? new Date(standings.fetchedAt).toLocaleString("de-DE") : null;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < visibleStandings.length - 1;

  return (
    <section className="card stack">
      <div className="section-heading standings-heading">
        <div>
          <p className="eyebrow">Tabelle</p>
          <h2>{getTeamGroupLabel(standings.team)}</h2>
        </div>
        <div className="standings-controls">
          <span className="muted standings-position">
            {currentIndex + 1} / {visibleStandings.length}
          </span>
          <div className="standings-pagination">
            <button type="button" className="secondary-button" onClick={() => setIndex((value) => Math.max(value - 1, 0))} disabled={!canGoPrev}>
              Zurück
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIndex((value) => Math.min(value + 1, visibleStandings.length - 1))}
              disabled={!canGoNext}
            >
              Weiter
            </button>
          </div>
        </div>
      </div>

      {fetchedAt ? <p className="muted standings-updated">Stand: {fetchedAt}</p> : null}

      {!standings.configured ? (
        <p className="muted">Noch keine Liga-ID für dieses Team hinterlegt. Admins können die ID im Adminbereich speichern.</p>
      ) : standings.rows.length > 0 ? (
        <>
          {standings.stale ? <p className="form-error">REST-Quelle nicht erreichbar. Es werden gecachte Daten angezeigt.</p> : null}
          <div className="standings-table-wrap">
            <table className="standings-table">
              <thead>
                <tr>
                  <th>Pl.</th>
                  <th>Mannschaft</th>
                  <th>Sp.</th>
                  <th>S</th>
                  <th>N</th>
                  <th>Pkt.</th>
                  <th>Körbe</th>
                </tr>
              </thead>
              <tbody>
                {standings.rows.map((row) => (
                  <tr key={`${row.position}-${row.teamName}`}>
                    <td>{formatValue(row.position)}</td>
                    <td>{row.teamName}</td>
                    <td>{formatValue(row.played)}</td>
                    <td>{formatValue(row.wins)}</td>
                    <td>{formatValue(row.losses)}</td>
                    <td>{formatValue(row.points)}</td>
                    <td>{row.scoreText ?? `${formatValue(row.scoreFor)}:${formatValue(row.scoreAgainst)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="muted">
          {standings.error ? "Die Tabelle konnte noch nicht geladen werden." : "Die REST-Quelle hat keine Tabellenzeilen geliefert."}
        </p>
      )}
    </section>
  );
}
