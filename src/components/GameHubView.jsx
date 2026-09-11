import React from 'react';
import { motion } from 'framer-motion';

const GAMES = [
  {
    id: 'bughunt',
    title: 'Bug Hunt',
    description: 'Caza los bugs escurridizos antes de que escapen. Pon a prueba tus reflejos.',
    color: 'bg-azul-gatuno text-white border-verde-limon',
    available: true,
  },
  {
    id: 'catchcommits',
    title: 'Catch the Commits',
    description: 'Atrapa los Pull Requests y evita los errores 404 en esta frenética lluvia de código.',
    color: 'bg-white text-azul-gatuno border-azul-gatuno',
    available: true,
  },
  {
    id: 'coderunner',
    title: 'Code Runner',
    description: 'Esquiva obstáculos y compila tu código mientras corres por el servidor.',
    color: 'bg-gray-200 text-gray-400 border-gray-300',
    available: false,
  }
];

export default function GameHubView({ onSelectGame, onReturnToStart }) {
  return (
    <motion.div
      className="w-full flex-grow min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 pointer-events-auto overflow-hidden bg-white/50 backdrop-blur-sm"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 border-4 border-azul-gatuno">
        
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="font-ryker font-black text-4xl sm:text-5xl text-azul-gatuno uppercase tracking-tight">
              Arcade Hub
            </h1>
            <p className="font-geomanist text-gray-500 text-lg mt-1">
              Selecciona un minijuego para continuar
            </p>
          </div>
          <button
            onClick={onReturnToStart}
            className="px-5 py-2.5 rounded-full font-geomanist font-bold text-sm uppercase tracking-widest bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Volver
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {GAMES.map((game, idx) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15, type: 'spring', stiffness: 200 }}
              className={`relative flex flex-col justify-between p-6 rounded-2xl border-4 ${game.color} ${game.available ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl transition-all duration-300' : 'opacity-70 cursor-not-allowed'}`}
              onClick={() => game.available && onSelectGame(game.id)}
            >
              {!game.available && (
                <div className="absolute top-3 right-3 bg-gray-500 text-white font-geomanist text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">
                  Próximamente
                </div>
              )}
              
              <div>
                <h2 className="font-ryker font-black text-2xl sm:text-3xl uppercase leading-none mb-3">
                  {game.title}
                </h2>
                <p className="font-geomanist text-sm sm:text-base leading-snug opacity-90">
                  {game.description}
                </p>
              </div>

              {game.available && (
                <div className="mt-6 flex items-center gap-2 font-geomanist font-bold uppercase tracking-widest text-sm">
                  Jugar <span className="text-xl leading-none">→</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

      </div>
    </motion.div>
  );
}
