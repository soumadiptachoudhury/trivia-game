import React, { useState, useEffect } from 'react'
import { socket } from '../socket'


const CircularTimer = ({ gameState }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    let startTime = null;
    let animationFrameId = null;
    let totalDuration = 0;

    const handleStartTimer = ({ duration: dur }) => {
      totalDuration = dur;
      setDuration(dur);
      setTimeLeft(dur);
      startTime = performance.now();

      const updateTimer = (currentTime) => {
        const elapsed = (currentTime - startTime) / 1000;
        const remaining = Math.max(0, totalDuration - elapsed);
        setTimeLeft(remaining);

        if (remaining > 0) {
          animationFrameId = requestAnimationFrame(updateTimer);
        }
      };

      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    const handleStopTimer = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      setTimeLeft(null);
      setDuration(null);
    };

    socket.on('start_timer', handleStartTimer);
    socket.on('stop_timer', handleStopTimer);

    return () => {
      socket.off('start_timer', handleStartTimer);
      socket.off('stop_timer', handleStopTimer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Hide instantly if no active timer, duration is invalid, or time has hit 0
  if (timeLeft === null || duration === null || duration <= 0 || timeLeft <= 0) return null;

  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / duration;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = (timeLeft <= 3)&&(gameState === 'PRESSBUZZER' || gameState === 'ANSWERREVIEW');

  return (
   <div className="flex flex-col items-center justify-center ">
  {/* Using w-32 h-32 (standard Tailwind size) or keeping your custom sizing */}
  <div className="relative flex items-center justify-center w-32 h-32">
    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
      {/* Background Track Circle */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        stroke="currentColor"
        strokeWidth="10"
        className="text-gray-300"
        fill="transparent"
      />
      {/* Progress Animated Circle */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        stroke="currentColor"
        strokeWidth="10"
        className={isUrgent ? 'text-red-600' : 'text-blue-600'}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        
      />
    </svg>
    <span className={`absolute text-3xl font-extrabold ${isUrgent ? 'text-red-600 animate-pulse' : 'text-black'}`}>
      {Math.ceil(timeLeft)}
    </span>
  </div>
</div>
  );
};
const Admin = () => {

  const [gameState, setGameState] = useState('ANSWERREVIEW');
  const [errorMessage, setErrorMessage] = useState('');
  const [imageSrc, setImageSrc] = useState(`http://${window.location.hostname}:5000/images/horse-dithered.png`)
  const [countDown, setCountDown] = useState('waiting')
  const [scores, setScores] = useState([0, 0])
  const [imageName, setImageName] = useState('horsey')
  const [answer, setAnswer] = useState('EXPIRED')
  const [presser, setPresser] = useState('BLUE')
  const [round, setRound] = useState(0)

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    numRounds: 5,
    pointsPerRound: 10,
    countdownTime: 3,
    timeoutTime: 10,
    buzzerTimeoutTime: 10,
    answerDisplayTime: 5,
  });

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: Number(value) }));
  };

  const saveSettings = () => {
    console.log("Saving settings:", settings);
    socket.emit('update_settings', settings); // Sends to backend if needed
    setShowSettings(false);
  };

  const startGame = () => {
    console.log("starting game")
    socket.emit('start_game', 'start_game')
  }

  function getFileNameWithoutExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename;
    return filename.substring(0, lastDotIndex);
  }

  const endGame = () => {
    console.log("ending game")
    socket.emit('end_game', 'end_game')
  }

 
const newGame = () => {
  console.log("resetting/starting new game");
  socket.emit('new_game', 'new_game');
};

  const correctAnswer = () => {
    socket.emit('answer_review', true)
  }

  const incorrectAnswer = () => {
    socket.emit('answer_review', false)
  }

  const next = () => {
    socket.emit('next', 'next')
  }



  useEffect(() => {
    socket.on('game_state', (game_state) => setGameState(game_state))
    socket.on('round', (round) => setRound(round))


    socket.on('image_src', (image) => {
      setImageSrc(`http://${window.location.hostname}:5000/images/${image}`)
      setImageName(getFileNameWithoutExtension(image))
    })
    socket.on('countdown', (countdown) => setCountDown(countdown))
    socket.on('answer', (answer) => setAnswer(answer))
    socket.on('results', (results) => setScores([results.player1, results.player2]))
    socket.on('set_presser', (presser) => setPresser(presser))
    socket.on('state_changed', (newState) => {
      setGameState(newState);
      setErrorMessage('');
    });
    socket.on('error_message', (msg) => setErrorMessage(msg));

    return () => {
      socket.off('game_state')
      socket.off('round')

      socket.off('image_src')
      socket.off('countdown')
      socket.off('answer')
      socket.off('results')
      socket.off('set_presser')
      socket.off('state_changed')
      socket.off('error_message')
    };
  }, []);

  return (
    <div className=''>
    <div>

    <div className='w-full flex justify-center text-4xl font-extrabold text-bl p-1  bg-yellow-400'>ISHOWSPEED</div>
    <div className='w-full flex justify-center  font-extrabold text-bl pb-1 bg-yellow-400'>
      IET COMMITTEE
    </div>
    </div>


    <div className='adminpage flex justify-evenly mt-2 w-full '>
      {/* Inside your Admin return statement */}

{/* orange */}
      <div className='orange-score flex flex-col  items-center w-full'>
          <div className='round-details w-90 flex justify-center text-6xl p-4 items-center font-extrabold text-black'>
              {gameState === 'IDLE' 
                ? 'WAITING' 
                : gameState === 'RESULTS' 
                ? 'RESULTS' 
                : `Round ${round}`}
            </div>

              <div className='orange-score w-90 flex flex-col p-4 items-center bg-orange-500 font-extrabold text-4xl text-white'> 
              <div className='text-center'>player orange</div>
              <div className='text-9xl bg-orange-600 w-full flex justify-center mx-4 mt-4 p-2'>{scores[0]}</div>
            </div>
      </div>


<div className='left-container'>

  <div className='image/countdown flex relative items-center justify-center w-160 h-119 border-8 border-black bg-gray-100'>
    {!['PRESSBUZZER', 'ANSWERREVIEW', 'ANSWERDISPLAY'].includes(gameState) && (
      <div className={`countdown font-extrabold text-black ${Number.isInteger(countDown) ? 'text-[300px]' : 'text-8xl'}`} >
        {countDown}
      </div>
    )}
    {['PRESSBUZZER', 'ANSWERREVIEW', 'ANSWERDISPLAY'].includes(gameState) && (
      <img src={imageSrc} className='w-115' alt="game asset" />
    )}

    {gameState === 'ANSWERREVIEW' && presser && (
      <div className={`absolute inset-0 m-auto w-156 h-max ${presser === 'ORANGE' ? 'bg-orange-500' : 'bg-blue-500'} flex justify-center text-4xl text-center font-extrabold text-white py-4`}>
        {presser === 'ORANGE' ? 'Player Orange Answer' : 'Player Blue Answer'}
      </div>
    )}

    {gameState === 'ANSWERDISPLAY' && answer && (
  <div className={`absolute inset-0 m-auto w-156 h-max ${answer === 'CORRECT' ? 'bg-green-500' : answer === 'WRONG' ? 'bg-red-500' : 'bg-gray-500'} flex justify-center text-4xl text-center font-extrabold text-white py-4`}>
    {answer === 'CORRECT' ? 'CORRECT' : answer === 'WRONG' ? 'WRONG' : 'TIMES UP'}
  </div>
)}
  </div>

  <div className='w-full flex justify-center'>
    {['PRESSBUZZER', 'ANSWERREVIEW', 'ANSWERDISPLAY'].includes(gameState) && (
      <div className='text-3xl font-bold'>
        {imageName}
      </div>
    )}
  </div>

  {/* ⏱️ ADD CIRCULAR TIMER HERE */}
  <CircularTimer gameState={gameState}/>

</div>

{/* blue score */}
<div className='blue-score flex flex-col items-center w-full '>
  <div className='round-details w-90 p-4 flex justify-center text-6xl items-center font-extrabold text-black'>
              {gameState === 'IDLE' 
                ? 'WAITING' 
                : gameState === 'RESULTS' 
                ? 'RESULTS' 
                : `Round ${round}`}
            </div>
            <div className='blue-score w-90 flex flex-col p-4 items-center bg-blue-500 font-extrabold text-5xl text-white'> 
              <div className='text-center'>Player Blue</div>
              <div className='text-9xl bg-blue-600 w-full flex justify-center m-2 mt-4 p-2'>{scores[1]}</div>
            </div>
</div>
     

        


    </div>
    </div>
  )
}

export default Admin