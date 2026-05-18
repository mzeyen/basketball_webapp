"use client";

import { useMemo, useState } from "react";

type CourtItemType = "ball" | "cone" | "defender" | "player";
type CourtPathType = "pass" | "run" | "shot";

type CourtItem = {
  id: string;
  label: string;
  type: CourtItemType;
  x: number;
  y: number;
};

type CourtPath = {
  id: string;
  type: CourtPathType;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

type ExerciseTemplate = {
  coachingPoints: string;
  courtItems: CourtItem[];
  courtPaths: CourtPath[];
  description: string;
  load: string;
  name: string;
  organization: string;
  tags: string;
  title: string;
};

type ActiveCourtDrag =
  | { id: string; kind: "item" }
  | {
      id: string;
      initialToX: number;
      initialToY: number;
      kind: "path-target";
      startX: number;
      startY: number;
    }
  | {
      id: string;
      initialFromX: number;
      initialFromY: number;
      initialToX: number;
      initialToY: number;
      kind: "path";
      startX: number;
      startY: number;
    };

const itemLabels: Record<CourtItemType, string> = {
  ball: "Ball",
  cone: "Huetchen",
  defender: "Defense",
  player: "Offense",
};

const itemSymbols: Record<CourtItemType, string> = {
  ball: "B",
  cone: "H",
  defender: "D",
  player: "O",
};

const pathLabels: Record<CourtPathType, string> = {
  pass: "Pass",
  run: "Laufweg",
  shot: "Wurf",
};

const exerciseTemplates: ExerciseTemplate[] = [
  {
    name: "Wurfserie",
    title: "Wurfserie nach Pass",
    tags: "wurf, passen, spacing",
    organization: "Drei Reihen an der Dreierlinie, ein Ball pro Reihe.",
    description: "Pass zum Fluegel, Catch-and-shoot, Rebound sichern und rotieren.",
    coachingPoints: "Fussarbeit vor dem Catch, tiefer Stand, Zielhand zeigen, Balance halten.",
    load: "3 Serien a 8 Wuerfe pro Position.",
    courtItems: [
      { id: "p1", type: "player", label: "1", x: 26, y: 70 },
      { id: "p2", type: "player", label: "2", x: 50, y: 76 },
      { id: "p3", type: "player", label: "3", x: 74, y: 70 },
      { id: "b1", type: "ball", label: "B", x: 50, y: 61 },
    ],
    courtPaths: [
      { id: "pass-1", type: "pass", fromX: 50, fromY: 76, toX: 26, toY: 70 },
      { id: "shot-1", type: "shot", fromX: 26, fromY: 70, toX: 50, toY: 93 },
      { id: "run-1", type: "run", fromX: 26, fromY: 70, toX: 50, toY: 61 },
    ],
  },
  {
    name: "Closeout",
    title: "Closeout mit 1-gegen-1",
    tags: "defense, closeout, 1gegen1",
    organization: "Angreifer auf dem Fluegel, Verteidiger startet in der Zone.",
    description: "Coach passt zum Fluegel. Verteidiger sprintet im Closeout, Angreifer attackiert nach Entscheidung.",
    coachingPoints: "Kurze letzte Schritte, Hand am Ball, Huefte tief, Drive-Richtung lenken.",
    load: "6 Wiederholungen pro Seite, dann Rollenwechsel.",
    courtItems: [
      { id: "p1", type: "player", label: "A", x: 74, y: 54 },
      { id: "d1", type: "defender", label: "D", x: 50, y: 37 },
      { id: "b1", type: "ball", label: "B", x: 64, y: 48 },
    ],
    courtPaths: [
      { id: "pass-1", type: "pass", fromX: 52, fromY: 30, toX: 74, toY: 54 },
      { id: "run-1", type: "run", fromX: 50, fromY: 37, toX: 70, toY: 52 },
      { id: "shot-1", type: "shot", fromX: 74, fromY: 54, toX: 50, toY: 7 },
    ],
  },
  {
    name: "Fastbreak",
    title: "3-gegen-2 Fastbreak",
    tags: "fastbreak, entscheidungen, transition",
    organization: "Drei Angreifer starten an der Grundlinie, zwei Verteidiger warten in der Rueckwaertsbewegung.",
    description: "Angriff spielt mit Tempo nach vorne und sucht den freien Abschluss gegen Unterzahl.",
    coachingPoints: "Breite Laufwege, Ball in die Mitte, fruehe Entscheidung, letzter Pass erst nach Verteidigerbindung.",
    load: "8 Angriffe, danach Verteidiger tauschen.",
    courtItems: [
      { id: "p1", type: "player", label: "1", x: 50, y: 78 },
      { id: "p2", type: "player", label: "2", x: 28, y: 72 },
      { id: "p3", type: "player", label: "3", x: 72, y: 72 },
      { id: "d1", type: "defender", label: "D1", x: 42, y: 28 },
      { id: "d2", type: "defender", label: "D2", x: 58, y: 28 },
      { id: "b1", type: "ball", label: "B", x: 50, y: 68 },
    ],
    courtPaths: [
      { id: "run-1", type: "run", fromX: 28, fromY: 72, toX: 22, toY: 28 },
      { id: "run-2", type: "run", fromX: 72, fromY: 72, toX: 78, toY: 28 },
      { id: "pass-1", type: "pass", fromX: 50, fromY: 68, toX: 72, toY: 42 },
      { id: "shot-1", type: "shot", fromX: 72, fromY: 42, toX: 50, toY: 7 },
    ],
  },
];

function clampCoordinate(value: number): number {
  return Math.max(4, Math.min(96, value));
}

function createCourtItem(type: CourtItemType, index: number): CourtItem {
  return {
    id: `${type}-${Date.now()}-${index}`,
    label: type === "player" ? String(index + 1) : itemSymbols[type],
    type,
    x: 50,
    y: 50,
  };
}

function createCourtPath(type: CourtPathType, index: number): CourtPath {
  return {
    id: `${type}-${Date.now()}-${index}`,
    type,
    fromX: type === "shot" ? 42 : 35,
    fromY: type === "shot" ? 64 : 70,
    toX: type === "shot" ? 50 : 65,
    toY: type === "shot" ? 93 : 46,
  };
}

function getCourtPosition(event: React.PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: clampCoordinate(((event.clientX - rect.left) / rect.width) * 100),
    y: clampCoordinate(((event.clientY - rect.top) / rect.height) * 100),
  };
}

function getCourtElementPosition(event: React.PointerEvent<Element>) {
  const courtElement = event.currentTarget.closest(".court-diagram");

  if (!courtElement) {
    return null;
  }

  const rect = courtElement.getBoundingClientRect();
  return {
    x: clampCoordinate(((event.clientX - rect.left) / rect.width) * 100),
    y: clampCoordinate(((event.clientY - rect.top) / rect.height) * 100),
  };
}

function getPathAngle(path: CourtPath): number {
  return Math.atan2(path.toY - path.fromY, path.toX - path.fromX) * (180 / Math.PI);
}

function getPathDirectionHandlePosition(path: CourtPath): { x: number; y: number } {
  const deltaX = path.toX - path.fromX;
  const deltaY = path.toY - path.fromY;
  const length = Math.hypot(deltaX, deltaY);

  if (length < 1) {
    return { x: path.toX, y: path.toY };
  }

  const fixedOffset = Math.min(4, length * 0.45);

  return {
    x: path.toX + (deltaX / length) * fixedOffset,
    y: path.toY + (deltaY / length) * fixedOffset,
  };
}

function rotateCourtPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: y,
    y: 100 - x,
  };
}

function unrotateCourtPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: 100 - y,
    y: x,
  };
}

export function ExerciseDesigner() {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [organization, setOrganization] = useState("");
  const [description, setDescription] = useState("");
  const [coachingPoints, setCoachingPoints] = useState("");
  const [load, setLoad] = useState("");
  const [activeDrag, setActiveDrag] = useState<ActiveCourtDrag | null>(null);
  const [courtItems, setCourtItems] = useState<CourtItem[]>([]);
  const [courtPaths, setCourtPaths] = useState<CourtPath[]>([]);
  const serializedCourt = useMemo(() => JSON.stringify({ items: courtItems, paths: courtPaths }), [courtItems, courtPaths]);

  function applyTemplate(name: string) {
    setSelectedTemplate(name);
    const template = exerciseTemplates.find((item) => item.name === name);

    if (!template) {
      return;
    }

    setTitle(template.title);
    setTags(template.tags);
    setOrganization(template.organization);
    setDescription(template.description);
    setCoachingPoints(template.coachingPoints);
    setLoad(template.load);
    setCourtItems(template.courtItems);
    setCourtPaths(template.courtPaths);
  }

  function addItem(type: CourtItemType) {
    setCourtItems((current) => [...current, createCourtItem(type, current.length)]);
  }

  function addPath(type: CourtPathType) {
    setCourtPaths((current) => [...current, createCourtPath(type, current.length)]);
  }

  function updateItem(id: string, values: Partial<CourtItem>) {
    setCourtItems((current) => current.map((item) => (item.id === id ? { ...item, ...values } : item)));
  }

  function updatePath(id: string, values: Partial<CourtPath>) {
    setCourtPaths((current) => current.map((path) => (path.id === id ? { ...path, ...values } : path)));
  }

  function moveItem(id: string, x: number, y: number) {
    updateItem(id, { x: clampCoordinate(x), y: clampCoordinate(y) });
  }

  function removeItem(id: string) {
    setCourtItems((current) => current.filter((item) => item.id !== id));
  }

  function removePath(id: string) {
    setCourtPaths((current) => current.filter((path) => path.id !== id));
  }

  function moveActiveCourtElement(event: React.PointerEvent<HTMLElement>) {
    if (!activeDrag) {
      return;
    }

    const rendered = getCourtPosition(event);
    const position = unrotateCourtPoint(rendered.x, rendered.y);

    if (activeDrag.kind === "item") {
      moveItem(activeDrag.id, position.x, position.y);
      return;
    }

    if (activeDrag.kind === "path-target") {
      updatePath(activeDrag.id, {
        toX: clampCoordinate(activeDrag.initialToX + position.x - activeDrag.startX),
        toY: clampCoordinate(activeDrag.initialToY + position.y - activeDrag.startY),
      });
      return;
    }

    const deltaX = position.x - activeDrag.startX;
    const deltaY = position.y - activeDrag.startY;
    updatePath(activeDrag.id, {
      fromX: clampCoordinate(activeDrag.initialFromX + deltaX),
      fromY: clampCoordinate(activeDrag.initialFromY + deltaY),
      toX: clampCoordinate(activeDrag.initialToX + deltaX),
      toY: clampCoordinate(activeDrag.initialToY + deltaY),
    });
  }

  return (
    <div className="exercise-editor">
      <input type="hidden" name="courtDiagram" value={serializedCourt} />
      <input type="hidden" name="templateName" value={selectedTemplate} />

      <label>
        Vorlage
        <select value={selectedTemplate} onChange={(event) => applyTemplate(event.currentTarget.value)}>
          <option value="">Ohne Vorlage starten</option>
          {exerciseTemplates.map((template) => (
            <option key={template.name} value={template.name}>
              {template.name}
            </option>
          ))}
        </select>
      </label>

      <div className="exercise-editor-grid">
        <div className="stack">
          <label>
            Titel
            <input name="title" minLength={3} required placeholder="z. B. Closeout mit Wurfabschluss" value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
          </label>
          <label>
            Tags
            <input name="tags" required placeholder="z. B. wurf, defense, u16" value={tags} onChange={(event) => setTags(event.currentTarget.value)} />
          </label>
          <label>
            Organisation
            <textarea name="organization" rows={3} placeholder="Aufbau, Gruppen, Rotation" value={organization} onChange={(event) => setOrganization(event.currentTarget.value)} />
          </label>
          <label>
            Ablauf
            <textarea name="description" rows={4} placeholder="Ablauf der Uebung" value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
          </label>
          <label>
            Coaching-Punkte
            <textarea name="coachingPoints" rows={3} placeholder="Korrekturen, Schluesselbegriffe, Varianten" value={coachingPoints} onChange={(event) => setCoachingPoints(event.currentTarget.value)} />
          </label>
          <label>
            Belastung
            <input name="load" placeholder="z. B. 4 Serien a 90 Sekunden" value={load} onChange={(event) => setLoad(event.currentTarget.value)} />
          </label>
        </div>

        <div className="court-editor">
          <div className="section-heading">
            <div>
              <h3>Court-Diagramm</h3>
              <p className="muted">Positionen, Laufwege, Paesse und Wuerfe auf dem Feld einzeichnen.</p>
            </div>
          </div>
          <div className="court-toolbar" aria-label="Court-Positionen hinzufuegen">
            {(Object.keys(itemLabels) as CourtItemType[]).map((type) => (
              <button className="secondary-button" key={type} type="button" onClick={() => addItem(type)}>
                {itemLabels[type]}
              </button>
            ))}
          </div>
          <div className="court-toolbar" aria-label="Court-Linien hinzufuegen">
            {(Object.keys(pathLabels) as CourtPathType[]).map((type) => (
              <button className="secondary-button" key={type} type="button" onClick={() => addPath(type)}>
                {pathLabels[type]}
              </button>
            ))}
          </div>
          <div
            className="court-diagram"
            aria-label="Basketballfeld"
            onPointerLeave={() => setActiveDrag(null)}
            onPointerMove={moveActiveCourtElement}
            onPointerUp={() => setActiveDrag(null)}
          >
            <div className="court-diagram-background" aria-hidden="true" />
            <svg className="court-path-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="court-editor-arrow-run" markerHeight="5" markerWidth="5" orient="auto" refX="4" refY="2.5">
                  <path d="M0,0 L5,2.5 L0,5 Z" />
                </marker>
                <marker id="court-editor-arrow-pass" markerHeight="5" markerWidth="5" orient="auto" refX="4" refY="2.5">
                  <path d="M0,0 L5,2.5 L0,5 Z" />
                </marker>
                <marker id="court-editor-arrow-shot" markerHeight="5" markerWidth="5" orient="auto" refX="4" refY="2.5">
                  <path d="M0,0 L5,2.5 L0,5 Z" />
                </marker>
              </defs>
              {courtPaths.map((path) => (
                <g
                  className="court-path-group"
                  key={path.id}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const position = getCourtElementPosition(event);
                    if (!position) {
                      return;
                    }
                    const logical = unrotateCourtPoint(position.x, position.y);
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setActiveDrag({
                      id: path.id,
                      initialFromX: path.fromX,
                      initialFromY: path.fromY,
                      initialToX: path.toX,
                      initialToY: path.toY,
                      kind: "path",
                      startX: logical.x,
                      startY: logical.y,
                    });
                  }}
                >
                  <line
                    className="court-path-hit"
                    x1={rotateCourtPoint(path.fromX, path.fromY).x}
                    y1={rotateCourtPoint(path.fromX, path.fromY).y}
                    x2={rotateCourtPoint(path.toX, path.toY).x}
                    y2={rotateCourtPoint(path.toX, path.toY).y}
                  />
                  <line
                    className={`court-path court-path-${path.type}`}
                    markerEnd={`url(#court-editor-arrow-${path.type})`}
                    x1={rotateCourtPoint(path.fromX, path.fromY).x}
                    y1={rotateCourtPoint(path.fromX, path.fromY).y}
                    x2={rotateCourtPoint(path.toX, path.toY).x}
                    y2={rotateCourtPoint(path.toX, path.toY).y}
                  />
                  {(() => {
                    const handlePosition = getPathDirectionHandlePosition(path);
                    const transformedHandlePosition = rotateCourtPoint(handlePosition.x, handlePosition.y);
                    const transformedTo = rotateCourtPoint(path.toX, path.toY);
                    const transformedFrom = rotateCourtPoint(path.fromX, path.fromY);
                    const transformedAngle =
                      Math.atan2(transformedTo.y - transformedFrom.y, transformedTo.x - transformedFrom.x) * (180 / Math.PI);

                    return (
                      <g
                        aria-label={`${pathLabels[path.type]} Richtung aendern`}
                        className={`court-path-direction-handle court-path-direction-handle-${path.type}`}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const position = getCourtElementPosition(event);
                          if (!position) {
                            return;
                          }
                          const logical = unrotateCourtPoint(position.x, position.y);
                          event.currentTarget.setPointerCapture(event.pointerId);
                          setActiveDrag({
                            id: path.id,
                            initialToX: path.toX,
                            initialToY: path.toY,
                            kind: "path-target",
                            startX: logical.x,
                            startY: logical.y,
                          });
                        }}
                        role="button"
                        tabIndex={0}
                        transform={`translate(${transformedHandlePosition.x} ${transformedHandlePosition.y}) rotate(${transformedAngle})`}
                      >
                        <circle r="2.1" />
                        <path d="M-0.7,-0.85 L0.85,0 L-0.7,0.85" />
                      </g>
                    );
                  })()}
                </g>
              ))}
            </svg>
            {courtItems.map((item) => (
              <button
                className={`court-token court-token-${item.type}`}
                key={item.id}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setActiveDrag({ id: item.id, kind: "item" });
                }}
                style={{
                  left: `${rotateCourtPoint(item.x, item.y).x}%`,
                  top: `${rotateCourtPoint(item.x, item.y).y}%`,
                }}
                title="Zum Verschieben ziehen"
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          {courtItems.length > 0 ? (
            <div className="court-item-list">
              {courtItems.map((item) => (
                <div className="court-item-row" key={item.id}>
                  <span>{itemLabels[item.type]}</span>
                  <input aria-label="Beschriftung" value={item.label} onChange={(event) => updateItem(item.id, { label: event.currentTarget.value })} />
                  <button className="danger-button" type="button" onClick={() => removeItem(item.id)}>
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Noch keine Positionen platziert.</p>
          )}
          {courtPaths.length > 0 ? (
            <div className="court-item-list">
              {courtPaths.map((path) => (
                <div className="court-path-row" key={path.id}>
                  <label>
                    Linie
                    <select value={path.type} onChange={(event) => updatePath(path.id, { type: event.currentTarget.value as CourtPathType })}>
                      {(Object.keys(pathLabels) as CourtPathType[]).map((type) => (
                        <option key={type} value={type}>
                          {pathLabels[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="danger-button" type="button" onClick={() => removePath(path.id)}>
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Noch keine Laufwege, Paesse oder Wuerfe eingezeichnet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
