import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import FloatingBackground from './components/FloatingBackground';
import IdleView from './components/IdleView';
import PresentationView from './components/PresentationView';
import QuizView from './components/QuizView';
import BugHuntView from './components/BugHuntView';
import GameHubView from './components/GameHubView';
import CatchCommitsView from './components/CatchCommitsView';
import CodeRunnerView from './components/CodeRunnerView';

function App() {
  const [viewState, setViewState] = useState('idle'); // idle | presentation | quiz | bughunt | gamehub | catchcommits | coderunner | redes

  return (
    <div className="relative w-screen h-screen bg-white overflow-hidden text-azul-gatuno font-camingo">
      <FloatingBackground />

      <div className="relative z-10 w-full h-full flex flex-col">
        <AnimatePresence mode="wait">
          {viewState === 'idle' && (
            <IdleView
              key="idle"
              onProceed={() => setViewState('presentation')}
              onGoToGame={() => setViewState('gamehub')}
              onGoToRedes={() => setViewState('redes')}
            />
          )}
          {viewState === 'presentation' && (
            <PresentationView key="presentation" onFinish={() => setViewState('gamehub')} />
          )}
          {viewState === 'quiz' && (
            <QuizView key="quiz" onReturnToStart={() => setViewState('idle')} />
          )}
          {viewState === 'redes' && (
            <QuizView key="redes" initialFinished={true} onReturnToStart={() => setViewState('idle')} />
          )}
          {viewState === 'gamehub' && (
            <GameHubView 
              key="gamehub" 
              onSelectGame={(gameId) => setViewState(gameId)}
              onReturnToStart={() => setViewState('idle')} 
            />
          )}
          {viewState === 'bughunt' && (
            <BugHuntView key="bughunt" onReturnToStart={() => setViewState('gamehub')} />
          )}
          {viewState === 'catchcommits' && (
            <CatchCommitsView key="catchcommits" onReturnToStart={() => setViewState('gamehub')} />
          )}
          {viewState === 'coderunner' && (
            <CodeRunnerView key="coderunner" onReturnToStart={() => setViewState('gamehub')} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
