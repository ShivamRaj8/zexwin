import { useState, useEffect, useRef } from 'react';
import { Info, Wallet, Crown, Link as LinkIcon, CalendarCheck, User, Users, ChevronLeft, CreditCard, Bitcoin, Share2, CheckCircle, Settings, LogOut, Volume2, VolumeX, Bell, Zap, Bomb, Dices, Diamond } from 'lucide-react';
import './App.css';

const BOT_NAMES = ['Alex99', 'HackerXx', 'CryptoKing', 'JohnD', 'Sniper007', 'WhaleBot', 'ProTrader', 'Satoshi'];

class AudioController {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.enabled = true;
    this.lastTick = 0;
  }
  playTick() {
    if(!this.enabled) return;
    try {
      const t = this.ctx.currentTime;
      if(t - this.lastTick < 0.1) return; 
      this.lastTick = t;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
      gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.05);
    } catch(e) {}
  }
  playCrash() {
    if(!this.enabled) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.5);
    } catch(e) {}
  }
  playCashout() {
    if(!this.enabled) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(400, t); osc.frequency.setValueAtTime(600, t + 0.1);
      gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0, t + 0.3);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.3);
    } catch(e) {}
  }
}

function App() {
  const [balance, setBalance] = useState(15000.00); // Standalone prototype starting balance
  const [currentRoute, setCurrentRoute] = useState('lobby'); 
  const [activeTab, setActiveTab] = useState('home'); 
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef(null);
  
  const initAudio = () => {
    try {
      if(!audioRef.current) {
        audioRef.current = new AudioController();
        audioRef.current.enabled = soundEnabled;
      }
    } catch (e) {
      console.error("Audio init failed", e);
    }
  };

  useEffect(() => { if(audioRef.current) audioRef.current.enabled = soundEnabled; }, [soundEnabled]);

  // ================= CRASH GAME ENGINE (FRONTEND ONLY) =================
  const [betAmount, setBetAmount] = useState(10);
  const [multiplier, setMultiplier] = useState(1.00);
  const [gameState, setGameState] = useState('WAITING'); 
  const [isBetPlaced, setIsBetPlaced] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [history, setHistory] = useState([1.52, 3.40, 1.01, 10.45, 2.05]);
  const [autoCashOut, setAutoCashOut] = useState(false);
  const [autoTarget, setAutoTarget] = useState(1.10);
  const [countdown, setCountdown] = useState(5.0);
  const [bots, setBots] = useState([]);
  const [parachutes, setParachutes] = useState([]);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [crashPoint, setCrashPoint] = useState(0);
  const startTimeRef = useRef(0);
  const gameLoopRef = useRef(null);

  useEffect(() => {
    if (gameState === 'WAITING') {
      let currentCount = 5.0;
      gameLoopRef.current = setInterval(() => {
        currentCount -= 0.1;
        setCountdown(Math.max(0, currentCount));
        if (currentCount <= 0) {
          clearInterval(gameLoopRef.current);
          startCrashFlight();
        }
      }, 100);
    }
    return () => clearInterval(gameLoopRef.current);
  }, [gameState]);

  const startCrashFlight = () => {
    const r = Math.random();
    const newCrashPoint = r < 0.03 ? 1.00 : Math.max(1.00, 0.99 / (1 - r));
    setCrashPoint(newCrashPoint);
    setGameState('PLAYING');
    startTimeRef.current = Date.now();
    setMultiplier(1.00);
    setParachutes([]);
    setFloatingTexts([]);

    gameLoopRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const currentMult = Math.pow(Math.E, 0.08 * elapsed);
      setMultiplier(currentMult);
      
      if(audioRef.current && currentMult > 1.05) audioRef.current.playTick();

      if (currentMult >= newCrashPoint) {
        clearInterval(gameLoopRef.current);
        handleCrashEnd(newCrashPoint);
      }
    }, 50);
  };

  const handleCrashEnd = (finalMult) => {
    setGameState('CRASHED');
    setMultiplier(finalMult);
    setHistory(prev => [finalMult, ...prev].slice(0, 15));
    if(audioRef.current) audioRef.current.playCrash();
    
    // If player didn't cash out, they lose
    setIsBetPlaced(false);
    
    setTimeout(() => {
      setGameState('WAITING');
      setCountdown(5.0);
      setMultiplier(1.00);
      setCashedOut(false);
      setWinAmount(0);
    }, 3000);
  };

  const handleCrashAction = () => {
    initAudio();
    if (gameState === 'WAITING' && !isBetPlaced) {
      if (balance >= betAmount && betAmount > 0) {
        setBalance(b => b - betAmount);
        setIsBetPlaced(true);
      }
    } else if (gameState === 'PLAYING' && isBetPlaced && !cashedOut) {
      handleCrashCashOut();
    }
  };

  const handleCrashCashOut = () => {
    if(!isBetPlaced || cashedOut || gameState !== 'PLAYING') return;
    const currentMult = multiplier;
    const win = betAmount * currentMult;
    setCashedOut(true);
    setWinAmount(win);
    setBalance(b => b + win);
    if(audioRef.current) audioRef.current.playCashout();
    
    const x = Math.min(80, 10 + (currentMult * 5)); const y = Math.min(80, 10 + (currentMult * 3));
    setParachutes(prev => [...prev, { id: 'player', name: 'You', x, y }]);
    const tid = 'txt-player-' + Date.now();
    setFloatingTexts(prev => [...prev, { id: tid, text: `+₹${win.toFixed(2)}`, x, y, isPlayer: true }]);
    setTimeout(() => { setFloatingTexts(prev => prev.filter(t => t.id !== tid)); }, 1500);
  };

  // Auto cashout listener
  useEffect(() => {
    if (gameState === 'PLAYING' && isBetPlaced && !cashedOut && autoCashOut && multiplier >= autoTarget) {
      handleCrashCashOut();
    }
  }, [multiplier, gameState, isBetPlaced, cashedOut, autoCashOut, autoTarget]);


  // ================= PARITY GAME ENGINE =================
  const [parityTimer, setParityTimer] = useState(30);
  const [parityBetAmount, setParityBetAmount] = useState(10);
  const [paritySelected, setParitySelected] = useState(null);
  const [parityUserBet, setParityUserBet] = useState(null);
  const [parityResultColor, setParityResultColor] = useState(null);
  const [parityHistory, setParityHistory] = useState(['red', 'green', 'red', 'red', 'violet']);
  const parityLoopRef = useRef(null);

  useEffect(() => {
    parityLoopRef.current = setInterval(() => {
      setParityTimer(prev => {
        if(prev <= 1) {
          generateParityResult();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(parityLoopRef.current);
  }, []);

  const generateParityResult = () => {
    const r = Math.random();
    let res = 'red';
    if(r > 0.45 && r <= 0.9) res = 'green';
    else if(r > 0.9) res = 'violet';
    
    setParityResultColor(res);
    setParityHistory(prev => [res, ...prev].slice(0, 15));
    if(audioRef.current) audioRef.current.playTick();

    // Settle Bet
    setParityUserBet(currentBet => {
      if(currentBet) {
        if(currentBet.color === res) {
          const mult = res === 'violet' ? 4.5 : 2;
          const winAmount = currentBet.amount * mult;
          setBalance(b => b + winAmount);
          if(audioRef.current) audioRef.current.playCashout();
        } else {
          if(audioRef.current) audioRef.current.playCrash();
        }
      }
      return null;
    });

    setTimeout(() => setParityResultColor(null), 3000);
  };

  const placeParityBet = () => {
    initAudio();
    if(balance >= parityBetAmount && paritySelected && parityTimer > 2) {
      setBalance(b => b - parityBetAmount);
      setParityUserBet({ color: paritySelected, amount: parityBetAmount });
      setParitySelected(null);
    }
  };


  // ================= MINES ENGINE =================
  const MINES_MULTIPLIERS = [1.00, 1.04, 1.09, 1.15, 1.22, 1.30, 1.40, 1.52, 1.66, 1.83, 2.05, 2.32];
  const [minesGrid, setMinesGrid] = useState(Array(25).fill({ revealed: false, isMine: false }));
  const [minesActive, setMinesActive] = useState(false);
  const [minesCount, setMinesCount] = useState(3);
  const [minesBetAmount, setMinesBetAmount] = useState(10);
  const [minesMultiplier, setMinesMultiplier] = useState(1.0);
  const [minesHiddenGrid, setMinesHiddenGrid] = useState(Array(25).fill(false));
  const [minesStep, setMinesStep] = useState(0);

  const startMines = () => {
    initAudio();
    if(balance >= minesBetAmount) {
      setBalance(b => b - minesBetAmount);
      let bombs = Array(25).fill(false);
      let placed = 0;
      while(placed < minesCount) {
        let r = Math.floor(Math.random() * 25);
        if(!bombs[r]) { bombs[r] = true; placed++; }
      }
      setMinesHiddenGrid(bombs);
      setMinesGrid(Array(25).fill({ revealed: false, isMine: false }));
      setMinesMultiplier(1.0);
      setMinesStep(0);
      setMinesActive(true);
    }
  };

  const clickMine = (index) => {
    initAudio();
    if(!minesActive || minesGrid[index].revealed) return;
    
    let newGrid = [...minesGrid];
    if(minesHiddenGrid[index]) {
      // Boom
      newGrid[index] = { revealed: true, isMine: true };
      setMinesGrid(minesHiddenGrid.map(b => ({ revealed: true, isMine: b })));
      setMinesActive(false);
      if(audioRef.current) audioRef.current.playCrash();
    } else {
      // Safe
      newGrid[index] = { revealed: true, isMine: false };
      setMinesGrid(newGrid);
      const nextStep = minesStep + 1;
      setMinesStep(nextStep);
      setMinesMultiplier(MINES_MULTIPLIERS[Math.min(nextStep, MINES_MULTIPLIERS.length - 1)]);
      if(audioRef.current) audioRef.current.playTick();
    }
  };

  const cashoutMines = () => {
    if(minesActive && minesMultiplier > 1.0) {
      const win = minesBetAmount * minesMultiplier;
      setBalance(b => b + win);
      setMinesActive(false);
      setMinesGrid(minesHiddenGrid.map((b, i) => ({ revealed: true, isMine: b || minesGrid[i].revealed })));
      if(audioRef.current) audioRef.current.playCashout();
    }
  };


  // ================= DICE ENGINE =================
  const [diceTarget, setDiceTarget] = useState(50);
  const [diceMode, setDiceMode] = useState('under'); 
  const [diceBetAmount, setDiceBetAmount] = useState(10);
  const [diceResult, setDiceResult] = useState(null);

  const rollDice = () => {
    initAudio();
    if(balance >= diceBetAmount) {
      setBalance(b => b - diceBetAmount);
      const roll = Math.floor(Math.random() * 100);
      setDiceResult(roll);
      
      let win = false;
      let mult = 0;
      if (diceMode === 'over' && roll > diceTarget) { win = true; mult = 99 / (100 - diceTarget); }
      if (diceMode === 'under' && roll < diceTarget) { win = true; mult = 99 / diceTarget; }

      if(win) {
        const winAmount = diceBetAmount * mult;
        setBalance(b => b + winAmount);
        if(audioRef.current) audioRef.current.playCashout();
      } else {
        if(audioRef.current) audioRef.current.playCrash();
      }
    }
  };

  const planePosition = () => {
    if (gameState === 'WAITING' || gameState === 'CRASHED') return {}; 
    const x = Math.min(80, 10 + (multiplier * 5)); const y = Math.min(80, 10 + (multiplier * 3));
    const tilt = Math.min(60, 45 + (multiplier * 2));
    return { bottom: `${y}%`, left: `${x}%`, transform: `rotate(${tilt}deg)` };
  };

  // ================= RENDERS =================
  const renderFastParity = () => (
    <div className="crash-game-container fade-in">
      <header className="top-header glass-header">
        <ChevronLeft size={24} className="icon-gold" onClick={() => setCurrentRoute('lobby')} style={{cursor: 'pointer'}} />
        <div className="header-title">Fast Parity <span className="beta-tag" style={{background:'#f44336', color:'#fff'}}>HOT</span></div>
        <div className="balance-display glass-btn-small"><span className="coin-icon">₹</span>{balance.toFixed(2)}</div>
      </header>
      
      <div className="parity-timer-card glass-panel">
        <div className="parity-period">Period: Local Prototype</div>
        <div className="parity-time">
          <span>00</span>:<span>{parityTimer < 10 ? `0${parityTimer}` : parityTimer}</span>
        </div>
      </div>

      {parityResultColor && (
        <div className={`parity-result-banner bg-${parityResultColor}`}>
          Result: {parityResultColor.toUpperCase()}
        </div>
      )}

      <div className="parity-buttons glass-panel">
        <div className="parity-btn-row">
          <button className={`p-btn bg-red ${paritySelected === 'red' ? 'selected' : ''}`} onClick={() => setParitySelected('red')}>Join Red</button>
          <button className={`p-btn bg-violet ${paritySelected === 'violet' ? 'selected' : ''}`} onClick={() => setParitySelected('violet')}>Join Violet</button>
          <button className={`p-btn bg-green ${paritySelected === 'green' ? 'selected' : ''}`} onClick={() => setParitySelected('green')}>Join Green</button>
        </div>
        
        <div className="control-top-row mt-15">
          <div className="amount-adjuster">
            <button className="adjust-btn glass-btn" onClick={() => setParityBetAmount(b => Math.max(10, b - 10))}>−</button>
            <input type="number" className="amount-input" value={parityBetAmount} onChange={(e) => setParityBetAmount(Number(e.target.value))} />
            <button className="adjust-btn glass-btn" onClick={() => setParityBetAmount(b => b + 10)}>+</button>
          </div>
          <button 
            className={`primary-btn-large ${!paritySelected || parityTimer < 2 || parityUserBet ? 'disabled' : ''}`} 
            style={{marginTop:0, padding: '10px 20px'}}
            onClick={placeParityBet}
          >
            {parityUserBet ? `Bet Placed` : `Bet ₹${parityBetAmount}`}
          </button>
        </div>
      </div>

      <div className="parity-history glass-panel">
        <h4>History</h4>
        <div className="p-history-circles">
          {parityHistory.map((c, i) => (
            <div key={i} className={`p-circle bg-${c}`}></div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMines = () => (
    <div className="crash-game-container fade-in">
      <header className="top-header glass-header">
        <ChevronLeft size={24} className="icon-gold" onClick={() => setCurrentRoute('lobby')} style={{cursor: 'pointer'}} />
        <div className="header-title">Mines</div>
        <div className="balance-display glass-btn-small"><span className="coin-icon">₹</span>{balance.toFixed(2)}</div>
      </header>

      <div className="mines-board glass-panel">
        <div className="mines-grid">
          {minesGrid.map((cell, idx) => (
            <button 
              key={idx} 
              className={`mine-cell ${cell.revealed ? (cell.isMine ? 'revealed-bomb' : 'revealed-gem') : ''}`}
              onClick={() => clickMine(idx)}
              disabled={!minesActive || cell.revealed}
            >
              {cell.revealed ? (cell.isMine ? '💣' : '💎') : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="control-panel glass-panel">
        <div className="mines-config">
          <span>Mines:</span>
          <select className="mines-select" value={minesCount} onChange={(e) => setMinesCount(Number(e.target.value))} disabled={minesActive}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
          <div style={{flex:1}}></div>
          <div className="amount-adjuster">
            <button className="adjust-btn glass-btn" onClick={() => setMinesBetAmount(b => Math.max(10, b - 10))} disabled={minesActive}>−</button>
            <input type="number" className="amount-input" value={minesBetAmount} onChange={(e) => setMinesBetAmount(Number(e.target.value))} disabled={minesActive} />
            <button className="adjust-btn glass-btn" onClick={() => setMinesBetAmount(b => b + 10)} disabled={minesActive}>+</button>
          </div>
        </div>

        <button 
          className={`main-action-btn glass-action-btn ${minesActive ? 'btn-cashout' : 'btn-start'}`}
          style={{width: '100%', marginTop: 10}}
          onClick={minesActive ? cashoutMines : startMines}
        >
          {minesActive ? (
             <><div className="action-title">Cashout</div><div className="action-subtitle">₹{(minesBetAmount * minesMultiplier).toFixed(2)}</div></>
          ) : (
            <div className="action-title" style={{padding: '5px 0'}}>Start Game</div>
          )}
        </button>
      </div>
    </div>
  );

  const renderDice = () => {
    const winChance = diceMode === 'under' ? diceTarget : 100 - diceTarget;
    const mult = 99 / Math.max(1, winChance);
    
    return (
      <div className="crash-game-container fade-in">
        <header className="top-header glass-header">
          <ChevronLeft size={24} className="icon-gold" onClick={() => setCurrentRoute('lobby')} style={{cursor: 'pointer'}} />
          <div className="header-title">Dice</div>
          <div className="balance-display glass-btn-small"><span className="coin-icon">₹</span>{balance.toFixed(2)}</div>
        </header>

        <div className="dice-board glass-panel">
          <div className="dice-result-display">
            {diceResult !== null ? diceResult : '--'}
          </div>
          
          <div className="dice-slider-container">
            <input 
              type="range" 
              min="2" max="98" 
              value={diceTarget} 
              onChange={(e) => setDiceTarget(Number(e.target.value))}
              className="dice-slider"
            />
            <div className="dice-markers">
              <span>0</span><span>{diceTarget}</span><span>100</span>
            </div>
          </div>

          <div className="dice-stats row">
            <div className="stat-box glass-btn">
              <p>Multiplier</p>
              <h4 className="gold-text">{mult.toFixed(2)}x</h4>
            </div>
            <div className="stat-box glass-btn">
              <p>Win Chance</p>
              <h4 className="gold-text">{winChance}%</h4>
            </div>
          </div>
        </div>

        <div className="control-panel glass-panel">
          <div className="dice-modes row" style={{gap:10}}>
            <button className={`flex-1 glass-btn ${diceMode === 'under' ? 'selected' : ''}`} onClick={() => setDiceMode('under')}>Roll Under</button>
            <button className={`flex-1 glass-btn ${diceMode === 'over' ? 'selected' : ''}`} onClick={() => setDiceMode('over')}>Roll Over</button>
          </div>
          
          <div className="amount-adjuster" style={{justifyContent: 'center', margin: '15px 0'}}>
            <button className="adjust-btn glass-btn" onClick={() => setDiceBetAmount(b => Math.max(10, b - 10))}>−</button>
            <input type="number" className="amount-input" value={diceBetAmount} onChange={(e) => setDiceBetAmount(Number(e.target.value))} />
            <button className="adjust-btn glass-btn" onClick={() => setDiceBetAmount(b => b + 10)}>+</button>
          </div>

          <button className="main-action-btn glass-action-btn btn-start" style={{width: '100%'}} onClick={rollDice}>
            <div className="action-title" style={{padding: '5px 0'}}>Roll Dice</div>
          </button>
        </div>
      </div>
    );
  };

  const renderCrashGame = () => {
    let bgClass = "sky-theme";
    if(multiplier > 2.0 && multiplier <= 5.0) bgClass = "sunset-theme";
    if(multiplier > 5.0 && multiplier <= 10.0) bgClass = "night-theme";
    if(multiplier > 10.0) bgClass = "space-theme";

    return (
      <div className="crash-game-container fade-in">
        <header className="top-header glass-header">
          <ChevronLeft size={24} className="icon-gold" onClick={() => setCurrentRoute('lobby')} style={{cursor: 'pointer'}} />
          <div className="header-title">Crash <span className="beta-tag">PRO</span></div>
          <Info size={20} className="icon-gold" />
        </header>

        <div className="history-bar glass-panel-dark">
          {history.map((mult, idx) => {
            let colorClass = 'blue-pill';
            if(mult >= 10) colorClass = 'gold-pill'; else if(mult >= 2) colorClass = 'purple-pill';
            return <div key={idx} className={`history-pill ${colorClass}`}>{mult.toFixed(2)}X</div>
          })}
        </div>

        <div className={`game-board ${bgClass} ${gameState === 'CRASHED' ? 'shake-animation' : ''}`}>
          <div className="parallax-layer clouds-1"></div><div className="parallax-layer clouds-2"></div><div className="parallax-layer stars"></div>
          <div className={`multiplier-display ${gameState.toLowerCase()} ${gameState === 'PLAYING' ? 'heartbeat' : ''}`}>
            {gameState === 'WAITING' ? `Waiting: ${countdown.toFixed(1)}s` : `${multiplier.toFixed(2)}x`}
          </div>
          {parachutes.map(p => (
            <div key={p.id} className="parachute-container" style={{ left: `${p.x}%`, bottom: `${p.y - 10}%` }}>
              <div className="parachute-img">🪂</div>
              <div className="parachute-avatar"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="avatar" /></div>
            </div>
          ))}
          {floatingTexts.map(t => (
            <div key={t.id} className={`floating-text ${t.isPlayer ? 'player-win' : ''}`} style={{ left: `${t.x}%`, bottom: `${t.y}%` }}>{t.text}</div>
          ))}

          <div className="plane-container" style={gameState === 'PLAYING' ? planePosition() : {}}>
            {gameState === 'PLAYING' && <div className="flame giant-flame"></div>}
            <svg viewBox="0 0 512 512" className={`rocket ${gameState === 'PLAYING' ? 'flying' : ''} ${gameState === 'CRASHED' ? 'crashed' : ''}`}>
              <path d="M497.9 142.1l-46.1 46.1c-4.7 4.7-11.6 6.5-18 4.7l-98.3-26.3-138.8 138.8 91.5 68.6c4.6 3.4 6.6 9.4 5.2 15L273.7 466c-2.3 9.1-13.8 11.9-20.1 5.1L193.3 410.7 131.6 472.4c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l61.7-61.7L76.9 293.9c-6.8-6.3-4-17.8 5.1-20.1l76.9-19.6 68.6 91.5L366.4 207l-26.3-98.3c-1.8-6.5 .1-13.3 4.7-18l46.1-46.1c18.7-18.7 49.1-18.7 67.9 0l39.1 39.1c18.8 18.7 18.8 49.1 0 67.9z" fill="#03a9f4"/>
              <path d="M428.1 202.1c8.3-8.3 21.8-8.3 30.2 0l33.9 33.9c8.3 8.3 8.3 21.8 0 30.2l-33.9-33.9-30.2-30.2z" fill="#ffeb3b"/>
              <path d="M256 128C185.3 128 128 185.3 128 256s57.3 128 128 128 128-57.3 128-128-57.3-128-128-128zm0 213.3c-47.1 0-85.3-38.2-85.3-85.3s38.2-85.3 85.3-85.3 85.3 38.2 85.3 85.3-38.2 85.3-85.3 85.3z" fill="#fff" opacity="0.4"/>
              <circle cx="256" cy="256" r="64" fill="#112233"/>
            </svg>
          </div>
        </div>

        <div className="control-panel glass-panel">
          <div className="control-top-row">
            <div className="amount-adjuster">
              <button className="adjust-btn glass-btn" onClick={() => setBetAmount(b => Math.max(1, b - 10))}>−</button>
              <input type="number" className="amount-input" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} disabled={isBetPlaced || gameState !== 'WAITING'} />
              <button className="adjust-btn glass-btn" onClick={() => setBetAmount(b => b + 10)}>+</button>
            </div>
            <div className="balance-display glass-btn-small"><span className="coin-icon">₹</span> {balance.toFixed(2)}</div>
          </div>
          <div className="control-grid-layout">
            <div className="quick-bets-grid">
              {[20, 50, 100, 500, 1000].map(val => ( <button key={val} className="quick-bet-btn glass-btn" onClick={() => {initAudio(); if(!isBetPlaced && gameState==='WAITING') setBetAmount(val);}}>{val}</button> ))}
              <button className="quick-bet-btn btn-all glass-btn" onClick={() => {initAudio(); if(!isBetPlaced && gameState==='WAITING') setBetAmount(Math.floor(balance));}}>ALL</button>
            </div>
            <button 
              className={`main-action-btn glass-action-btn ${ (gameState === 'WAITING' && !isBetPlaced) ? 'btn-start' : (gameState === 'PLAYING' && isBetPlaced && !cashedOut) ? 'btn-cashout' : 'btn-disabled' }`}
              onClick={handleCrashAction}
              disabled={ (gameState === 'WAITING' && isBetPlaced) || (gameState === 'PLAYING' && (!isBetPlaced || cashedOut)) || gameState === 'CRASHED' }
            >
              {gameState === 'WAITING' && !isBetPlaced && ( <><div className="action-title">Start</div><div className="action-subtitle">Next Round</div></> )}
              {gameState === 'WAITING' && isBetPlaced && 'Waiting...'}
              {gameState === 'PLAYING' && isBetPlaced && !cashedOut && ( <><div className="action-title pulse-text">Cash Out</div><div className="action-subtitle">{(betAmount * multiplier).toFixed(2)}</div></> )}
              {gameState === 'PLAYING' && (!isBetPlaced || cashedOut) && 'Playing...'}
              {gameState === 'CRASHED' && 'Crashed'}
            </button>
          </div>
          <div className="auto-stop-row">
            <span className="auto-stop-label">Auto Stop</span>
            <button className="adjust-btn small glass-btn" onClick={() => setAutoTarget(t => Math.max(1.01, t - 0.1))}>−</button>
            <input type="number" className="auto-stop-input" value={autoTarget.toFixed(2)} onChange={(e) => setAutoTarget(Number(e.target.value))} step="0.1" />
            <button className="adjust-btn small glass-btn" onClick={() => setAutoTarget(t => t + 0.1)}>+</button>
            <div className="toggle-switch glass-btn" onClick={() => !isBetPlaced && setAutoCashOut(!autoCashOut)}>
              <div className={`toggle-knob ${autoCashOut ? 'active' : ''}`}></div>
            </div>
          </div>
        </div>

        <div className="players-section glass-panel" style={{marginBottom: 0}}>
          <div className="players-header">
            <div className="players-count"><Users size={16} /> Players: Online</div>
            <div className="my-order"><Wallet size={16} /> Local Demo</div>
          </div>
        </div>
      </div>
    );
  };

  // === OVERLAY SCREENS ===
  const renderRechargeScreen = () => (
    <div className="modal-screen slide-up glass-panel">
      <div className="modal-header">
        <ChevronLeft onClick={() => setActiveTab('home')} className="back-btn" />
        <h2>Recharge</h2>
        <div style={{width: 24}}></div>
      </div>
      <div className="modal-content">
        <div className="wallet-card">
          <p>Total Balance</p>
          <h3>₹ {balance.toFixed(2)}</h3>
        </div>
        <h4 className="section-title">Select Amount</h4>
        <div className="recharge-grid">
          {[100, 500, 1000, 2000, 5000, 10000].map(amt => (
            <div key={amt} className="recharge-amt-btn glass-btn" onClick={() => {
              setBalance(b => b + amt);
              alert(`₹${amt} added for prototype testing!`);
              setActiveTab('home');
            }}>
              ₹ {amt}
            </div>
          ))}
        </div>
        <button className="primary-btn-large mt-auto" onClick={() => setActiveTab('home')}>Confirm Recharge</button>
      </div>
    </div>
  );

  const renderInviteScreen = () => (
    <div className="modal-screen slide-up glass-panel">
      <div className="modal-header">
        <ChevronLeft onClick={() => setActiveTab('home')} className="back-btn" />
        <h2>Invite & Earn</h2>
        <div style={{width: 24}}></div>
      </div>
      <div className="modal-content">
        <div className="invite-banner">
          <h2>Earn 50% Commission</h2>
          <p>On every friend's winning!</p>
        </div>
        <div className="stats-row">
          <div className="stat-box glass-btn"><p>Invited</p><h4>12 Users</h4></div>
          <div className="stat-box glass-btn"><p>Earned</p><h4 className="gold-text">₹ 4,500</h4></div>
        </div>
        <div className="referral-box glass-btn">
          <p>Your Referral Link:</p>
          <div className="ref-link-area">
            <span>https://zexwin.com/r/PrototypeDemo</span>
            <button onClick={() => alert("Copied!")}><Share2 size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuestsScreen = () => (
    <div className="modal-screen slide-up glass-panel">
      <div className="modal-header">
        <ChevronLeft onClick={() => setActiveTab('home')} className="back-btn" />
        <h2>Daily Quests</h2>
        <div style={{width: 24}}></div>
      </div>
      <div className="modal-content">
        <div className="quest-card glass-btn">
          <div className="q-info"><h4>Play 10 Rounds</h4><p>Progress: 4/10</p><div className="progress-bar"><div className="fill" style={{width:'40%'}}></div></div></div>
          <button className="q-btn disabled">₹ 20</button>
        </div>
        <div className="quest-card completed glass-btn">
          <div className="q-info"><h4>Win ₹ 500</h4><p>Progress: 500/500</p><div className="progress-bar"><div className="fill" style={{width:'100%'}}></div></div></div>
          <button className="q-btn claim" onClick={() => { setBalance(b => b + 100); alert("Claimed ₹100!"); setActiveTab('home'); }}>Claim ₹ 100</button>
        </div>
      </div>
    </div>
  );

  const renderProfileScreen = () => (
    <div className="modal-screen slide-up glass-panel">
      <div className="modal-header">
        <ChevronLeft onClick={() => setActiveTab('home')} className="back-btn" />
        <h2>My Profile</h2>
        <div style={{width: 24}}></div>
      </div>
      <div className="modal-content">
        <div className="profile-header-card glass-btn">
          <div className="p-avatar"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=DemoUser`} alt="profile"/></div>
          <div className="p-details"><h3>Demo Client</h3><p>ID: 9999</p></div>
        </div>
        <div className="p-menu glass-btn" style={{padding: 0}}>
          <div className="p-menu-item"><Wallet size={20} className="icon-gold"/><span>Withdraw Funds</span><ChevronLeft size={16} style={{transform: 'rotate(180deg)'}} className="ml-auto"/></div>
          <div className="p-menu-item" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 size={20} className="icon-gold"/> : <VolumeX size={20} className="icon-gold"/>}
            <span>Sound Effects {soundEnabled ? 'ON' : 'OFF'}</span>
            <ChevronLeft size={16} style={{transform: 'rotate(180deg)'}} className="ml-auto"/>
          </div>
          <div className="p-menu-item logout" onClick={() => alert("Logout disabled in demo")}><LogOut size={20} /><span>Logout</span></div>
        </div>
      </div>
    </div>
  );

  // === LOBBY SCREEN ===
  const renderLobby = () => (
    <div className="lobby-container fade-in">
      <header className="lobby-header glass-header">
        <div className="lobby-user-info">
          <img src="/logo.png" alt="ZexWin Logo" className="brand-logo" />
        </div>
        <div className="lobby-actions">
          <div className="lobby-balance glass-btn-small">
             <span className="coin-icon">₹</span> {balance.toFixed(2)}
          </div>
          <Bell className="icon-gold" size={24} />
        </div>
      </header>

      <div className="lobby-content">
        <div className="lobby-categories">
          <div className="category-tab active-cat">Hot Games</div>
          <div className="category-tab">Slots</div>
          <div className="category-tab">Live</div>
        </div>

        <div className="game-grid">
          <div className="game-card crash-card" onClick={() => {initAudio(); setCurrentRoute('crash');}}>
            <div className="game-icon-bg"><Zap size={32} color="#fff" /></div>
            <div className="game-name">Crash</div>
            <div className="game-tag">Hot</div>
          </div>
          <div className="game-card parity-card" onClick={() => {initAudio(); setCurrentRoute('parity');}}>
            <div className="game-icon-bg"><Crown size={32} color="#fff" /></div>
            <div className="game-name">Fast Parity</div>
          </div>
          <div className="game-card mine-card" onClick={() => {initAudio(); setCurrentRoute('mines');}}>
            <div className="game-icon-bg"><Bomb size={32} color="#fff" /></div>
            <div className="game-name">Mines</div>
          </div>
          <div className="game-card dice-card" onClick={() => {initAudio(); setCurrentRoute('dice');}}>
            <div className="game-icon-bg"><Dices size={32} color="#fff" /></div>
            <div className="game-name">Dice</div>
          </div>
        </div>
        
        <div className="winners-marquee glass-panel">
           <marquee>🎉 <b>Alex99</b> just won ₹15,000 in Crash! &nbsp; &nbsp; 🎉 <b>Sniper007</b> just won ₹5,200 in Parity! &nbsp; &nbsp; 🎉 <b>CryptoKing</b> withdrew ₹50,000!</marquee>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mobile-wrapper">
      {currentRoute === 'lobby' && renderLobby()}
      {currentRoute === 'crash' && renderCrashGame()}
      {currentRoute === 'parity' && renderFastParity()}
      {currentRoute === 'mines' && renderMines()}
      {currentRoute === 'dice' && renderDice()}

      {/* Overlay Screens */}
      {activeTab === 'recharge' && renderRechargeScreen()}
      {activeTab === 'invite' && renderInviteScreen()}
      {activeTab === 'quests' && renderQuestsScreen()}
      {activeTab === 'profile' && renderProfileScreen()}

      {/* Bottom Nav Bar */}
      {currentRoute === 'lobby' && (
        <div className="bottom-nav glass-nav">
          <div className={`nav-item ${activeTab === 'recharge' ? 'active-nav' : ''}`} onClick={() => setActiveTab('recharge')}><Wallet size={20} /><span>Recharge</span></div>
          <div className={`nav-item ${activeTab === 'invite' ? 'active-nav' : ''}`} onClick={() => setActiveTab('invite')}><LinkIcon size={20} /><span>Invite</span></div>
          <div className="nav-item nav-item-center" onClick={() => setActiveTab('home')}>
            <div className="home-btn pulse-glow"><Crown size={28} /></div>
            <span className={`home-text ${activeTab === 'home' ? 'active-nav-text' : ''}`}>HOME</span>
          </div>
          <div className={`nav-item ${activeTab === 'quests' ? 'active-nav' : ''}`} onClick={() => setActiveTab('quests')}><CalendarCheck size={20} /><span>Quests</span></div>
          <div className={`nav-item ${activeTab === 'profile' ? 'active-nav' : ''}`} onClick={() => setActiveTab('profile')}><User size={20} /><span>My</span></div>
        </div>
      )}
    </div>
  );
}

export default App;
