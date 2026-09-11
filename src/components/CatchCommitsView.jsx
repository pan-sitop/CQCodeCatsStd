import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────────
const STARTING_LIVES = 3;
const POINTS_PER_COMMIT = 50;
const ITEM_TYPES = {
  COMMIT: 'commit',
  BUG: 'bug',
};

// ─── Utility ──────────────────────────────────────────────────────────────────
function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

// ─── CSS Components for Items ─────────────────────────────────────────────────
function CommitItem({ fading }) {
  return (
    <div className={`relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-green-400 bg-green-900/80 shadow-[0_0_15px_rgba(74,222,128,0.6)] ${fading ? 'opacity-0 scale-150 transition-all duration-300' : ''}`}>
      <span className="font-ryker font-black text-green-300 text-xs sm:text-sm tracking-wider">PR</span>
    </div>
  );
}

function BugItem({ fading }) {
  return (
    <div className={`relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded bg-red-600/90 border border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.7)] ${fading ? 'opacity-0 scale-50 transition-all duration-300' : ''}`}>
      <span className="font-geomanist font-bold text-white text-[10px] sm:text-xs tracking-tighter">404</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CatchCommitsView({ onReturnToStart }) {
  const [phase, setPhase] = useState('menu'); // menu | playing | gameover
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [items, setItems] = useState([]);
  
  // Game refs for RAF loop
  const gameAreaRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const itemsRef = useRef([]);
  const phaseRef = useRef('menu');
  const scoreRef = useRef(0);
  const livesRef = useRef(STARTING_LIVES);
  
  // Player state
  const playerXRef = useRef(50); // % from left
  const [playerX, setPlayerX] = useState(50);
  
  // Input tracking
  const keysRef = useRef({ left: false, right: false });
  const touchXRef = useRef(null);
  
  // Difficulty tracking
  const spawnTimerRef = useRef(0);
  const timeSinceLastSpawnRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { livesRef.current = lives; }, [lives]);

  // ── Keyboard Controls ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') keysRef.current.left = true;
      if (e.key === 'ArrowRight') keysRef.current.right = true;
    };
    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft') keysRef.current.left = false;
      if (e.key === 'ArrowRight') keysRef.current.right = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ── Touch Controls ────────────────────────────────────────────────────────
  const handleTouchStart = (e) => {
    if (phaseRef.current !== 'playing') return;
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches[0].clientX;
    touchXRef.current = ((clientX - rect.left) / rect.width) * 100;
  };
  
  const handleTouchMove = (e) => {
    if (phaseRef.current !== 'playing') return;
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches[0].clientX;
    touchXRef.current = ((clientX - rect.left) / rect.width) * 100;
  };

  const handleTouchEnd = () => {
    touchXRef.current = null;
  };

  // ── Game Loop ─────────────────────────────────────────────────────────────
  const tick = useCallback((timestamp) => {
    if (phaseRef.current !== 'playing') return;

    const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
    lastTimeRef.current = timestamp;

    // 1. Move Player
    let currentX = playerXRef.current;
    
    // Keyboard movement
    const PLAYER_SPEED = 0.05 * dt;
    if (keysRef.current.left) currentX -= PLAYER_SPEED;
    if (keysRef.current.right) currentX += PLAYER_SPEED;
    
    // Touch movement (seek touch target)
    if (touchXRef.current !== null) {
      const diff = touchXRef.current - currentX;
      if (Math.abs(diff) > 1) {
        currentX += diff * 0.15; // smooth seeking
      }
    }
    
    // Clamp player X
    currentX = Math.max(8, Math.min(92, currentX));
    playerXRef.current = currentX;
    setPlayerX(currentX);

    // 2. Difficulty Scaling
    const level = Math.floor(scoreRef.current / 300) + 1;
    const baseFallSpeed = 0.02 + (level * 0.005);
    const spawnInterval = Math.max(400, 1500 - (level * 150)); // ms between spawns

    // 3. Spawn Items
    timeSinceLastSpawnRef.current += dt;
    if (timeSinceLastSpawnRef.current >= spawnInterval) {
      timeSinceLastSpawnRef.current = 0;
      const isBug = Math.random() < 0.3; // 30% chance of bug
      const newItem = {
        id: Date.now() + Math.random(),
        type: isBug ? ITEM_TYPES.BUG : ITEM_TYPES.COMMIT,
        x: randomBetween(10, 90),
        y: -10, // Start just above screen
        speed: baseFallSpeed * randomBetween(0.8, 1.2),
        collected: false
      };
      itemsRef.current.push(newItem);
    }

    // 4. Update Items & Collisions
    let hitBug = false;
    itemsRef.current = itemsRef.current.map(item => {
      if (item.collected) return item;

      const newY = item.y + (item.speed * dt);
      
      // Hit detection with player (basket is at ~y: 85%)
      // Player hitbox approx: x ± 8%, y between 80% and 95%
      const inHitboxY = newY > 80 && newY < 95;
      const inHitboxX = Math.abs(item.x - playerXRef.current) < 8;

      if (inHitboxY && inHitboxX) {
        if (item.type === ITEM_TYPES.COMMIT) {
          setScore(s => s + POINTS_PER_COMMIT);
        } else {
          hitBug = true;
        }
        return { ...item, y: newY, collected: true };
      }

      return { ...item, y: newY };
    }).filter(item => {
      // Remove items that fell off screen or have been collected for a while (handled via css animation if we kept them, but let's just remove them to keep DOM clean).
      // Actually, we'll keep collected ones for a split second to show animation, or just remove immediately.
      // Let's remove immediately for simplicity, the score updates.
      if (item.collected) return false;
      if (item.y > 110) return false;
      return true;
    });

    if (hitBug) {
      setLives(l => {
        const newLives = l - 1;
        if (newLives <= 0) {
          setTimeout(() => setPhase('gameover'), 100);
        }
        return newLives;
      });
    }

    setItems([...itemsRef.current]);

    if (phaseRef.current === 'playing') {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

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

  // ── Game Flow Handlers ────────────────────────────────────────────────────
  const handleStart = () => {
    setScore(0);
    setLives(STARTING_LIVES);
    setItems([]);
    itemsRef.current = [];
    timeSinceLastSpawnRef.current = 0;
    setPhase('playing');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="w-full flex-grow min-h-screen flex flex-col items-center justify-center p-3 md:p-4 pointer-events-auto overflow-hidden bg-white/20 backdrop-blur-sm"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative w-full max-w-6xl aspect-[4/5] sm:aspect-video max-h-[92vh]">
        <div 
          ref={gameAreaRef}
          className="absolute inset-0 w-full h-full overflow-hidden rounded-3xl bg-gray-900 shadow-[0_0_80px_rgba(0,0,0,0.25)] border-4 border-azul-gatuno touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={(e) => {
            const rect = gameAreaRef.current.getBoundingClientRect();
            touchXRef.current = ((e.clientX - rect.left) / rect.width) * 100;
          }}
          onMouseMove={(e) => {
            if (e.buttons === 1) { // Left click held
              const rect = gameAreaRef.current.getBoundingClientRect();
              touchXRef.current = ((e.clientX - rect.left) / rect.width) * 100;
            }
          }}
          onMouseUp={() => touchXRef.current = null}
          onMouseLeave={() => touchXRef.current = null}
        >
          {/* Background Decor */}
          <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
            <h1 className="font-ryker font-black text-[20vw] text-white whitespace-nowrap">CODE CATS</h1>
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
                  <h1 className="font-ryker font-black text-verde-limon text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none drop-shadow-lg uppercase">
                    Catch the
                  </h1>
                  <h2 className="font-ryker font-black text-white text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight uppercase mt-2">
                    Commits
                  </h2>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <CommitItem />
                    <span className="font-geomanist text-white text-xs uppercase tracking-widest">+ Puntos</span>
                  </div>
                  <div className="w-px h-12 bg-gray-600"></div>
                  <div className="flex flex-col items-center gap-2">
                    <BugItem />
                    <span className="font-geomanist text-red-400 text-xs uppercase tracking-widest">- 1 Vida</span>
                  </div>
                </div>

                <p className="font-geomanist text-gray-300 text-sm sm:text-base max-w-md">
                  Muévete a los lados para atrapar los Pull Requests (PR). Evita los errores 404 o perderás vidas. 
                  ¡Se volverá más rápido conforme sumes puntos!
                </p>

                <div className="flex flex-col gap-3 mt-4">
                  <motion.button
                    onClick={handleStart}
                    className="px-10 py-4 rounded-full font-geomanist font-bold text-lg uppercase tracking-widest bg-azul-gatuno text-white shadow-[0_0_22px_rgba(65,66,245,0.65)] hover:shadow-[0_0_36px_rgba(65,66,245,0.9)] hover:scale-105 active:scale-95 transition-all duration-200"
                    whileTap={{ scale: 0.95 }}
                  >
                    Comenzar Partida
                  </motion.button>
                  <button
                    onClick={onReturnToStart}
                    className="text-white/40 font-geomanist text-sm hover:text-white transition-colors underline underline-offset-2"
                  >
                    Volver al Arcade Hub
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
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="font-ryker font-black text-verde-limon text-2xl sm:text-3xl drop-shadow-md">
                    {score}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[...Array(STARTING_LIVES)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-red-500 bg-red-500/20"
                      animate={{
                        backgroundColor: i < lives ? '#ef4444' : 'transparent',
                        scale: i === lives - 1 ? [1, 1.2, 1] : 1
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>
              </div>

              {/* Falling Items */}
              {items.map(item => (
                <div
                  key={item.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {item.type === ITEM_TYPES.COMMIT ? <CommitItem /> : <BugItem />}
                </div>
              ))}

              {/* Player (Catcher Box) */}
              <div
                className="absolute bottom-[5%] pointer-events-none transition-transform"
                style={{
                  left: `${playerX}%`,
                  transform: 'translate(-50%, 0)'
                }}
              >
                <motion.img
                  src="/cat-catcher-box.svg"
                  alt="Catcher Box"
                  className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(65,66,245,0.8))' }}
                  onError={(e) => {
                    // Fallback to a simple CSS box if SVG is missing
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                {/* Fallback Box */}
                <div className="hidden w-24 h-24 sm:w-32 sm:h-32 flex-col items-center justify-end pb-2 bg-azul-gatuno/40 border-b-8 border-l-4 border-r-4 border-azul-gatuno rounded-b-xl shadow-[0_0_15px_rgba(65,66,245,0.6)]">
                  <div className="w-12 h-12 bg-white rounded-full mb-1 flex items-center justify-center">
                     <span className="text-azul-gatuno font-ryker text-2xl font-black">?</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════
              GAME OVER PHASE
          ═══════════════════════════════════════ */}
          <AnimatePresence>
            {phase === 'gameover' && (
              <motion.div
                key="gameover"
                className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6 text-center bg-red-900/90 z-50 backdrop-blur-md"
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

                <div className="font-ryker font-black text-verde-limon text-5xl sm:text-6xl md:text-7xl drop-shadow-lg">
                  {score}
                </div>
                <div className="font-geomanist text-red-200 text-lg uppercase tracking-widest -mt-4">
                  Puntos
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  <motion.button
                    onClick={handleStart}
                    className="px-10 py-4 rounded-full font-geomanist font-bold text-lg uppercase tracking-widest bg-white text-red-900 shadow-[0_0_22px_rgba(255,255,255,0.65)] hover:scale-105 active:scale-95 transition-all duration-200"
                    whileTap={{ scale: 0.95 }}
                  >
                    Reintentar
                  </motion.button>
                  <button
                    onClick={onReturnToStart}
                    className="text-white/60 font-geomanist text-sm hover:text-white transition-colors underline underline-offset-2"
                  >
                    Volver al Arcade Hub
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
