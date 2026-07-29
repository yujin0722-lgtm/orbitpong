"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 720;
const CENTER = SIZE / 2;
const RADIUS = 285;
const PADDLE_HALF = 0.24;
const WIN_SCORE = 5;
const BASE_BALL_SPEED = 255;
const MAX_BALL_SPEED = 485;
const BALL_ACCELERATION = 1.0525;
const PADDLE_ACCELERATION = 0.027;
const MAX_PADDLE_MULTIPLIER = 1.6;
const PADDLE_SPIN_FACTOR = 42;
const MAX_PADDLE_SPIN = 170;
const COLOR_TRANSITION_HITS = 52;

type Phase = "ready" | "playing" | "paused" | "point" | "finished";
type Difficulty = "EASY" | "NORMAL" | "HARD";
type Ball = { x: number; y: number; vx: number; vy: number };

const difficultySpeed: Record<Difficulty, number> = {
  EASY: 1.15,
  NORMAL: 1.8,
  HARD: 2.55,
};

function angleDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mixChannel(from: number, to: number, amount: number) {
  return Math.round(from + (to - from) * amount);
}

function mixRgb(
  from: [number, number, number],
  to: [number, number, number],
  amount: number,
) {
  return [
    mixChannel(from[0], to[0], amount),
    mixChannel(from[1], to[1], amount),
    mixChannel(from[2], to[2], amount),
  ] as const;
}

function speedPalette(rallyHitCount: number) {
  const progress = clamp(rallyHitCount / COLOR_TRANSITION_HITS, 0, 1);
  const firstHalf = progress <= 0.5;
  const amount = firstHalf ? progress * 2 : (progress - 0.5) * 2;
  const glow = firstHalf
    ? mixRgb([99, 255, 194], [255, 211, 71], amount)
    : mixRgb([255, 211, 71], [255, 73, 61], amount);
  const field = firstHalf
    ? mixRgb([9, 43, 34], [45, 35, 8], amount)
    : mixRgb([45, 35, 8], [48, 8, 8], amount);

  return {
    glow: `rgb(${glow.join(",")})`,
    glowAlpha: (alpha: number) => `rgba(${glow.join(",")},${alpha})`,
    field: `rgb(${field.join(",")})`,
    progress,
  };
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  const difficultyRef = useRef<Difficulty>("NORMAL");
  const playerAngle = useRef(Math.PI / 2);
  const playerTarget = useRef(Math.PI / 2);
  const aiAngle = useRef(-Math.PI / 2);
  const playerAngularVelocity = useRef(0);
  const aiAngularVelocity = useRef(0);
  const rallyHits = useRef(0);
  const ball = useRef<Ball>({ x: 0, y: 0, vx: 0, vy: 0 });
  const trail = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const keys = useRef({ left: false, right: false });
  const scoresRef = useRef({ player: 0, cpu: 0 });
  const audioRef = useRef<AudioContext | null>(null);

  const [phase, setPhaseState] = useState<Phase>("ready");
  const [difficulty, setDifficultyState] = useState<Difficulty>("NORMAL");
  const [scores, setScores] = useState({ player: 0, cpu: 0 });
  const [message, setMessage] = useState("MOVE TO AIM");
  const [pointResult, setPointResult] = useState("YOUR POINT");

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const tone = useCallback((frequency: number, duration = 0.05) => {
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }
      const audio = audioRef.current;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.055, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audio.currentTime + duration,
      );
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch {
      // Audio is an enhancement; play remains available if it is blocked.
    }
  }, []);

  const serve = useCallback((towardPlayer = Math.random() > 0.5) => {
    const spread = (Math.random() - 0.5) * 0.85;
    const base = towardPlayer ? Math.PI / 2 : -Math.PI / 2;
    const angle = base + spread;
    const speed = BASE_BALL_SPEED;
    ball.current = {
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
    rallyHits.current = 0;
    playerAngularVelocity.current = 0;
    aiAngularVelocity.current = 0;
    trail.current = [];
  }, []);

  const startGame = useCallback(() => {
    scoresRef.current = { player: 0, cpu: 0 };
    setScores({ player: 0, cpu: 0 });
    setPointResult("YOUR POINT");
    playerAngle.current = Math.PI / 2;
    playerTarget.current = Math.PI / 2;
    aiAngle.current = -Math.PI / 2;
    setMessage("FIRST TO 5");
    serve(false);
    setPhase("playing");
    tone(520, 0.08);
  }, [serve, setPhase, tone]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === "playing") {
      setMessage("PAUSED");
      setPhase("paused");
    } else if (phaseRef.current === "paused") {
      setMessage("PLAY");
      setPhase("playing");
      lastRef.current = performance.now();
    }
  }, [setPhase]);

  const registerPoint = useCallback(
    (winner: "player" | "cpu") => {
      const next = { ...scoresRef.current };
      next[winner] += 1;
      scoresRef.current = next;
      setScores(next);
      tone(winner === "player" ? 760 : 150, 0.14);

      if (next[winner] >= WIN_SCORE) {
        setMessage(winner === "player" ? "YOU WIN" : "CPU WINS");
        setPhase("finished");
        return;
      }

      setPointResult(winner === "player" ? "YOUR POINT" : "CPU POINT");
      setMessage("READY");
      setPhase("point");
    },
    [setPhase, tone],
  );

  const movePointer = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * SIZE - CENTER;
    const y = ((clientY - rect.top) / rect.height) * SIZE - CENTER;
    let angle = Math.atan2(y, x);
    if (angle < 0) {
      angle = x < 0 ? Math.PI : 0;
    }
    playerTarget.current = clamp(angle, 0.18, Math.PI - 0.18);
  }, []);

  const resumeAfterPoint = useCallback(() => {
    if (phaseRef.current !== "point") return;
    serve(scoresRef.current.player > scoresRef.current.cpu);
    setMessage("PLAY");
    setPhase("playing");
    lastRef.current = performance.now();
    tone(520, 0.06);
  }, [serve, setPhase, tone]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keys.current.left = true;
        event.preventDefault();
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keys.current.right = true;
        event.preventDefault();
      }
      if (event.key === " " || event.key.toLowerCase() === "p") {
        event.preventDefault();
        if (
          phaseRef.current === "ready" ||
          phaseRef.current === "finished"
        ) {
          startGame();
        } else {
          togglePause();
        }
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keys.current.left = false;
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keys.current.right = false;
      }
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, [startGame, togglePause]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    function drawArc(
      ctx: CanvasRenderingContext2D,
      angle: number,
      color: string,
      width: number,
    ) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(
        CENTER,
        CENTER,
        RADIUS,
        angle - PADDLE_HALF,
        angle + PADDLE_HALF,
      );
      ctx.stroke();
      ctx.restore();
    }

    function drawMovementZones(ctx: CanvasRenderingContext2D) {
      const guideRadius = RADIUS - 27;

      const drawZone = (
        start: number,
        end: number,
        color: string,
        label: string,
        labelAngle: number,
      ) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.setLineDash([4, 10]);
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, guideRadius, start, end);
        ctx.stroke();
        ctx.setLineDash([]);

        for (const angle of [start, end]) {
          const inner = guideRadius - 8;
          const outer = guideRadius + 8;
          ctx.beginPath();
          ctx.moveTo(
            CENTER + Math.cos(angle) * inner,
            CENTER + Math.sin(angle) * inner,
          );
          ctx.lineTo(
            CENTER + Math.cos(angle) * outer,
            CENTER + Math.sin(angle) * outer,
          );
          ctx.stroke();
        }

        ctx.fillStyle = color;
        ctx.font = "700 10px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "2px";
        ctx.fillText(
          label,
          CENTER + Math.cos(labelAngle) * (guideRadius - 22),
          CENTER + Math.sin(labelAngle) * (guideRadius - 22),
        );
        ctx.restore();
      };

      drawZone(
        -Math.PI + 0.18,
        -0.18,
        "rgba(121, 255, 200, .27)",
        "CPU ZONE",
        -Math.PI / 2,
      );
      drawZone(
        0.18,
        Math.PI - 0.18,
        "rgba(231, 255, 244, .36)",
        "YOUR ZONE",
        Math.PI / 2,
      );
    }

    function update(delta: number) {
      if (phaseRef.current !== "playing") return;

      const paddleMultiplier = Math.min(
        MAX_PADDLE_MULTIPLIER,
        1 + rallyHits.current * PADDLE_ACCELERATION,
      );
      const keyboardSpeed = 2.45 * paddleMultiplier * delta;
      if (keys.current.left) {
        playerTarget.current = clamp(
          playerTarget.current + keyboardSpeed,
          0.18,
          Math.PI - 0.18,
        );
      }
      if (keys.current.right) {
        playerTarget.current = clamp(
          playerTarget.current - keyboardSpeed,
          0.18,
          Math.PI - 0.18,
        );
      }
      const previousPlayerAngle = playerAngle.current;
      playerAngle.current +=
        (playerTarget.current - playerAngle.current) *
        Math.min(1, delta * 15 * paddleMultiplier);
      playerAngularVelocity.current = clamp(
        (playerAngle.current - previousPlayerAngle) / Math.max(delta, 0.001),
        -5,
        5,
      );

      const b = ball.current;
      const desiredAi = clamp(Math.atan2(b.y, b.x), -Math.PI + 0.18, -0.18);
      const targetAi = b.y < 80 ? desiredAi : -Math.PI / 2;
      let aiDifference = Math.atan2(
        Math.sin(targetAi - aiAngle.current),
        Math.cos(targetAi - aiAngle.current),
      );
      aiDifference = clamp(
        aiDifference,
        -difficultySpeed[difficultyRef.current] * paddleMultiplier * delta,
        difficultySpeed[difficultyRef.current] * paddleMultiplier * delta,
      );
      const previousAiAngle = aiAngle.current;
      aiAngle.current = clamp(
        aiAngle.current + aiDifference,
        -Math.PI + 0.18,
        -0.18,
      );
      aiAngularVelocity.current = clamp(
        (aiAngle.current - previousAiAngle) / Math.max(delta, 0.001),
        -5,
        5,
      );

      b.x += b.vx * delta;
      b.y += b.vy * delta;
      trail.current.unshift({ x: b.x, y: b.y, alpha: 1 });
      trail.current = trail.current
        .slice(0, 13)
        .map((point) => ({ ...point, alpha: point.alpha * 0.78 }));

      const distance = Math.hypot(b.x, b.y);
      if (distance < RADIUS - 7) return;

      const hitAngle = Math.atan2(b.y, b.x);
      const isPlayerSide = b.y >= 0;
      const paddle = isPlayerSide ? playerAngle.current : aiAngle.current;
      const hit = angleDistance(hitAngle, paddle) <= PADDLE_HALF + 0.055;

      if (!hit) {
        registerPoint(isPlayerSide ? "cpu" : "player");
        return;
      }

      const nx = b.x / distance;
      const ny = b.y / distance;
      const dot = b.vx * nx + b.vy * ny;
      b.vx -= 2 * dot * nx;
      b.vy -= 2 * dot * ny;

      const offset = clamp(
        Math.atan2(Math.sin(hitAngle - paddle), Math.cos(hitAngle - paddle)) /
          PADDLE_HALF,
        -1,
        1,
      );
      const tangentX = -ny;
      const tangentY = nx;
      const paddleMotion = isPlayerSide
        ? playerAngularVelocity.current
        : aiAngularVelocity.current;
      const motionSpin = clamp(
        paddleMotion * PADDLE_SPIN_FACTOR,
        -MAX_PADDLE_SPIN,
        MAX_PADDLE_SPIN,
      );
      const tangentForce = offset * 115 + motionSpin;
      b.vx += tangentX * tangentForce;
      b.vy += tangentY * tangentForce;
      rallyHits.current += 1;
      const speed = Math.min(
        MAX_BALL_SPEED,
        Math.hypot(b.vx, b.vy) * BALL_ACCELERATION,
      );
      const currentSpeed = Math.hypot(b.vx, b.vy);
      b.vx = (b.vx / currentSpeed) * speed;
      b.vy = (b.vy / currentSpeed) * speed;
      b.x = nx * (RADIUS - 10);
      b.y = ny * (RADIUS - 10);
      tone(280 + speed * 0.65, 0.045);
    }

    function draw() {
      if (!context) return;
      context.clearRect(0, 0, SIZE, SIZE);
      const b = ball.current;
      const palette = speedPalette(rallyHits.current);

      const glow = context.createRadialGradient(
        CENTER,
        CENTER,
        20,
        CENTER,
        CENTER,
        RADIUS + 30,
      );
      glow.addColorStop(0, palette.field);
      glow.addColorStop(0.72, palette.glowAlpha(0.08));
      glow.addColorStop(1, "#080404");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(CENTER, CENTER, RADIUS + 22, 0, Math.PI * 2);
      context.fill();

      context.save();
      context.strokeStyle = palette.glowAlpha(0.18);
      context.lineWidth = 2;
      context.shadowColor = palette.glow;
      context.shadowBlur = 9;
      context.beginPath();
      context.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
      context.stroke();
      context.restore();

      drawMovementZones(context);
      drawArc(context, aiAngle.current, palette.glow, 12);
      drawArc(context, playerAngle.current, "#e7fff4", 14);

      for (const point of trail.current) {
        context.save();
        context.globalAlpha = point.alpha * 0.26;
        context.fillStyle = palette.glow;
        context.shadowColor = palette.glow;
        context.shadowBlur = 18;
        context.beginPath();
        context.arc(CENTER + point.x, CENTER + point.y, 4, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      context.save();
      context.fillStyle = "#f1fff8";
      context.shadowColor = palette.glow;
      context.shadowBlur = 18;
      context.beginPath();
      context.arc(CENTER + b.x, CENTER + b.y, 5.5, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.save();
      context.globalAlpha = 0.05;
      context.fillStyle = "#cbffe9";
      for (let i = 0; i < 28; i += 1) {
        const y = (i * 31 + performance.now() * 0.011) % SIZE;
        context.fillRect(74, y, SIZE - 148, 1);
      }
      context.restore();
    }

    function loop(time: number) {
      const delta = Math.min(0.026, (time - lastRef.current) / 1000 || 0);
      lastRef.current = time;
      update(delta);
      draw();
      frameRef.current = requestAnimationFrame(loop);
    }

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [registerPoint, setPhase, tone]);

  const chooseDifficulty = (next: Difficulty) => {
    difficultyRef.current = next;
    setDifficultyState(next);
    tone(next === "EASY" ? 330 : next === "NORMAL" ? 440 : 560, 0.04);
  };

  return (
    <main className="game-shell">
      <section className="console" aria-label="Orbit Pong game console">
        <header className="console-header">
          <div>
            <p className="eyebrow">OSCILLOSCOPE GAME / 01</p>
            <h1>ORBIT PONG</h1>
          </div>
          <div className="scoreboard" aria-live="polite">
            <div>
              <span>YOU</span>
              <strong>{String(scores.player).padStart(2, "0")}</strong>
            </div>
            <i>—</i>
            <div>
              <span>CPU</span>
              <strong>{String(scores.cpu).padStart(2, "0")}</strong>
            </div>
          </div>
        </header>

        <div className="scope-wrap">
          <div
            className="scope"
            onPointerMove={(event) => movePointer(event.clientX, event.clientY)}
            onPointerDown={(event) => {
              movePointer(event.clientX, event.clientY);
              if (phaseRef.current === "point") {
                resumeAfterPoint();
                return;
              }
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
          >
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              aria-label="円形のフィールドでコンピューターと対戦するゲーム画面"
            />
            <div className="glass" />
            {phase !== "playing" && phase !== "point" && (
              <div className="screen-message">
                <span>{message}</span>
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    if (phase === "paused") togglePause();
                    else startGame();
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    if (phase === "paused") togglePause();
                    else startGame();
                  }}
                >
                  {phase === "paused" ? "RESUME" : "START"}
                </button>
              </div>
            )}
            {phase === "point" && (
              <div className="point-message">
                <strong>{pointResult}</strong>
                <span>READY — CLICK TO SERVE</span>
              </div>
            )}
          </div>
          <p className="status-line">
            <span className="status-dot" />
            {phase === "ready"
              ? "SYSTEM READY"
              : phase === "paused"
                ? "SIGNAL HOLD"
                : phase === "finished"
                  ? "MATCH COMPLETE"
                  : message}
          </p>
        </div>

        <footer className="controls">
          <div className="instructions">
            <span className="control-number">01</span>
            <div>
              <strong>MOVE</strong>
              <p>マウスを左右へ動かしてラケットを操作</p>
            </div>
          </div>
          <div className="instructions">
            <span className="control-number">02</span>
            <div>
              <strong>AIM</strong>
              <p>ラケットの端で返すと角度が大きく変化</p>
            </div>
          </div>
          <div className="difficulty" aria-label="難易度">
            <span>CPU LEVEL</span>
            <div>
              {(["EASY", "NORMAL", "HARD"] as Difficulty[]).map((level) => (
                <button
                  type="button"
                  className={difficulty === level ? "active" : ""}
                  onClick={() => chooseDifficulty(level)}
                  key={level}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </footer>
        <button
          className="pause-button"
          type="button"
          onClick={togglePause}
          disabled={phase === "ready" || phase === "finished"}
        >
          {phase === "paused" ? "再開" : "一時停止"} <kbd>SPACE</kbd>
        </button>
      </section>
    </main>
  );
}
