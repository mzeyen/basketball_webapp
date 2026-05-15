import type { TeamStandings } from "@/lib/team-standings";
import { getTeamGroupLabel } from "@/lib/teams";

type TeamStandingsWidgetProps = {
  standings: TeamStandings;
};

function formatValue(value: number | string | null): string {
  return value === null ? "-" : String(value);
}

export function TeamStandingsWidget({ standings }: TeamStandingsWidgetProps) {
  const fetchedAt = standings.fetchedAt ? new Date(standings.fetchedAt).toLocaleString("de-DE") : null;

  return (
    <section className="card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tabelle</p>
          <h2>{getTeamGroupLabel(standings.team)}</h2>
        </div>
        {fetchedAt ? <p className="muted standings-updated">Stand: {fetchedAt}</p> : null}
      </div>

      {!standings.configured ? (
        <p className="muted">
          Noch keine Liga-ID fÃ¼r dieses Team hinterlegt. Admins kÃ¶nnen die ID im Adminbereich speichern.
        </p>
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
                  <th>U</th>
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
                    <td>{formatValue(row.draws)}</td>
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
