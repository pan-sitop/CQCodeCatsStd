import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_BULLETS = 5;
const HIT_RADIUS_PERCENT = 5.5; // % of game area width — circular hitbox radius
const SCORE_PER_BUG = 100;

// Speed multiplier per level — gentler curve, level 1 is very slow
const LEVEL_SPEED = [1, 1.3, 1.65, 2.1, 2.6];

// Bug emojis for the flying targets
const BUG_EMOJIS = ['🐛', '👾'];

// Bug count per level — deterministic: 2 bugs (lvl 1-2), 3 bugs (lvl 3+)
function bugCountForLevel(level) {
  return level <= 2 ? 2 : 3;
}

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function createBug(id, level) {
  const speedMult = LEVEL_SPEED[Math.min(level - 1, LEVEL_SPEED.length - 1)];
  // Very slow base speed at level 1; scales gently upward
  const baseVx = randomBetween(0.010, 0.022) * speedMult;
  const baseVy = randomBetween(0.007, 0.015) * speedMult;
  return {
    id,
    x: randomBetween(12, 82),
    y: randomBetween(12, 68),
    vx: baseVx * (Math.random() > 0.5 ? 1 : -1),
    vy: baseVy * (Math.random() > 0.5 ? 1 : -1),
    emoji: BUG_EMOJIS[Math.floor(Math.random() * BUG_EMOJIS.length)],
    alive: true,
  };
}



function HitSplat({ x, y }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      initial={{ opacity: 1, scale: 0.4 }}
      animate={{ opacity: 0, scale: 2.2 }}
      transition={{ duration: 0.35 }}
    >
      <div className="w-8 h-8 rounded-full border-2 border-verde-limon bg-verde-limon/20" />
    </motion.div>
  );
}

// ─── Bullet HUD ───────────────────────────────────────────────────────────────
function BulletHUD({ bulletsLeft, total }) {
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="w-3 h-3 rounded-full border-2 border-verde-limon"
          animate={{
            backgroundColor: i < bulletsLeft ? '#C3FB34' : 'transparent',
            scale: i === bulletsLeft ? [1, 0.55, 1] : 1,
          }}
          transition={{ duration: 0.2 }}
        />
      ))}
    </div>
  );
}

// ─── Level badge ──────────────────────────────────────────────────────────────
function LevelBadge({ level }) {
  const labels = ['', 'EASY', 'NORMAL', 'HARD', 'EXPERT', 'INSANE'];
  const colors = ['', 'text-green-400', 'text-yellow-300', 'text-orange-400', 'text-red-400', 'text-pink-400'];
  return (
    <span className={`font-geomanist text-xs sm:text-sm font-bold tracking-widest uppercase ${colors[Math.min(level, 5)]}`}>
      LVL {level} — {labels[Math.min(level, 5)]}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BugHuntView({ onReturnToStart }) {
  const [phase, setPhase] = useState('menu'); // menu | intro | playing | success | gameover
  const [bugs, setBugs] = useState([]);
  const [bullets, setBullets] = useState(MAX_BULLETS);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [hitSplats, setHitSplats] = useState([]);

  const gameAreaRef = useRef(null);
  const bugsRef = useRef([]);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const phaseRef = useRef('menu');
  const bulletsRef = useRef(MAX_BULLETS);
  const levelRef = useRef(1);

  // Keep refs in sync with state
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { bulletsRef.current = bullets; }, [bullets]);
  useEffect(() => { levelRef.current = level; }, [level]);

  // ── rAF movement loop ─────────────────────────────────────────────────────
  const tick = useCallback((timestamp) => {
    if (phaseRef.current !== 'playing') return;

    const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
    lastTimeRef.current = timestamp;

    bugsRef.current = bugsRef.current.map((bug) => {
      if (!bug.alive) return bug;

      let nx = bug.x + bug.vx * dt;
      let ny = bug.y + bug.vy * dt;
      let nvx = bug.vx;
      let nvy = bug.vy;

      if (nx < 5 || nx > 90) { nvx = -nvx; nx = Math.max(5, Math.min(90, nx)); }
      if (ny < 5 || ny > 83) { nvy = -nvy; ny = Math.max(5, Math.min(83, ny)); }

      return { ...bug, x: nx, y: ny, vx: nvx, vy: nvy };
    });

    setBugs([...bugsRef.current]);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startRaf = useCallback(() => {
    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopRaf = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Start round (uses current level) ─────────────────────────────────────
  const startRound = useCallback((roundLevel) => {
    const count = bugCountForLevel(roundLevel);
    const newBugs = Array.from({ length: count }, (_, i) =>
      createBug(Date.now() + i, roundLevel)
    );
    bugsRef.current = newBugs;
    setBugs(newBugs);
    setBullets(MAX_BULLETS);
    setHitSplats([]);
    setPhase('playing');
  }, []);

  // ── Begin game (menu -> intro -> playing) ─────────────────────────────────
  const handleStart = useCallback(() => {
    setLevel(1);
    levelRef.current = 1;
    setScore(0);
    setPhase('intro');
    setTimeout(() => startRound(1), 2600);
  }, [startRound]);

  // ── Next round after success (level up) ──────────────────────────────────
  const handleNextRound = useCallback(() => {
    const nextLevel = Math.min(levelRef.current + 1, LEVEL_SPEED.length);
    setLevel(nextLevel);
    levelRef.current = nextLevel;
    startRound(nextLevel);
  }, [startRound]);

  // ── Full restart (from gameover, back to menu) ────────────────────────────
  const handleRestart = useCallback(() => {
    setScore(0);
    setLevel(1);
    levelRef.current = 1;
    setPhase('menu');
  }, []);

  // ── rAF lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'playing') startRaf();
    else stopRaf();
    return () => stopRaf();
  }, [phase, startRaf, stopRaf]);

  // ── Win/lose detection ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    const aliveBugs = bugs.filter((b) => b.alive);
    if (aliveBugs.length === 0 && bugs.length > 0) {
      stopRaf();
      confetti({ particleCount: 130, spread: 80, origin: { y: 0.55 }, colors: ['#C3FB34', '#4142F5'] });
      setTimeout(() => setPhase('success'), 300);
    } else if (bullets === 0 && aliveBugs.length > 0) {
      stopRaf();
      setTimeout(() => setPhase('gameover'), 420);
    }
  }, [bugs, bullets, phase, stopRaf]);

  // ── Miss handler: click on empty game area → consume a bullet ────────────
  const handleMiss = useCallback((e) => {
    if (phaseRef.current !== 'playing') return;
    if (bulletsRef.current <= 0) return;
    setBullets((prev) => Math.max(0, prev - 1));
  }, []);

  // ── Hit handler: click lands directly on a bug's hitbox div ───────────────
  const handleBugClick = useCallback((e, bugId) => {
    e.stopPropagation(); // prevent bubbling to game area (no double bullet spend)
    if (phaseRef.current !== 'playing') return;
    if (bulletsRef.current <= 0) return;

    // Spend a bullet
    setBullets((prev) => Math.max(0, prev - 1));

    // Mark the bug as dead
    const bug = bugsRef.current.find((b) => b.id === bugId && b.alive);
    if (!bug) return;

    setScore((prev) => prev + SCORE_PER_BUG * levelRef.current);
    setHitSplats((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), x: bug.x, y: bug.y },
    ]);
    bugsRef.current = bugsRef.current.map((b) =>
      b.id === bugId ? { ...b, alive: false } : b
    );
    setBugs([...bugsRef.current]);
  }, []);

  // Cleanup splats
  useEffect(() => {
    if (!hitSplats.length) return;
    const t = setTimeout(() => setHitSplats([]), 500);
    return () => clearTimeout(t);
  }, [hitSplats]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="w-full flex-grow min-h-screen flex flex-col items-center justify-center p-3 md:p-4 pointer-events-auto overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* ── 16:9 Game Container ─────────────────────────────────────────── */}
      <div className="relative w-full max-w-6xl" style={{ maxHeight: '92vh' }}>
        <div
          className="relative w-full overflow-hidden rounded-3xl bg-azul-gatuno shadow-[0_0_80px_rgba(65,66,245,0.45)] border-4 border-verde-limon"
          style={{ paddingBottom: '56.25%' }}
        >
          <div className="absolute inset-0 flex flex-col">

            {/* Starfield */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white/10"
                  style={{
                    width: `${randomBetween(2, 5)}px`,
                    height: `${randomBetween(2, 5)}px`,
                    left: `${randomBetween(0, 100)}%`,
                    top: `${randomBetween(0, 100)}%`,
                  }}
                />
              ))}
            </div>

            {/* ═══════════════════════════════════════
                MENU
            ═══════════════════════════════════════ */}
            <AnimatePresence>
              {phase === 'menu' && (
                <motion.div
                  key="menu"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.35 }}
                >
                  {/* Title — Geomanist, no emoji */}
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <h1 className="font-geomanist font-bold text-verde-limon text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight leading-none drop-shadow-lg">
                      Code Cats
                    </h1>
                    <h2 className="font-geomanist font-bold text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight drop-shadow-md">
                      Bug Hunt
                    </h2>
                  </motion.div>

                  <motion.img
                    src="/cat-menu-laptop.svg"
                    alt="Gato programando"
                    className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 object-contain"
                    style={{ filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.85)) drop-shadow(0 0 6px rgba(255,255,255,0.5))' }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />

                  <p className="font-geomanist text-white/75 text-sm sm:text-base md:text-lg max-w-sm">
                    Tienes{' '}
                    <span className="text-verde-limon font-bold">{MAX_BULLETS} disparos</span>{' '}
                    por ronda. Caza todos los bugs antes de que escapen y sube de nivel.
                  </p>

                  <motion.button
                    onClick={handleStart}
                    className="mt-1 px-8 py-3 rounded-full font-geomanist font-bold text-base sm:text-lg uppercase tracking-widest bg-verde-limon text-gray-900 shadow-[0_0_22px_rgba(195,251,52,0.65)] hover:shadow-[0_0_36px_rgba(195,251,52,0.9)] hover:scale-105 active:scale-95 transition-all duration-200"
                    whileTap={{ scale: 0.95 }}
                  >
                    Comenzar Partida
                  </motion.button>

                  <button
                    onClick={onReturnToStart}
                    className="text-white/40 font-geomanist text-xs hover:text-white/70 transition-colors underline underline-offset-2"
                  >
                    Volver al inicio
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════
                INTRO
            ═══════════════════════════════════════ */}
            <AnimatePresence>
              {phase === 'intro' && (
                <motion.div
                  key="intro"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.h2
                    className="font-geomanist font-bold text-verde-limon text-2xl sm:text-3xl md:text-4xl tracking-tight uppercase z-10"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    A Cazar Bugs
                  </motion.h2>

                  {/* Cat runs across */}
                  <motion.img
                    src="/cat-intro-jump.svg"
                    alt="Gato saltando"
                    className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 object-contain"
                    style={{ filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.85)) drop-shadow(0 0 6px rgba(255,255,255,0.5))' }}
                    initial={{ x: '-130%', opacity: 0 }}
                    animate={{
                      x: ['-130%', '0%', '130%'],
                      opacity: [0, 1, 1, 0],
                      y: [10, -12, 10, -8, 10],
                    }}
                    transition={{
                      duration: 2.1,
                      ease: 'easeInOut',
                      times: [0, 0.3, 0.7, 0.9, 1],
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />

                  {/* Countdown — no emojis */}
                  <motion.div
                    className="flex gap-4 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {['3', '2', '1'].map((n, i) => (
                      <motion.span
                        key={n}
                        className="font-geomanist font-bold text-white text-4xl sm:text-5xl md:text-6xl"
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 0.9] }}
                        transition={{ delay: 0.5 + i * 0.62, duration: 0.58 }}
                      >
                        {n}
                      </motion.span>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════
                PLAYING
            ═══════════════════════════════════════ */}
            <AnimatePresence>
              {phase === 'playing' && (
                <motion.div
                  key="playing"
                  ref={gameAreaRef}
                  className="absolute inset-0 cursor-crosshair select-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleMiss}
                >
                  {/* HUD */}
                  <div className="absolute top-2 sm:top-3 left-3 sm:left-4 right-3 sm:right-4 flex items-center justify-between z-20 pointer-events-none">
                    {/* Score */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-geomanist font-bold text-verde-limon text-base sm:text-xl md:text-2xl tabular-nums">
                        {score}
                      </span>
                      <span className="font-geomanist text-white/45 text-xs">pts</span>
                    </div>
                    {/* Bullets */}
                    <BulletHUD bulletsLeft={bullets} total={MAX_BULLETS} />
                    {/* Level */}
                    <LevelBadge level={level} />
                  </div>

                  {/* Alive & dead bugs */}
                  <AnimatePresence>
                    {bugs.map((bug) =>
                      bug.alive ? (
                        /* ── Invisible hitbox div — browser-native hit detection ── */
                        <motion.div
                          key={bug.id}
                          className="absolute flex items-center justify-center w-20 h-20 pointer-events-auto cursor-crosshair"
                          style={{
                            left: `${bug.x}%`,
                            top: `${bug.y}%`,
                            transform: 'translate(-50%, -50%)',
                            willChange: 'left, top',
                          }}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                          onClick={(e) => handleBugClick(e, bug.id)}
                        >
                          <span
                            className="text-4xl sm:text-5xl md:text-6xl select-none pointer-events-none"
                            style={{ filter: 'drop-shadow(0 0 8px rgba(195,251,52,0.65))' }}
                          >
                            {bug.emoji}
                          </span>
                        </motion.div>
                      ) : (
                        /* ── Dead bug: falls & fades, no interaction ── */
                        <motion.span
                          key={`dead-${bug.id}`}
                          className="absolute text-4xl sm:text-5xl md:text-6xl select-none pointer-events-none"
                          style={{
                            left: `${bug.x}%`,
                            top: `${bug.y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          initial={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
                          animate={{ scale: 0.2, rotate: 360, opacity: 0, y: 80 }}
                          transition={{ duration: 0.5, ease: 'easeIn' }}
                        >
                          {bug.emoji}
                        </motion.span>
                      )
                    )}
                  </AnimatePresence>

                  {/* Hit splats */}
                  <AnimatePresence>
                    {hitSplats.map((s) => (
                      <HitSplat key={s.id} x={s.x} y={s.y} />
                    ))}
                  </AnimatePresence>

                  {/* Out of ammo overlay */}
                  <AnimatePresence>
                    {bullets === 0 && (
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <span className="font-geomanist font-bold text-white/55 text-xl sm:text-2xl md:text-3xl uppercase tracking-widest">
                          Sin municion
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════
                SUCCESS
            ═══════════════════════════════════════ */}
            <AnimatePresence>
              {phase === 'success' && (
                <motion.div
                  key="success"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Speech bubble */}
                  <motion.div
                    className="relative bg-verde-limon text-gray-900 font-geomanist font-bold text-sm sm:text-base md:text-lg px-5 py-3 rounded-2xl shadow-lg tracking-wide uppercase max-w-xs z-10"
                    initial={{ opacity: 0, scale: 0.5, y: -15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', delay: 0.35, stiffness: 260, damping: 18 }}
                  >
                    Pull Request Aprobado
                    <div
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderTop: '14px solid #C3FB34',
                      }}
                    />
                  </motion.div>

                  <motion.img
                    src="/cat-success-wrench.svg"
                    alt="Gato con llave inglesa"
                    className="w-28 h-28 sm:w-36 sm:h-36 md:w-48 md:h-48 object-contain drop-shadow-2xl"
                    initial={{ y: 220, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 190, damping: 18, delay: 0.1 }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />

                  <motion.div
                    className="font-geomanist font-bold text-verde-limon text-2xl sm:text-3xl md:text-4xl"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                  >
                    {score} pts
                  </motion.div>

                  {/* Level up hint */}
                  <motion.p
                    className="font-geomanist text-white/60 text-xs sm:text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    Siguiente: Nivel {Math.min(level + 1, LEVEL_SPEED.length)} — los bugs se mueven mas rapido
                  </motion.p>

                  <motion.div
                    className="flex gap-3 mt-1 flex-wrap justify-center"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.85 }}
                  >
                    <button
                      onClick={handleNextRound}
                      className="px-6 py-2.5 rounded-full font-geomanist font-bold text-sm sm:text-base uppercase tracking-widest bg-verde-limon text-gray-900 shadow-[0_0_20px_rgba(195,251,52,0.65)] hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      Siguiente Nivel
                    </button>
                    <button
                      onClick={handleRestart}
                      className="px-6 py-2.5 rounded-full font-geomanist font-bold text-sm sm:text-base uppercase tracking-widest bg-white/10 text-white border border-white/25 hover:bg-white/20 hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      Reiniciar
                    </button>
                  </motion.div>

                  <button
                    onClick={onReturnToStart}
                    className="text-white/40 font-geomanist text-xs hover:text-white/70 transition-colors underline underline-offset-2"
                  >
                    Volver al inicio
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════
                GAME OVER
            ═══════════════════════════════════════ */}
            <AnimatePresence>
              {phase === 'gameover' && (
                <motion.div
                  key="gameover"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Crash title — Geomanist, no emoji */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25, type: 'spring', stiffness: 210 }}
                  >
                    <h2 className="font-geomanist font-bold text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-tight max-w-sm uppercase">
                      Bug en Produccion
                    </h2>
                    <p className="font-geomanist text-red-400 text-sm sm:text-base md:text-xl font-semibold mt-1 tracking-widest uppercase">
                      System Crashed
                    </p>
                  </motion.div>

                  {/* Shaking scared cat */}
                  <motion.img
                    src="/cat-fail-peek.svg"
                    alt="Gato asustado"
                    className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 object-contain"
                    style={{ filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.85)) drop-shadow(0 0 6px rgba(255,255,255,0.5))' }}
                    initial={{ y: 260, opacity: 0 }}
                    animate={{
                      y: 0,
                      opacity: 1,
                      x: [0, -9, 9, -9, 9, -5, 5, -3, 3, 0],
                    }}
                    transition={{
                      y: { type: 'spring', stiffness: 175, damping: 13, delay: 0.1 },
                      opacity: { duration: 0.28, delay: 0.1 },
                      x: {
                        delay: 0.65,
                        duration: 0.48,
                        repeat: Infinity,
                        repeatType: 'loop',
                        ease: 'easeInOut',
                      },
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />

                  <motion.div
                    className="font-geomanist font-bold text-verde-limon text-2xl sm:text-3xl md:text-4xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {score} pts
                  </motion.div>

                  <motion.div
                    className="flex gap-3 mt-1 flex-wrap justify-center"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.72 }}
                  >
                    <button
                      onClick={handleRestart}
                      className="px-7 py-2.5 rounded-full font-geomanist font-bold text-sm sm:text-base uppercase tracking-widest bg-verde-limon text-gray-900 shadow-[0_0_20px_rgba(195,251,52,0.65)] hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      Reintentar
                    </button>
                  </motion.div>

                  <button
                    onClick={onReturnToStart}
                    className="text-white/40 font-geomanist text-xs hover:text-white/70 transition-colors underline underline-offset-2"
                  >
                    Volver al inicio
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
