import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────────
const GRAVITY = 0.0006;
const JUMP_STRENGTH = 0.22;
const GROUND_Y = 15; // Player's bottom % at ground
const BASE_SPEED = 0.045;
const PLAYER_X = 10; 
const PLAYER_WIDTH = 10; // Reduced width
const PLAYER_HEIGHT = 16; // Reduced height
const CACTUS_WIDTH = 7; // Increased size relative to player
const CACTUS_HEIGHT = 20;

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

export default function CodeRunnerView({ onReturnToStart }) {
  const [phase, setPhase] = useState('menu'); // menu | playing | gameover
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);
  
  const [playerY, setPlayerY] = useState(GROUND_Y);
  const [obstacles, setObstacles] = useState([]);

  // Game loop refs
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const phaseRef = useRef('menu');
  const scoreRef = useRef(0);
  
  // Physics refs
  const playerYRef = useRef(GROUND_Y);
  const yVelocityRef = useRef(0);
  const isJumpingRef = useRef(false);
  const obstaclesRef = useRef([]);
  const spawnTimerRef = useRef(0);
  
  // Animation refs
  const groundRef = useRef(null);
  const bgOffsetXRef = useRef(0);

  // Load Hi-Score on mount
  useEffect(() => {
    const saved = localStorage.getItem('codeCatsHiScore');
    if (saved) setHiScore(parseInt(saved, 10));
  }, []);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // ── Jump Logic ────────────────────────────────────────────────────────────
  const jump = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    if (!isJumpingRef.current) {
      isJumpingRef.current = true;
      yVelocityRef.current = JUMP_STRENGTH;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && phaseRef.current === 'playing') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  // ── Game Loop ─────────────────────────────────────────────────────────────
  const tick = useCallback((timestamp) => {
    if (phaseRef.current !== 'playing') return;
    const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
    lastTimeRef.current = timestamp;

    // 1. Score & Speed Scaling
    scoreRef.current += dt * 0.015;
    setScore(Math.floor(scoreRef.current));
    const speedMultiplier = 1 + (scoreRef.current * 0.0012);
    const currentSpeed = BASE_SPEED * speedMultiplier;

    // Background Animation sync (Seamless Ground)
    // currentSpeed is % of screen per ms.
    // Since our ground is w-[200%], translating it by 50% of its own width moves it 1 full screen.
    // If cactus moves X% of screen, ground should move (X / 2)% of its own width.
    bgOffsetXRef.current -= (currentSpeed * dt) / 2;
    if (bgOffsetXRef.current <= -50) {
      bgOffsetXRef.current += 50; // Loop seamlessly
    }
    if (groundRef.current) {
      groundRef.current.style.transform = `translateX(${bgOffsetXRef.current}%)`;
    }

    // 2. Player Physics
    if (isJumpingRef.current || playerYRef.current > GROUND_Y) {
      yVelocityRef.current -= GRAVITY * dt;
      playerYRef.current += yVelocityRef.current * dt;

      if (playerYRef.current <= GROUND_Y) {
        playerYRef.current = GROUND_Y;
        yVelocityRef.current = 0;
        isJumpingRef.current = false;
      }
      setPlayerY(playerYRef.current);
    }

    // 3. Obstacle Spawning (Dynamic ranges)
    spawnTimerRef.current += dt;
    const minWait = Math.max(600, 1600 - (scoreRef.current * 0.6));
    const maxWait = Math.max(1000, 2800 - (scoreRef.current * 1.0));
    const spawnInterval = randomBetween(minWait, maxWait);
    
    if (spawnTimerRef.current >= spawnInterval) {
      spawnTimerRef.current = 0;
      obstaclesRef.current.push({
        id: Date.now() + Math.random(),
        x: 110, // spawn off-screen right
      });
    }

    // 4. Update Obstacles & Collision
    let isHit = false;
    
    // Player Hitbox (AABB with relative %)
    const pLeft = PLAYER_X + 2;
    const pRight = PLAYER_X + PLAYER_WIDTH - 2;
    const pBottom = playerYRef.current + 1;
    const pTop = playerYRef.current + PLAYER_HEIGHT - 2;

    obstaclesRef.current = obstaclesRef.current.map(obs => {
      const newX = obs.x - (currentSpeed * dt);
      
      const cLeft = newX + 1.5;
      const cRight = newX + CACTUS_WIDTH - 1.5;
      const cBottom = GROUND_Y;
      const cTop = GROUND_Y + CACTUS_HEIGHT - 2;

      // Check overlap
      if (pRight > cLeft && pLeft < cRight && pTop > cBottom && pBottom < cTop) {
        isHit = true;
      }
      return { ...obs, x: newX };
    }).filter(obs => obs.x > -20); // clean up far left obstacles

    setObstacles([...obstaclesRef.current]);

    // 5. Game Over
    if (isHit) {
      setPhase('gameover');
      const finalScore = Math.floor(scoreRef.current);
      if (finalScore > hiScore) {
        setHiScore(finalScore);
        localStorage.setItem('codeCatsHiScore', finalScore.toString());
      }
      return; // stop loop
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [hiScore, jump]);

  const startRaf = useCallback(() => {
    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopRaf = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (phase === 'playing') startRaf();
    else stopRaf();
    return () => stopRaf();
  }, [phase, startRaf, stopRaf]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const handleStart = () => {
    scoreRef.current = 0;
    setScore(0);
    playerYRef.current = GROUND_Y;
    setPlayerY(GROUND_Y);
    yVelocityRef.current = 0;
    isJumpingRef.current = false;
    obstaclesRef.current = [];
    setObstacles([]);
    spawnTimerRef.current = 0;
    setPhase('playing');
  };

  const handlePointerDown = (e) => {
    if (phase === 'playing') {
      e.preventDefault();
      jump();
    }
  };

  return (
    <motion.div
      className="w-full flex-grow min-h-screen flex flex-col items-center justify-center p-3 md:p-4 pointer-events-auto overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      <style>{`
        @keyframes cloudPan {
          from { transform: translateX(0); }
          to { transform: translateX(-150vw); }
        }
        .animate-cloud-slow { animation: cloudPan 45s linear infinite; will-change: transform; }
        .animate-cloud-med { animation: cloudPan 30s linear infinite; will-change: transform; }
        .animate-cloud-fast { animation: cloudPan 20s linear infinite; will-change: transform; }
      `}</style>

      {/* ── Responsive Game Container ─────────────────────────────────────────── */}
      <div className="relative w-full max-w-6xl aspect-[4/5] sm:aspect-video max-h-[92vh]">
        <div 
          className="absolute inset-0 w-full h-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#090a15] to-[#121330] shadow-[0_0_80px_rgba(0,0,0,0.25)] border-4 border-azul-gatuno touch-none"
          onPointerDown={handlePointerDown}
          onTouchStart={handlePointerDown}
        >
          
          {/* Animated Parallax Clouds */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
             {/* Cloud 1 (Farthest, slowest) */}
             <div className="absolute top-[15%] left-0 w-full h-full opacity-15 scale-75">
               <div className="absolute left-[100%] animate-cloud-slow">
                  <div className="relative w-32 h-10">
                     <div className="absolute bottom-0 w-full h-6 bg-white rounded-full" />
                     <div className="absolute bottom-2 left-4 w-10 h-10 bg-white rounded-full" />
                     <div className="absolute bottom-2 right-6 w-14 h-14 bg-white rounded-full" />
                  </div>
               </div>
             </div>
             {/* Cloud 2 (Middle, medium) */}
             <div className="absolute top-[35%] left-0 w-full h-full opacity-20 scale-90">
               <div className="absolute left-[100%] animate-cloud-med" style={{ animationDelay: '-12s' }}>
                  <div className="relative w-40 h-12">
                     <div className="absolute bottom-0 w-full h-8 bg-white rounded-full" />
                     <div className="absolute bottom-2 left-6 w-12 h-12 bg-white rounded-full" />
                     <div className="absolute bottom-2 right-8 w-16 h-16 bg-white rounded-full" />
                  </div>
               </div>
             </div>
             {/* Cloud 3 (Closest, fastest) */}
             <div className="absolute top-[10%] left-0 w-full h-full opacity-30 scale-110">
               <div className="absolute left-[100%] animate-cloud-fast" style={{ animationDelay: '-6s' }}>
                  <div className="relative w-28 h-8">
                     <div className="absolute bottom-0 w-full h-5 bg-white rounded-full" />
                     <div className="absolute bottom-1 left-3 w-8 h-8 bg-white rounded-full" />
                     <div className="absolute bottom-1 right-5 w-10 h-10 bg-white rounded-full" />
                  </div>
               </div>
             </div>
          </div>

          {/* Background ground line & speed lines (Seamless loop) */}
          <div 
            className="absolute left-0 right-0 border-t-2 border-azul-gatuno flex overflow-hidden"
            style={{ bottom: 0, height: `${GROUND_Y}%` }}
          >
            <div ref={groundRef} className="absolute left-0 top-0 w-[200%] h-full flex pt-1.5 will-change-transform">
               {/* Pattern Block 1 */}
               <div className="w-1/2 h-full flex flex-col gap-1.5">
                   <div className="w-full h-1.5 opacity-80" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #4142F5 0%, #4142F5 2%, transparent 2%, transparent 8%)' }} />
                   <div className="w-full h-1.5 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #4142F5 0%, #4142F5 4%, transparent 4%, transparent 15%)' }} />
               </div>
               {/* Pattern Block 2 (Clone for seamless loop) */}
               <div className="w-1/2 h-full flex flex-col gap-1.5">
                   <div className="w-full h-1.5 opacity-80" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #4142F5 0%, #4142F5 2%, transparent 2%, transparent 8%)' }} />
                   <div className="w-full h-1.5 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #4142F5 0%, #4142F5 4%, transparent 4%, transparent 15%)' }} />
               </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              MENU PHASE
          ═══════════════════════════════════════ */}
          <AnimatePresence>
            {phase === 'menu' && (
              <motion.div
                key="menu"
                className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6 text-center bg-gray-900/80 z-50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.35 }}
              >
                <div>
                  <h1 className="font-ryker font-black text-white text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none drop-shadow-lg uppercase">
                    Code <span className="text-verde-limon">Runner</span>
                  </h1>
                </div>

                <div className="w-24 h-24 sm:w-32 sm:h-32 relative">
                  <motion.img 
                    src="/cat-dino-runner.svg" 
                    alt="Code Runner Cat"
                    className="w-full h-full object-contain"
                    animate={{ y: [0, -15, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                    onError={(e) => { e.target.src = 'https://placehold.co/100x100/4142F5/fff?text=Cat'; }}
                  />
                </div>

                <p className="font-geomanist text-gray-300 text-sm sm:text-base max-w-md">
                  Presiona <kbd className="bg-gray-800 border border-gray-600 px-2 py-0.5 rounded text-verde-limon">Espacio</kbd>, <kbd className="bg-gray-800 border border-gray-600 px-2 py-0.5 rounded text-verde-limon">Arriba</kbd> o toca la pantalla para saltar y esquivar los obstáculos.
                </p>

                <div className="flex flex-col gap-3 mt-4">
                  <motion.button
                    onClick={handleStart}
                    className="px-10 py-4 rounded-full font-geomanist font-bold text-lg uppercase tracking-widest bg-azul-gatuno text-white shadow-[0_0_22px_rgba(65,66,245,0.65)] hover:shadow-[0_0_36px_rgba(65,66,245,0.9)] hover:scale-105 active:scale-95 transition-all duration-200"
                    whileTap={{ scale: 0.95 }}
                  >
                    Jugar
                  </motion.button>
                  <button
                    onClick={onReturnToStart}
                    className="text-white/40 font-geomanist text-sm hover:text-white transition-colors underline underline-offset-2"
                  >
                    Volver al Arcade
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════
              PLAYING PHASE
          ═══════════════════════════════════════ */}
          {phase === 'playing' && (
            <>
              {/* HUD */}
              <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex items-center justify-between z-20 pointer-events-none">
                
                {/* Score Box */}
                <div className="bg-azul-gatuno/80 border border-verde-limon/50 backdrop-blur-sm rounded-full px-4 py-1.5 sm:px-5 sm:py-2 flex items-center gap-2 shadow-[0_0_10px_rgba(195,251,52,0.2)]">
                  <span className="font-geomanist text-white/70 text-[10px] sm:text-xs uppercase tracking-widest mt-0.5">Score</span>
                  <span className="font-geomanist font-bold text-verde-limon text-sm sm:text-lg tabular-nums leading-none">
                    {score}
                  </span>
                </div>

                {/* Hi-Score Box */}
                <div className="bg-azul-gatuno/80 border border-verde-limon/50 backdrop-blur-sm rounded-full px-4 py-1.5 sm:px-5 sm:py-2 flex items-center gap-2 shadow-[0_0_10px_rgba(195,251,52,0.2)]">
                  <span className="font-geomanist text-yellow-300/80 text-[10px] sm:text-xs uppercase tracking-widest mt-0.5">Hi-Score</span>
                  <span className="font-geomanist font-bold text-yellow-300 text-sm sm:text-lg tabular-nums leading-none">
                    {Math.max(score, hiScore)}
                  </span>
                </div>

              </div>

              {/* Player */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${PLAYER_X}%`,
                  bottom: `${playerY}%`,
                  width: `${PLAYER_WIDTH}%`,
                  height: `${PLAYER_HEIGHT}%`,
                }}
              >
                <img
                  src="/cat-dino-runner.svg"
                  alt="Player"
                  className="w-full h-full object-contain object-bottom"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(65,66,245,0.6))' }}
                  onError={(e) => { e.target.src = 'https://placehold.co/100x100/4142F5/fff?text=Cat'; }}
                />
              </div>

              {/* Obstacles */}
              {obstacles.map(obs => (
                <div
                  key={obs.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${obs.x}%`,
                    bottom: `${GROUND_Y}%`,
                    width: `${CACTUS_WIDTH}%`,
                    height: `${CACTUS_HEIGHT}%`,
                  }}
                >
                  <img
                    src="/pixel-cactus.svg"
                    alt="Cactus"
                    className="w-full h-full object-contain object-bottom"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.4))' }}
                    onError={(e) => { e.target.src = 'https://placehold.co/50x100/ef4444/fff?text=X'; }}
                  />
                </div>
              ))}
            </>
          )}

          {/* ═══════════════════════════════════════
              GAME OVER PHASE
          ═══════════════════════════════════════ */}
          <AnimatePresence>
            {phase === 'gameover' && (
              <motion.div
                key="gameover"
                className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6 text-center bg-gray-900/90 z-50 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <motion.h2 
                  className="font-ryker font-black text-white text-4xl sm:text-5xl md:text-6xl uppercase tracking-widest drop-shadow-2xl"
                  initial={{ scale: 0.5, y: -20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                >
                  Game Over
                </motion.h2>

                <div className="flex flex-col items-center gap-2">
                  <div className="font-ryker font-black text-verde-limon text-5xl sm:text-6xl md:text-7xl drop-shadow-lg leading-none">
                    {score}
                  </div>
                  <div className="font-geomanist text-gray-400 text-sm uppercase tracking-widest">
                    Score Final
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  <motion.button
                    onClick={handleStart}
                    className="px-10 py-4 rounded-full font-geomanist font-bold text-lg uppercase tracking-widest bg-verde-limon text-gray-900 shadow-[0_0_22px_rgba(195,251,52,0.65)] hover:scale-105 active:scale-95 transition-all duration-200"
                    whileTap={{ scale: 0.95 }}
                  >
                    Volver a intentar
                  </motion.button>
                  <button
                    onClick={onReturnToStart}
                    className="text-white/60 font-geomanist text-sm hover:text-white transition-colors underline underline-offset-2"
                  >
                    Volver al Arcade
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  );
}
