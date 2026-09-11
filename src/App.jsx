import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import FloatingBackground from './components/FloatingBackground';
import IdleView from './components/IdleView';
import PresentationView from './components/PresentationView';
import QuizView from './components/QuizView';
import BugHuntView from './components/BugHuntView';

function App() {
  const [viewState, setViewState] = useState('idle'); // idle | presentation | quiz | bughunt

  return (
    <div className="relative w-screen h-screen bg-white overflow-hidden text-azul-gatuno font-camingo">
      <FloatingBackground />

      <div className="relative z-10 w-full h-full flex flex-col">
        <AnimatePresence mode="wait">
          {viewState === 'idle' && (
            <IdleView
              key="idle"
              onProceed={() => setViewState('presentation')}
              onGoToGame={() => setViewState('bughunt')}
              onGoToRedes={() => setViewState('redes')}
            />
          )}
          {viewState === 'presentation' && (
            <PresentationView key="presentation" onFinish={() => setViewState('bughunt')} />
          )}
          {viewState === 'quiz' && (
            <QuizView key="quiz" onReturnToStart={() => setViewState('idle')} />
          )}
          {viewState === 'redes' && (
            <QuizView key="redes" initialFinished={true} onReturnToStart={() => setViewState('idle')} />
          )}
          {viewState === 'bughunt' && (
            <BugHuntView key="bughunt" onReturnToStart={() => setViewState('idle')} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
