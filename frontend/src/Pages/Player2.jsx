import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

const Player2 = () => {
  const [gameState, setGameState] = useState('IDLE');
  const [score, setScore] = useState(0);

  const pressBuzzer = () => {
    socket.emit('press_buzzer', 2);
  };

  useEffect(() => {
    socket.on('game_state', (game_state) => setGameState(game_state));
    socket.on('results', (results) => {
      if (results && results.player2 !== undefined) {
        setScore(results.player2);
      }
    });

    return () => {
      socket.off('game_state');
      socket.off('results');
    };
  }, []);

  const isCanPress = gameState === 'PRESSBUZZER';

  return (

    <div className="flex flex-col h-screen bg-white select-none">
      
    <div>

    <div className='w-full flex justify-center text-4xl font-extrabold text-bl p-1 bg-yellow-400'>ISHOWSPEED</div>
    <div className='w-full flex justify-center  font-extrabold text-bl pb-1 bg-yellow-400'>
      IET COMMITTEE
    </div>
    </div>
      {/* Top Header / Score */}
      <div className="w-full bg-blue-500 text-white p-4 font-extrabold text-3xl flex justify-between items-center">
        <span>PLAYER BLUE</span>
        <span>{score}</span>
      </div>

      {/* Center Buzzer Button */}
      <div className="flex-grow flex items-center justify-center p-4">
        <button
          disabled={!isCanPress}
          onClick={pressBuzzer}
          className={`w-full h-full font-extrabold text-6xl text-white ${
            isCanPress
              ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isCanPress ? 'BUZZ' : 'WAIT'}
        </button>
      </div>
    </div>
  );
};

export default Player2;