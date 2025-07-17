import './App.css'
import React, { useEffect } from 'react';
import startPhaserGame from './phaser-game/Game';

function App() {
  useEffect(() => {
    const game = startPhaserGame();
    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div>
      <div id="phaser-container" style={{ width: '100vw', height: '100vh', position: 'fixed', left: 0, top: 0 }} />
    </div>
  );
}

export default App
