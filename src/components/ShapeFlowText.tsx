import { useEffect, useMemo, useRef, useState } from "react";
import { prepareWithSegments, layoutNextLineRange, materializeLineRange, type LayoutCursor } from "@chenglou/pretext";
import {
  getSilhouette,
  transformSilhouette,
  getPolygonIntervalForBand,
  carveTextLineSlots,
  type Point,
  type Interval,
  type Silhouette,
} from "../utils/wrapGeometry";
import { useRafTime } from "../hooks/useRafTime";

export type FloatConfig = {
  amplitudeX?: number;
  amplitudeY?: number;
  speed?: number;
  phase?: number;
};

export type ObstacleSpec = {
  id: string;
  src: string;
  anchorX: number;
  anchorY: number;
  width: number;
  height: number;
  rotation?: number;
  float?: FloatConfig;
  label?: string;
};

type ObstacleState = ObstacleSpec & { dragging: boolean; floating: boolean };

export type ShapeFlowTextProps = {
  texts: string[];
  font: string;
  lineHeight: number;
  width: number;
  containerWidth?: number;
  textOffsetX?: number;
  columns?: number;
  columnGap?: number;
  color?: string;
  initialObstacles: ObstacleSpec[];
  padding?: number;
  maxHeight?: number;
};

type Line = { top: number; left: number; text: string };

const MAX_LINES = 400;
const MAX_BLOCKED_PROBES = 60;

export default function ShapeFlowText({
  texts,
  font,
  lineHeight,
  width,
  containerWidth,
  textOffsetX = 0,
  columns = 1,
  columnGap = 24,
  color = "#1c1c1c",
  initialObstacles,
  padding = 10,
  maxHeight = Infinity,
}: ShapeFlowTextProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [obstacles, setObstacles] = useState<ObstacleState[]>(() =>
    initialObstacles.map((o) => ({ ...o, dragging: false, floating: true }))
  );
  const [silhouettes, setSilhouettes] = useState<Map<string, Silhouette>>(new Map());
  const dragRef = useRef<{ id: string; startPointerX: number; startPointerY: number; startAnchorX: number; startAnchorY: number; moved: boolean } | null>(null);

  const t = useRafTime(true);

  //carga (una vez por src) la silueta real a partir del canal alfa de cada imagen
  useEffect(() => {
    const uniqueSrcs = Array.from(new Set(obstacles.map((o) => o.src)));
    for (const src of uniqueSrcs) {
      if (silhouettes.has(src)) continue;
      getSilhouette(src).then((sil) => {
        setSilhouettes((prev) => {
          const next = new Map(prev);
          next.set(src, sil);
          return next;
        });
      });
    }
    
  }, [obstacles.map((o) => o.src).join("|")]);

  const preparedList = useMemo(() => texts.map((t) => prepareWithSegments(t, font)), [texts, font]);

  
  const resolvedObstacles = useMemo(() => {
    return obstacles.map((o) => {
      const f = o.float;
      const active = o.floating;
      const dx = f?.amplitudeX && active ? f.amplitudeX * Math.sin(t * (f.speed ?? 1) + (f.phase ?? 0)) : 0;
      const dy = f?.amplitudeY && active ? f.amplitudeY * Math.sin(t * (f.speed ?? 1) * 1.31 + (f.phase ?? 0) + 1.7) : 0;
      const cx = o.anchorX + dx;
      const cy = o.anchorY + dy;
      const rect = { x: cx - o.width / 2, y: cy - o.height / 2, width: o.width, height: o.height };
      const angleRad = ((o.rotation ?? 0) * Math.PI) / 180;
      const sil = silhouettes.get(o.src) ?? null;
      const points: Point[] | null = sil ? transformSilhouette(sil.points, rect, angleRad) : null;
      return { id: o.id, src: o.src, rect, points, displayX: cx, displayY: cy, rotation: o.rotation ?? 0 };
    });
  }, [obstacles, silhouettes, t]);

  //recalcula, línea por línea, cuánto ancho libre queda
  // en cada franja de texto y le pide a pretext que corte ahí.
  const lines = useMemo<Line[]>(() => {
    const colWidth = (width - (columns - 1) * columnGap) / columns;

    function slotsForBand(bandTop: number, bandBottom: number, colLeft: number, colRight: number): Interval[] {
      const blocked: Interval[] = [];
      for (const obs of resolvedObstacles) {
        if (bandBottom <= obs.rect.y - padding || bandTop >= obs.rect.y + obs.rect.height + padding) continue;
        if (obs.points) {
          const interval = getPolygonIntervalForBand(obs.points, bandTop, bandBottom, padding);
          if (interval) blocked.push(interval);
        } else {
          blocked.push({ left: obs.rect.x - padding, right: obs.rect.x + obs.rect.width + padding });
        }
      }
      return carveTextLineSlots({ left: colLeft, right: colRight }, blocked);
    }

    const result: Line[] = [];

    for (let col = 0; col < columns; col++) {
      const colLeft = textOffsetX + col * (colWidth + columnGap);
      const colRight = colLeft + colWidth;
      let y = 0;
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      const prepared = preparedList[col] ?? preparedList[0];

      for (let i = 0; i < MAX_LINES; i++) {
        if (y + lineHeight > maxHeight) break;
        let slots = slotsForBand(y, y + lineHeight, colLeft, colRight);
        let probes = 0;
        while (slots.length === 0 && probes < MAX_BLOCKED_PROBES) {
          y += lineHeight / 4;
          slots = slotsForBand(y, y + lineHeight, colLeft, colRight);
          probes++;
        }
        if (slots.length === 0) break;

        for (const slot of slots) {
          const range = layoutNextLineRange(prepared, cursor, Math.max(1, slot.right - slot.left));
          if (range === null) break;
          const materialized = materializeLineRange(prepared, range);
          result.push({ top: y, left: slot.left, text: materialized.text });
          cursor = range.end;
        }
        y += lineHeight;
      }
    }
    return result;
  }, [resolvedObstacles, preparedList, width, lineHeight, padding, textOffsetX, columns, columnGap]);

  const contentHeight = Math.max(
    lines.length ? lines[lines.length - 1]!.top + lineHeight + 20 : 0,
    ...resolvedObstacles.map((o) => o.rect.y + o.rect.height)
  );

  //arrastrar imagenes 
  function handlePointerDown(e: React.PointerEvent, obstacle: ObstacleState) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: obstacle.id,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startAnchorX: obstacle.anchorX,
      startAnchorY: obstacle.anchorY,
      moved: false,
    };
    setObstacles((prev) => prev.map((o) => (o.id === obstacle.id ? { ...o, dragging: true } : o)));
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startPointerX;
    const dy = e.clientY - drag.startPointerY;
    if (!drag.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) drag.moved = true;
    setObstacles((prev) =>
      prev.map((o) =>
        o.id === drag.id ? { ...o, anchorX: drag.startAnchorX + dx, anchorY: drag.startAnchorY + dy } : o
      )
    );
  }

  function handlePointerUp() {
    if (!dragRef.current) return;
    const { id, moved } = dragRef.current;
    dragRef.current = null;
    setObstacles((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        if (!moved) return { ...o, dragging: false, floating: !o.floating };
        return { ...o, dragging: false };
      })
    );
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        position: "relative",
        width: containerWidth ?? width,
        height: contentHeight,
        userSelect: dragRef.current ? "none" : "auto",
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: line.top,
            left: line.left,
            font,
            lineHeight: `${lineHeight}px`,
            color,
            whiteSpace: "pre",
          }}
        >
          {line.text}
        </div>
      ))}

      {resolvedObstacles.map((obs) => {
        const spec = obstacles.find((o) => o.id === obs.id)!;
        return (
          <img
            key={obs.id}
            src={obs.src}
            alt={spec.label ?? "dibujo"}
            draggable={false}
            onPointerDown={(e) => handlePointerDown(e, spec)}
            style={{
              position: "absolute",
              left: obs.rect.x,
              top: obs.rect.y,
              width: obs.rect.width,
              height: obs.rect.height,
              objectFit: "contain",
              transform: `rotate(${obs.rotation}deg)`,
              touchAction: "none",
              cursor: spec.dragging ? "grabbing" : spec.floating ? "grab" : "pointer",
              opacity: spec.floating ? 1 : 0.85,
              filter: spec.dragging ? "drop-shadow(0 6px 14px rgba(0,0,0,.35))" : "drop-shadow(0 2px 6px rgba(0,0,0,.2))",
              transition: spec.dragging ? "none" : "filter 120ms ease, opacity 120ms ease",
            }}
          />
        );
      })}
    </div>
  );
}