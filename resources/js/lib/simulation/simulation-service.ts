export type Point = { x: number; y: number };

export type TableMarker = { id: number; x: number; y: number; label: string };

export type Obstacle = {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

export type RayHit = {
    angleDeg: number;
    distance: number;
    hit: boolean;
    end: Point;
};

export type RobotPose = Point & { angle: number };

/** 5 mesas distribuidas en el salón cenital. */
export const SIM_TABLES: TableMarker[] = [
    { id: 1, x: 18, y: 22, label: 'Mesa 1' },
    { id: 2, x: 50, y: 16, label: 'Mesa 2' },
    { id: 3, x: 82, y: 22, label: 'Mesa 3' },
    { id: 4, x: 16, y: 48, label: 'Mesa 4' },
    { id: 5, x: 84, y: 48, label: 'Mesa 5' },
];

export const SIM_BASE: Point = { x: 50, y: 88 };

/** Unidades de mapa → cm del sensor IR/ultrasónico. */
export const MAP_CM_PER_UNIT = 3.6;
export const IR_MAX_RANGE = 24;
export const IR_RAY_COUNT = 9;
export const IR_SPREAD_DEG = 56;
export const IR_DANGER_CM = 20;
export const IR_WARN_CM = 50;
export const ARRIVAL_RADIUS = 4.5;

export const DEFAULT_OBSTACLE: Obstacle = {
    id: 'default',
    x: 50,
    y: 52,
    w: 11,
    h: 8,
};

export type DeliveryPhase =
    | 'idle'
    | 'leaving_base'
    | 'en_route'
    | 'obstacle'
    | 'arriving'
    | 'delivered'
    | 'returning'
    | 'available';

export const PHASE_LABEL: Record<DeliveryPhase, string> = {
    idle: 'Disponible',
    leaving_base: 'Saliendo de la base',
    en_route: 'En camino',
    obstacle: 'Evasión IR',
    arriving: 'Llegando a la mesa',
    delivered: 'Entrega realizada',
    returning: 'Regresando a la base',
    available: 'Disponible',
};

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export function degToRad(deg: number) {
    return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number) {
    return (rad * 180) / Math.PI;
}

export function normalizeAngle(deg: number) {
    let a = deg % 360;
    if (a > 180) a -= 360;
    if (a < -180) a += 360;
    return a;
}

export function angleToward(from: Point, to: Point) {
    return radToDeg(Math.atan2(to.y - from.y, to.x - from.x));
}

export function distanceBetween(a: Point, b: Point) {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

function obstacleBounds(o: Obstacle) {
    return {
        left: o.x - o.w / 2,
        right: o.x + o.w / 2,
        top: o.y - o.h / 2,
        bottom: o.y + o.h / 2,
    };
}

/** Intersección rayo → AABB; retorna distancia o null. */
function rayAabbDistance(
    origin: Point,
    dirX: number,
    dirY: number,
    o: Obstacle,
    maxRange: number,
): number | null {
    const { left, right, top, bottom } = obstacleBounds(o);
    const invX = dirX !== 0 ? 1 / dirX : Number.POSITIVE_INFINITY;
    const invY = dirY !== 0 ? 1 / dirY : Number.POSITIVE_INFINITY;

    const tx1 = (left - origin.x) * invX;
    const tx2 = (right - origin.x) * invX;
    const ty1 = (top - origin.y) * invY;
    const ty2 = (bottom - origin.y) * invY;

    const tmin = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2));
    const tmax = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));

    if (tmax < 0 || tmin > tmax || tmin > maxRange) {
        return null;
    }

    const t = tmin >= 0 ? tmin : tmax;
    if (t < 0 || t > maxRange) {
        return null;
    }

    return t;
}

export function castInfraredRays(
    origin: RobotPose,
    obstacles: Obstacle[],
    options?: {
        count?: number;
        spreadDeg?: number;
        maxRange?: number;
    },
): RayHit[] {
    const count = options?.count ?? IR_RAY_COUNT;
    const spread = options?.spreadDeg ?? IR_SPREAD_DEG;
    const maxRange = options?.maxRange ?? IR_MAX_RANGE;
    const half = spread / 2;
    const rays: RayHit[] = [];

    for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angleDeg = origin.angle - half + t * spread;
        const rad = degToRad(angleDeg);
        const dirX = Math.cos(rad);
        const dirY = Math.sin(rad);

        let best = maxRange;
        let hit = false;

        for (const obstacle of obstacles) {
            const d = rayAabbDistance(origin, dirX, dirY, obstacle, maxRange);
            if (d !== null && d < best) {
                best = d;
                hit = true;
            }
        }

        rays.push({
            angleDeg,
            distance: best,
            hit,
            end: {
                x: origin.x + dirX * best,
                y: origin.y + dirY * best,
            },
        });
    }

    return rays;
}

/** Distancia frontal (rayos centrales) en cm. */
export function frontalDistanceCm(rays: RayHit[]): number {
    if (rays.length === 0) {
        return Math.round(IR_MAX_RANGE * MAP_CM_PER_UNIT);
    }

    const mid = Math.floor(rays.length / 2);
    const sample = rays.slice(
        Math.max(0, mid - 1),
        Math.min(rays.length, mid + 2),
    );
    const minDist = Math.min(...sample.map((r) => r.distance));
    return Math.round(minDist * MAP_CM_PER_UNIT);
}

/**
 * Gira hacia el lado con más espacio libre.
 * Positivo = derecha, negativo = izquierda (en grados de mapa).
 */
export function avoidanceTurnDeg(rays: RayHit[]): number {
    if (rays.length < 3) {
        return 28;
    }

    const mid = Math.floor(rays.length / 2);
    const leftClear = rays
        .slice(0, mid)
        .reduce((sum, r) => sum + r.distance, 0);
    const rightClear = rays
        .slice(mid + 1)
        .reduce((sum, r) => sum + r.distance, 0);

    const bias = rightClear >= leftClear ? 1 : -1;
    const urgency =
        1 -
        clamp(
            Math.min(...rays.map((r) => r.distance)) / IR_MAX_RANGE,
            0,
            1,
        );

    return bias * (18 + urgency * 28);
}

export function sensorStatus(distanceCm: number): {
    label: 'Libre' | 'Precaución' | 'Obstáculo';
    tone: 'ok' | 'warn' | 'danger';
} {
    if (distanceCm < IR_DANGER_CM) {
        return { label: 'Obstáculo', tone: 'danger' };
    }
    if (distanceCm <= IR_WARN_CM) {
        return { label: 'Precaución', tone: 'warn' };
    }
    return { label: 'Libre', tone: 'ok' };
}

function overlapsKeepOut(
    candidate: Obstacle,
    keepOut: Array<Point & { r: number }>,
) {
    const halfW = candidate.w / 2 + 2;
    const halfH = candidate.h / 2 + 2;

    return keepOut.some((zone) => {
        const dx = Math.abs(candidate.x - zone.x);
        const dy = Math.abs(candidate.y - zone.y);
        return dx < halfW + zone.r && dy < halfH + zone.r;
    });
}

export function generateRandomObstacles(
    count: number,
    tables: TableMarker[] = SIM_TABLES,
    base: Point = SIM_BASE,
): Obstacle[] {
    const keepOut: Array<Point & { r: number }> = [
        { ...base, r: 10 },
        ...tables.map((t) => ({ x: t.x, y: t.y, r: 9 })),
    ];

    const obstacles: Obstacle[] = [];
    let attempts = 0;

    while (obstacles.length < count && attempts < count * 40) {
        attempts += 1;
        const candidate: Obstacle = {
            id: `obs-${obstacles.length + 1}-${Math.random().toString(36).slice(2, 7)}`,
            x: 18 + Math.random() * 64,
            y: 28 + Math.random() * 42,
            w: 8 + Math.random() * 6,
            h: 6 + Math.random() * 5,
        };

        if (overlapsKeepOut(candidate, keepOut)) {
            continue;
        }

        const collides = obstacles.some((existing) => {
            const dx = Math.abs(existing.x - candidate.x);
            const dy = Math.abs(existing.y - candidate.y);
            return (
                dx < (existing.w + candidate.w) / 2 + 3 &&
                dy < (existing.h + candidate.h) / 2 + 3
            );
        });

        if (collides) {
            continue;
        }

        obstacles.push(candidate);
        keepOut.push({ x: candidate.x, y: candidate.y, r: 6 });
    }

    return obstacles.length > 0 ? obstacles : [{ ...DEFAULT_OBSTACLE }];
}

/** Obstáculo justo delante del robot (demo manual). */
export function obstacleInFrontOf(robot: RobotPose): Obstacle {
    const rad = degToRad(robot.angle);
    return {
        id: `front-${Date.now()}`,
        x: clamp(robot.x + Math.cos(rad) * 12, 12, 88),
        y: clamp(robot.y + Math.sin(rad) * 12, 14, 82),
        w: 10,
        h: 7,
    };
}

export function tableById(id: number): TableMarker {
    return SIM_TABLES.find((t) => t.id === id) ?? SIM_TABLES[0];
}

export function pathLengthApprox(from: Point, to: Point): number {
    // 100 unidades de mapa ≈ 8 m
    return (distanceBetween(from, to) / 100) * 8;
}

/**
 * Un paso de navegación: busca el objetivo y evita con IR.
 */
export function stepRobotNavigation(
    robot: RobotPose,
    goal: Point,
    obstacles: Obstacle[],
    speedPct: number,
): {
    pose: RobotPose;
    rays: RayHit[];
    distanceCm: number;
    avoiding: boolean;
} {
    const rays = castInfraredRays(robot, obstacles);
    const distanceCm = frontalDistanceCm(rays);
    const avoiding = distanceCm < IR_DANGER_CM;

    let angle = robot.angle;

    if (avoiding) {
        angle += avoidanceTurnDeg(rays) * 0.55;
    } else {
        const desired = angleToward(robot, goal);
        const delta = normalizeAngle(desired - angle);
        angle += clamp(delta, -10, 10);
    }

    const moveScale = avoiding ? 0.35 : 1;
    const step = (0.35 + speedPct / 120) * moveScale;
    const rad = degToRad(angle);

    return {
        pose: {
            x: clamp(robot.x + Math.cos(rad) * step, 6, 94),
            y: clamp(robot.y + Math.sin(rad) * step, 8, 94),
            angle: normalizeAngle(angle),
        },
        rays,
        distanceCm,
        avoiding,
    };
}
