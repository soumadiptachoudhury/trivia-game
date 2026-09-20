import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';




// 1. Setup __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== AUDIO WORKER ====================

const audioWorkerPath = path.join(__dirname, 'audio-worker.ps1');

const audioWorker = spawn(
  'powershell.exe',
  [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    audioWorkerPath
  ],
  {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  }
);

audioWorker.stdout.on('data', (data) => {
  console.log(`[AUDIO] ${data.toString().trim()}`);
});

audioWorker.stderr.on('data', (data) => {
  console.error(`[AUDIO ERROR] ${data.toString().trim()}`);
});

audioWorker.on('error', (error) => {
  console.error('Could not start audio worker:', error);
});

audioWorker.on('close', (code) => {
  console.log(`Audio worker exited with code ${code}`);
});

function playSound(name) {
  if (!audioWorker.stdin.writable) {
    console.error('Audio worker is not available');
    return;
  }

  audioWorker.stdin.write(`${name}\n`);
}

const app = express();
app.use(cors());

// 👉 CRITICAL: This line makes your local 'images' folder publicly accessible via HTTP
app.use('/images', express.static(path.join(__dirname, './images')));

// 2. Point to your images folder relative to server.js
const imagesDir = path.join(__dirname, './images');
// 3. Read all files in that directory
let imageFiles = [];
try {
  imageFiles = fs.readdirSync(imagesDir);
  console.log('Found images:', imageFiles);
} catch (error) {
  console.error('Could not find the images directory:', error);
}

export const gameStates = Object.freeze({
  IDLE: 'IDLE',
  COUNTDOWN: 'COUNTDOWN',
  PRESSBUZZER: 'PRESSBUZZER',
  ANSWERREVIEW: 'ANSWERREVIEW',
  ANSWERDISPLAY: 'ANSWERDISPLAY',
  OTHERSANSWERREVIEW: 'OTHERSANSWERREVIEW',
  OTHERANSWERDISPLAY: 'OTHERANSWERDISPLAY',
  RESULTS: 'RESULTS'
});

let activeTimer = null;

let scores = [0, 0];
let currentImgSrc = "";
let round = 0;
let totalRounds = 5;
let pointsPerRound = 10;
let countdown = 3;
let currentState = gameStates.IDLE;
let answerDisplayTime = 1;
let selectedImages = [];
let nextRoundMode = 'manual'
let nextRoundWait = 2
let timeout = 10
let buzzerTimeout = 10
let currentPresser = true
let currentPresserCount = 0
let cancelCurrentCountdown = false;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});



async function runNTimes(totalIterations, timerType) {
  cancelCurrentCountdown = false;
  for (let i = totalIterations; i >= 0; i--) {
    if (cancelCurrentCountdown) break;
    console.log(`Tick: ${i}`);
    io.emit(timerType, i);
    
if (timerType === 'countdown' && i > 0) {
  playSound('tick');
}

    await wait(1000);
  }
}

const clearCurrentTimer = () => {
  if (activeTimer) {
    io.emit('stop_timer');
    clearTimeout(activeTimer);
    activeTimer = null;
  }
};


const wait = (ms) => new Promise((resolve) => global.setTimeout(resolve, ms));

const handleAnswerDisplay = async (ans) => {
  console.log(`set mode to answerdisplay with ans: ${ans}`);
  
  if (answerDisplayTime <= 0) {
    clearCurrentTimer();
    activeTimer = null;
    if (ans === 'CORRECT' || ans === 'EXPIRE') {
      handleNextRound();
      return;
    }
  }

  currentState = gameStates.ANSWERDISPLAY;
  clearCurrentTimer(); // Clear any existing timer first
  
  // 🔥 CRITICAL FIX: Emit start_timer for CORRECT and WRONG as well!
  io.emit('start_timer', { duration: answerDisplayTime });

  if (ans === 'EXPIRE') {
    playSound('expired');
    io.emit('answer', 'EXPIRE');
    activeTimer = setTimeout(async () => {
      handleNextRound();
    }, answerDisplayTime * 1000);

  } else if (ans === 'CORRECT') {
    playSound('correct');
    io.emit('answer', 'CORRECT');
    activeTimer = setTimeout(async () => {
      handleNextRound();
    }, answerDisplayTime * 1000);

  } else if (ans === 'WRONG') {
    playSound('wrong');
    io.emit('answer', 'WRONG');
    activeTimer = setTimeout(async () => {
      if (currentPresserCount === 0) {
        currentPresserCount += 1;
        currentPresser = !currentPresser;
        currentState = gameStates.ANSWERREVIEW;
        handleAnswerReview(); // Starts the review phase for the other player
      } else {
        handleNextRound();
      }
    }, answerDisplayTime * 1000);
  }
};

const handleNextRound = () => {
  if (round < totalRounds) {
    console.log(`moving to next round`);
    round += 1;
    handleRoundStart();
  } else {
    console.log(`ending game and trying to display result`);
    handleResultDisplay();
  }
};

const handleResultDisplay = () => {
  console.log(`set mode to display results`)
  currentState = gameStates.RESULTS
  console.log(`clearing any active timers`)
  clearCurrentTimer()
  activeTimer = null
  console.log(`sending results`)
  io.emit('results', {
    'player1': scores[0],
    'player2': scores[1]
  })
}

const handleTimerExpire = async () => {
  console.log('clearing any active timer')
  clearCurrentTimer()
  activeTimer = null
  await handleAnswerDisplay('EXPIRE')
  if (currentPresserCount === 0) {
    currentPresserCount += 1;
    console.log(`incrementing presser count ${currentPresserCount}`)
    console.log(`changing current presser ${currentPresser}`)
    currentPresser = !currentPresser;
    console.log(`changed current presser ${currentPresser}`)
    currentState = gameStates.ANSWERREVIEW
    console.log(`starting timer to review answer for other guesser`)
    activeTimer = setTimeout(() => {
      console.log(`timer to review answer ex`)
      handleAnswerReview()
    }, answerDisplayTime * 1000)
  } else {
    console.log(`trying to initiate next round`)
    handleNextRound()
  }
}

const handlePressBuzzer = async () => {
  console.log('set game state to PRESSBUZZER');
  currentState = gameStates.PRESSBUZZER;
  io.emit('start_timer', { duration: timeout });
  currentImgSrc = selectedImages[round - 1]; // Make sure index matches 1-based round
  io.emit("image_src", currentImgSrc);
  
  activeTimer = setTimeout(async () => {
    console.log('timer to press buzzer expired');
    clearCurrentTimer();
    activeTimer = null;

    if (answerDisplayTime <= 0) {
      // Skip expired display screen completely and jump to next round
      handleNextRound();
    } else {
      await handleAnswerDisplay('EXPIRE');
    }
  }, timeout * 1000); // Note: use timeout here instead of buzzerTimeout for the main buzzer phase!
};



const handleAnswerReview = async () => {
  console.log(`putting mode as answerreview and starting timer to give answer`)
  currentState = gameStates.ANSWERREVIEW
  io.emit('start_timer', { duration: buzzerTimeout });
  clearCurrentTimer()
  activeTimer = setTimeout(async () => {
    console.log(`timer to give answer expired`)
    console.log(`sending answerdisplay with expire`)
    await handleAnswerDisplay('EXPIRE')
  }, buzzerTimeout * 1000)
}

const handleRoundStart = async () => {
  if (currentState === gameStates.IDLE) return; // Prevent starting if reset
  console.log('setting game state to COUNTDOWN');
  currentState = gameStates.COUNTDOWN;
  currentPresser = null;
  currentPresserCount = 0;
  
  await runNTimes(countdown, 'countdown');
  if (cancelCurrentCountdown || currentState === gameStates.IDLE) return;

  io.emit('round', round);
  console.log('Countdown finished');
  handlePressBuzzer();
};

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

/*   socket.emit('start_timer',{
    duration : 30
  }) */
  // 1. Listen for client disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User Disconnected [${reason}]: ${socket.id}`);
  });

  const gameLoopInterval = setInterval(() => {
  io.emit('game_state', currentState);
  io.emit('results', {
      'player1': scores[0],
      'player2': scores[1]
    })
  if(currentPresser===true){
    io.emit('set_presser', 'ORANGE')
  }else if (currentPresser===false){
    io.emit('set_presser', 'BLUE')
  }else {
    io.emit('set_presser', null)
  }

}, 250);

  // Clear interval if socket drops so it doesn't leak memory
  socket.on('disconnect', () => {
    clearInterval(gameLoopInterval);
  });

socket.on('new_game', async () => {
    console.log(`user clicked new game (reset)`);
    cancelCurrentCountdown = true; // Stop any active countdown loops
    currentState = gameStates.IDLE;
    round = 1; // Reset to 1 instead of 0
    scores = [0, 0];
    currentPresser = null;
    currentPresserCount = 0;
    clearCurrentTimer();
    activeTimer = null;

    io.emit('game_state', gameStates.IDLE);
    io.emit('round', round);
    io.emit('results', {
      'player1': scores[0],
      'player2': scores[1]
    });
    io.emit('stop_timer');
    io.emit('countdown', 'waiting'); // Show waiting instead of stale numbers
  });

socket.on('start_game', async () => {
    if (currentState === gameStates.IDLE) {
      console.log("trying to start game");
      selectedImages = [...imageFiles]
        .sort(() => Math.random() - 0.5)
        .slice(0, totalRounds);
      round = 1; 
      currentState = gameStates.PRESSBUZZER// Start at round 1 explicitly
      handleRoundStart();
    }
  });

  socket.on('end_game', async () => {
    console.log(`user clicked end game`)
    currentState = gameStates.RESULTS
    round = totalRounds
    io.emit('game_state', gameStates.RESULTS)
    clearCurrentTimer()
    activeTimer = null
    io.emit('results', {
      'player1': scores[0],
      'player2': scores[1]
    })
  })

  socket.on('press_buzzer', async (playerid) => {
    if (currentState === gameStates.PRESSBUZZER) {
      if (currentPresser === null) {
        playSound('buzzer');

        console.log(`setting mode to answerreview and buzzer pressed by ${playerid}`)
        
        currentState = gameStates.ANSWERREVIEW
        if (playerid === 1) {
          currentPresser = true
          io.emit('set_presser', 'ORANGE')
        } else {
          currentPresser = false
        }
        console.log(`clearing current timer `)
        clearCurrentTimer()
        console.log(`starting answer review`)
        handleAnswerReview()
      }
    }
  })

  socket.on('update_settings', (settings)=>{
    totalRounds = settings.numRounds
    pointsPerRound = settings.pointsPerRound
    countdown = settings.countdownTime
    timeout= settings.timeoutTime
    buzzerTimeout = settings.buzzerTimeoutTime
    answerDisplayTime = settings.answerDisplayTime
  })

  socket.on('answer_review', async (ans) => {
    if (currentState === gameStates.ANSWERREVIEW) {
      console.log(`recieved an answer review in valid state`)
      if (ans) {
        console.log(`answer is correct and is being sent to answerdisplay with correct`)
        handleAnswerDisplay('CORRECT')
        if (currentPresser) {
          scores[0] += pointsPerRound
        }else {
          scores[1] += pointsPerRound
        }
      } else {
        console.log(`answer is incorrect and is being sent to answerdissplay with wrong`)
        handleAnswerDisplay('WRONG')
      }
    }
  })

});
server.listen(5000, () => {
  console.log('SERVER RUNNING ON http://localhost:5000');
});