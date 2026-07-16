import { useEffect, useMemo, useRef, useState } from 'react';
import CameraPanel from '@/components/site/simulation/camera-panel';
import RobotTelemetry from '@/components/site/simulation/robot-telemetry';
import ScenarioPanel from '@/components/site/simulation/scenario-panel';
import SensorView from '@/components/site/simulation/sensor-view';
import SimulationMap from '@/components/site/simulation/simulation-map';
import { Badge } from '@/components/ui/badge';
import { createSimEvent, type SimEvent } from '@/lib/simulation/event-service';
import {
    ARRIVAL_RADIUS,
    SIM_BASE,
    SIM_TABLES,
    angleToward,
    castInfraredRays,
    distanceBetween,
    frontalDistanceCm,
    generateRandomObstacles,
    obstacleInFrontOf,
    pathLengthApprox,
    stepRobotNavigation,
    tableById,
    type DeliveryPhase,
    type Obstacle,
    type Point,
    type RayHit,
    type RobotPose,
} from '@/lib/simulation/simulation-service';
import { speak } from '@/lib/simulation/speech-service';
import { cn } from '@/lib/utils';

const INITIAL_POSE: RobotPose = {
    ...SIM_BASE,
    angle: angleToward(SIM_BASE, SIM_TABLES[2]),
};

function createScenario(count = 3) {
    const nextObstacles = generateRandomObstacles(count);
    const rays = castInfraredRays(INITIAL_POSE, nextObstacles);

    return {
        obstacles: nextObstacles,
        rays,
        distanceCm: frontalDistanceCm(rays),
    };
}

export default function SimulacionSection() {
    const [target, setTarget] = useState(3);
    const [phase, setPhase] = useState<DeliveryPhase>('idle');
    const [direction, setDirection] = useState<1 | -1>(1);
    const [running, setRunning] = useState(false);
    const [paused, setPaused] = useState(false);
    const [cameraOn, setCameraOn] = useState(true);
    const [speed, setSpeed] = useState(65);
    const [battery, setBattery] = useState(85);
    const [elapsedSec, setElapsedSec] = useState(0);
    const [obstacleCount, setObstacleCount] = useState(3);
    const [scenario] = useState(() => createScenario(3));
    const [obstacles, setObstacles] = useState<Obstacle[]>(
        () => scenario.obstacles,
    );
    const [robot, setRobot] = useState<RobotPose>(INITIAL_POSE);
    const [rays, setRays] = useState<RayHit[]>(() => scenario.rays);
    const [distanceCm, setDistanceCm] = useState(() => scenario.distanceCm);
    const [avoiding, setAvoiding] = useState(false);
    const [traveledPath, setTraveledPath] = useState<Point[]>([]);
    const [events, setEvents] = useState<SimEvent[]>([
        createSimEvent('Sistema', 'Robot conectado', 'Simulación lista'),
    ]);

    const goal = useMemo(() => {
        if (phase === 'idle' || phase === 'available' || phase === 'delivered') {
            return null;
        }
        return direction === 1 ? tableById(target) : SIM_BASE;
    }, [direction, phase, target]);

    const startDist = useMemo(() => {
        if (!goal) return 1;
        const from = direction === 1 ? SIM_BASE : tableById(target);
        return Math.max(distanceBetween(from, goal), 1);
    }, [direction, goal, target]);

    const avoidAnnunciatedRef = useRef(false);
    const returnScheduledRef = useRef(false);
    const robotRef = useRef(robot);
    const obstaclesRef = useRef(obstacles);
    const speedRef = useRef(speed);
    const directionRef = useRef(direction);
    const targetRef = useRef(target);
    const goalRef = useRef(goal);

    robotRef.current = robot;
    obstaclesRef.current = obstacles;
    speedRef.current = speed;
    directionRef.current = direction;
    targetRef.current = target;
    goalRef.current = goal;

    const remainingM = goal ? pathLengthApprox(robot, goal) : 0;
    const progress = goal
        ? Math.min(
              1,
              Math.max(0, 1 - distanceBetween(robot, goal) / startDist),
          )
        : phase === 'delivered'
          ? 1
          : 0;

    const pushEvent = (
        type: SimEvent['type'],
        action: string,
        result: string,
    ) => {
        setEvents((prev) =>
            [createSimEvent(type, action, result), ...prev].slice(0, 12),
        );
    };

    const refreshRays = (pose: RobotPose, nextObstacles = obstacles) => {
        const nextRays = castInfraredRays(pose, nextObstacles);
        setRays(nextRays);
        setDistanceCm(frontalDistanceCm(nextRays));
        return nextRays;
    };

    useEffect(() => {
        const nextRays = castInfraredRays(robotRef.current, obstaclesRef.current);
        setRays(nextRays);
        setDistanceCm(frontalDistanceCm(nextRays));
    }, []);

    useEffect(() => {
        const id = window.setInterval(() => {
            if (running && !paused) {
                setBattery((b) => Math.max(12, +(b - 0.02).toFixed(2)));
                setElapsedSec((s) => s + 1);
            }
            if (!running || paused) {
                const nextRays = castInfraredRays(
                    robotRef.current,
                    obstaclesRef.current,
                );
                setRays(nextRays);
                setDistanceCm(frontalDistanceCm(nextRays));
            }
        }, 1000);
        return () => window.clearInterval(id);
    }, [running, paused]);

    useEffect(() => {
        if (!running || paused || !goal || phase === 'delivered') {
            return;
        }

        const id = window.setInterval(() => {
            const currentGoal = goalRef.current;
            if (!currentGoal) {
                return;
            }

            const step = stepRobotNavigation(
                robotRef.current,
                currentGoal,
                obstaclesRef.current,
                speedRef.current,
            );

            robotRef.current = step.pose;
            setRobot(step.pose);
            setRays(step.rays);
            setDistanceCm(step.distanceCm);
            setAvoiding(step.avoiding);
            setTraveledPath((path) => [...path, step.pose].slice(-120));

            if (step.avoiding) {
                setPhase('obstacle');
                if (!avoidAnnunciatedRef.current) {
                    avoidAnnunciatedRef.current = true;
                    speak('Obstáculo detectado, evadiendo');
                    pushEvent(
                        'Sensor',
                        'IR frontal bloqueado',
                        `Giro evasivo · ${step.distanceCm} cm`,
                    );
                }
                return;
            }

            avoidAnnunciatedRef.current = false;
            const distToGoal = distanceBetween(step.pose, currentGoal);
            const dir = directionRef.current;
            const mesa = targetRef.current;

            if (dir === 1) {
                if (distToGoal < ARRIVAL_RADIUS) {
                    if (!returnScheduledRef.current) {
                        returnScheduledRef.current = true;
                        setPhase('delivered');
                        speak('Entrega completada');
                        pushEvent(
                            'Automático',
                            `Entrega en mesa ${mesa}`,
                            'Completada',
                        );
                        window.setTimeout(() => {
                            speak('Regresando a la base');
                            pushEvent(
                                'Automático',
                                'Regreso a base',
                                'Iniciado',
                            );
                            setDirection(-1);
                            setTraveledPath([]);
                            setPhase('returning');
                            returnScheduledRef.current = false;
                        }, 900);
                    }
                } else if (distanceBetween(step.pose, SIM_BASE) < 12) {
                    setPhase('leaving_base');
                } else if (distToGoal < 12) {
                    setPhase('arriving');
                } else {
                    setPhase('en_route');
                }
            } else if (distToGoal < ARRIVAL_RADIUS) {
                setPhase('available');
                setRunning(false);
                setDirection(1);
                pushEvent('Sistema', 'Robot en base', 'Disponible');
                window.setTimeout(() => setPhase('idle'), 700);
            } else {
                setPhase('returning');
            }
        }, 40);

        return () => window.clearInterval(id);
    }, [running, paused, goal, phase]);

    const startDelivery = (mesa: number) => {
        if (
            running &&
            phase !== 'idle' &&
            phase !== 'available' &&
            !paused
        ) {
            pushEvent(
                'Sistema',
                'Entrega rechazada',
                'Ya hay una entrega en curso',
            );
            return;
        }

        const table = tableById(mesa);
        const pose: RobotPose = {
            ...SIM_BASE,
            angle: angleToward(SIM_BASE, table),
        };

        setTarget(mesa);
        setPaused(false);
        setDirection(1);
        setRobot(pose);
        robotRef.current = pose;
        refreshRays(pose);
        setTraveledPath([pose]);
        setElapsedSec(0);
        setAvoiding(false);
        setPhase('leaving_base');
        setRunning(true);
        setCameraOn(true);
        avoidAnnunciatedRef.current = false;
        returnScheduledRef.current = false;
        speak('Entrega iniciada');
        pushEvent('Automático', `Iniciar entrega mesa ${mesa}`, 'En curso');
    };

    const spawnFrontObstacle = () => {
        if (phase === 'idle' || phase === 'available') {
            return;
        }

        const next = [...obstacles, obstacleInFrontOf(robot)].slice(-6);
        setObstacles(next);
        refreshRays(robot, next);
        speak('Obstáculo detectado');
        pushEvent('Manual', 'Obstáculo frontal', 'Insertado delante del robot');
    };

    const randomizeObstacles = () => {
        const next = generateRandomObstacles(obstacleCount);
        setObstacles(next);
        refreshRays(robot, next);
        pushEvent(
            'Sistema',
            'Obstáculos aleatorios',
            `${next.length} generados`,
        );
    };

    const reset = () => {
        setRunning(false);
        setPaused(false);
        setDirection(1);
        setRobot(INITIAL_POSE);
        setTraveledPath([]);
        setPhase('idle');
        setElapsedSec(0);
        setAvoiding(false);
        setSpeed(65);
        const next = generateRandomObstacles(obstacleCount);
        setObstacles(next);
        refreshRays(INITIAL_POSE, next);
        avoidAnnunciatedRef.current = false;
        returnScheduledRef.current = false;
        pushEvent('Sistema', 'Simulación reiniciada', 'OK');
    };

    const inProgress =
        running && phase !== 'idle' && phase !== 'available';
    const scenarioLocked = inProgress && !paused;

    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0c1118] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold tracking-[0.16em] text-[oklch(0.62_0.08_185)] uppercase">
                            Simulación
                        </p>
                        <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                            Tablero cenital
                        </h1>
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
                        <span className="tabular-nums">
                            {Math.floor(elapsedSec / 60)
                                .toString()
                                .padStart(2, '0')}
                            :
                            {(elapsedSec % 60).toString().padStart(2, '0')}
                            {' · '}
                            {speed}% · {obstacles.length} obst.
                        </span>
                        <Badge
                            className={cn(
                                'border-0',
                                inProgress
                                    ? avoiding
                                        ? 'bg-amber-500/90'
                                        : 'bg-sky-500/90'
                                    : 'bg-[oklch(0.42_0.09_185)]',
                            )}
                        >
                            {inProgress
                                ? avoiding
                                    ? 'Evasión IR'
                                    : 'En curso'
                                : 'Disponible'}
                        </Badge>
                    </div>
                </div>

                <div className="grid lg:min-h-[560px] lg:grid-cols-[168px_minmax(0,1fr)_200px] lg:items-stretch">
                    <div className="flex border-b border-white/10 p-3 lg:border-r lg:border-b-0">
                        <ScenarioPanel
                            tables={SIM_TABLES}
                            target={target}
                            obstacleCount={obstacleCount}
                            obstacleTotal={obstacles.length}
                            disabled={scenarioLocked}
                            deliveryActive={inProgress}
                            paused={paused}
                            speed={speed}
                            onSelectTable={startDelivery}
                            onObstacleCountChange={setObstacleCount}
                            onRandomizeObstacles={randomizeObstacles}
                            onSpawnFrontObstacle={spawnFrontObstacle}
                            onStartDelivery={() => startDelivery(target)}
                            onTogglePause={() => {
                                setPaused((p) => {
                                    const next = !p;
                                    pushEvent(
                                        'Automático',
                                        next ? 'Pausa' : 'Reanudar',
                                        'OK',
                                    );
                                    return next;
                                });
                            }}
                            onToggleCamera={() => {
                                setCameraOn((v) => {
                                    const next = !v;
                                    speak(
                                        next
                                            ? 'Cámara encendida'
                                            : 'Cámara apagada',
                                    );
                                    pushEvent(
                                        'Manual',
                                        next
                                            ? 'Cámara encendida'
                                            : 'Cámara apagada',
                                        'OK',
                                    );
                                    return next;
                                });
                            }}
                            onSpeedChange={setSpeed}
                            onReset={reset}
                        />
                    </div>

                    <div className="flex min-h-[420px] min-w-0 flex-col border-b border-white/10 p-3 lg:min-h-0 lg:border-r lg:border-b-0">
                        <SimulationMap
                            robot={robot}
                            tables={SIM_TABLES}
                            obstacles={obstacles}
                            rays={rays}
                            target={target}
                            phase={phase}
                            progress={progress}
                            goal={goal}
                            traveledPath={traveledPath}
                            avoiding={avoiding}
                            distanceCm={distanceCm}
                            onSelectTable={startDelivery}
                        />
                    </div>

                    <div className="flex flex-col gap-3 p-3">
                        <RobotTelemetry
                            phase={phase}
                            destination={
                                phase === 'idle' || phase === 'available'
                                    ? null
                                    : target
                            }
                            distanceRemainingM={Math.max(0, remainingM)}
                            distanceCm={distanceCm}
                            speed={
                                paused
                                    ? 0
                                    : avoiding
                                      ? Math.round(speed * 0.35)
                                      : speed
                            }
                            battery={Math.round(battery)}
                            connection="connected"
                        />
                        <div className="border-t border-white/10 pt-3">
                            <CameraPanel
                                on={cameraOn}
                                destination={phase === 'idle' ? null : target}
                            />
                        </div>
                        <div className="border-t border-white/10 pt-3">
                            <SensorView
                                distanceCm={distanceCm}
                                rays={rays}
                                avoiding={avoiding}
                            />
                        </div>
                        <div className="mt-auto border-t border-white/10 pt-3">
                            <p className="mb-1.5 text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                                Eventos
                            </p>
                            <div className="max-h-[88px] space-y-1 overflow-y-auto">
                                {events.slice(0, 5).map((event) => (
                                    <div
                                        key={event.id}
                                        className="rounded-md bg-white/5 px-2 py-1 text-[10px] leading-snug"
                                    >
                                        <span className="tabular-nums text-slate-500">
                                            {event.time}
                                        </span>{' '}
                                        <span className="text-slate-300">
                                            {event.action}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
