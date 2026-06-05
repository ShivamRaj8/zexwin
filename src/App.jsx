import { useState, useEffect, useRef } from 'react';
import { Info, Wallet, Crown, Link as LinkIcon, CalendarCheck, User, Users, ChevronLeft, CreditCard, Bitcoin, Share2, CheckCircle, Settings, LogOut, Volume2, VolumeX, Bell, Zap, Bomb, Dices, Diamond, ShieldAlert } from 'lucide-react';
import { io } from 'socket.io-client';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

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
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [balance, setBalance] = useState(0);
  const [currentRoute, setCurrentRoute] = useState('lobby'); 
  const [activeTab, setActiveTab] = useState('home'); 
  const [walletTab, setWalletTab] = useState('deposit');
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef(null);
  const socketRef = useRef(null);

  // Login States
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Bank & Admin States
  const [bankDetails, setBankDetails] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminTab, setAdminTab] = useState('users');
  const [adminWithdrawals, setAdminWithdrawals] = useState([]);
  const [forceMultiplier, setForceMultiplier] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState(false);

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

  // ================= CRASH STATES =================
  const [betAmount, setBetAmount] = useState(10);
  const [multiplier, setMultiplier] = useState(1.00);
  const [gameState, setGameState] = useState('WAITING'); 
  const [isBetPlaced, setIsBetPlaced] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [history, setHistory] = useState([]);
  const [autoCashOut, setAutoCashOut] = useState(false);
  const [autoTarget, setAutoTarget] = useState(1.10);
  const [countdown, setCountdown] = useState(5.0);
  const [parachutes, setParachutes] = useState([]);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const multiplierRef = useRef(1.00);

  // ================= PARITY STATES =================
  const [parityTimer, setParityTimer] = useState(30);
  const [parityBetAmount, setParityBetAmount] = useState(10);
  const [paritySelected, setParitySelected] = useState(null);
  const [parityUserBet, setParityUserBet] = useState(null);
  const [parityResultColor, setParityResultColor] = useState(null);
  const [parityHistory, setParityHistory] = useState([]);

  // ================= MINES STATES =================
  const [minesGrid, setMinesGrid] = useState(Array(25).fill({ revealed: false, isMine: false }));
  const [minesActive, setMinesActive] = useState(false);
  const [minesCount, setMinesCount] = useState(3);
  const [minesBetAmount, setMinesBetAmount] = useState(10);
  const [minesMultiplier, setMinesMultiplier] = useState(1.0);

  // ================= DICE STATES =================
  const [diceTarget, setDiceTarget] = useState(50);
  const [diceMode, setDiceMode] = useState('under'); 
  const [diceBetAmount, setDiceBetAmount] = useState(10);
  const [diceResult, setDiceResult] = useState(null);

  // ================= AUTO RECONNECT IF TOKEN EXISTS =================
  useEffect(() => {
    if(token && !user) {
      // Decode JWT locally just to get basic info quickly, or rely on socket connection
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.id, mobile: payload.mobile, role: payload.role });
        fetchBankDetails(token);
      } catch(e) {
        setToken(null);
        localStorage.removeItem('token');
      }
    }
  }, [token, user]);

  // ================= SOCKET LOGIC =================
  useEffect(() => {
    if(!token) return;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token }
      });
    }
    const socket = socketRef.current;

    socket.on('connect_error', (err) => {
      console.error("Socket Error:", err);
      if(err.message === 'Authentication error') {
        logout();
      }
    });

    socket.on('balance_update', (newBal) => setBalance(newBal));

    // --- Crash Game ---
    socket.on('crash_sync', (data) => {
      setGameState(data.gameState); setMultiplier(data.multiplier);
      setCountdown(data.countdown); setHistory(data.history);
      multiplierRef.current = data.multiplier;
    });

    socket.on('crash_tick', (data) => {
      setGameState(data.gameState); setMultiplier(data.multiplier);
      setCountdown(data.countdown); multiplierRef.current = data.multiplier;
      if (data.gameState === 'PLAYING') {
        if(audioRef.current && data.multiplier > 1.05) audioRef.current.playTick();
        if (isBetPlaced && !cashedOut && autoCashOut && data.multiplier >= autoTarget) {
          handleCrashCashOut();
        }
      }
    });

    socket.on('crash_started', () => {
      setParachutes([]); setFloatingTexts([]); setIsBetPlaced(isBetPlaced); 
    });

    socket.on('crash_crashed', (data) => {
      if(audioRef.current) audioRef.current.playCrash();
      setHistory(data.history);
      setIsBetPlaced(false);
      setTimeout(() => { setCashedOut(false); }, 3000);
    });

    socket.on('crash_cashout_success', (data) => {
      setCashedOut(true);
      if(audioRef.current) audioRef.current.playCashout();
      const mult = data.multiplier;
      const currentX = Math.min(80, 10 + (mult * 5)); const currentY = Math.min(80, 10 + (mult * 3));
      setParachutes(prev => [...prev, { id: 'player-cashout', name: 'You', x: currentX, y: currentY }]);
      const tid = 'txt-player-cashout-' + Date.now();
      setFloatingTexts(prev => [...prev, { id: tid, text: `+₹${data.winAmount.toFixed(2)}`, x: currentX, y: currentY, isPlayer: true }]);
      setTimeout(() => { setFloatingTexts(prev => prev.filter(t => t.id !== tid)); }, 1500);
    });

    // --- Parity Game ---
    socket.on('parity_tick', (data) => {
      setParityTimer(data.countdown);
      if(data.history) setParityHistory(data.history);
    });

    socket.on('parity_result', (data) => {
      setParityResultColor(data.result);
      if(audioRef.current) audioRef.current.playTick();
      if(parityUserBet && parityUserBet.color !== data.result) {
        if(audioRef.current) audioRef.current.playCrash();
      }
      setTimeout(() => { setParityResultColor(null); setParityUserBet(null); }, 3000);
    });

    socket.on('parity_win', (data) => {
      if(audioRef.current) audioRef.current.playCashout();
    });

    // --- Mines Game ---
    socket.on('mines_started', () => {
      setMinesGrid(Array(25).fill({ revealed: false, isMine: false }));
      setMinesMultiplier(1.0);
      setMinesActive(true);
    });

    socket.on('mines_safe', (data) => {
      if(audioRef.current) audioRef.current.playTick();
      setMinesGrid(prev => { let n = [...prev]; n[data.index] = { revealed: true, isMine: false }; return n; });
      setMinesMultiplier(data.multiplier);
    });

    socket.on('mines_game_over', (data) => {
      setMinesActive(false);
      if(audioRef.current) audioRef.current.playCrash();
      setMinesGrid(data.bombs.map(b => ({ revealed: true, isMine: b })));
    });

    socket.on('mines_cashout_success', (data) => {
      setMinesActive(false);
      if(audioRef.current) audioRef.current.playCashout();
      setMinesGrid(data.bombs.map((b, i) => ({ revealed: true, isMine: b || minesGrid[i].revealed })));
    });

    // --- Dice Game ---
    socket.on('dice_result', (data) => {
      setDiceResult(data.roll);
      if(data.win) {
        if(audioRef.current) audioRef.current.playCashout();
      } else {
        if(audioRef.current) audioRef.current.playCrash();
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);


  // ================= API CALLS =================
  const sendOtp = async () => {
    setLoginError('');
    if(mobile.length < 10) return setLoginError("Enter 10 digit mobile number");
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({mobile})
      });
      const data = await res.json();
      if(data.success) setOtpSent(true);
      else setLoginError(data.error);
    } catch(e) { setLoginError("Server unreachable"); }
    setIsLoading(false);
  };

  const verifyOtp = async () => {
    setLoginError('');
    if(!otp) return setLoginError("Enter OTP");
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({mobile, otp})
      });
      const data = await res.json();
      if(data.success) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setBalance(data.user.balance);
        fetchBankDetails(data.token);
        setCurrentRoute('lobby');
      } else { setLoginError(data.error); }
    } catch(e) { setLoginError("Server unreachable"); }
    setIsLoading(false);
  };

  const fetchBankDetails = async (currentToken) => {
    try {
      const res = await fetch(`${API_BASE}/bank`, { headers: { 'Authorization': `Bearer ${currentToken}` }});
      const data = await res.json();
      setBankDetails(data.bankDetails || { account_number: '', ifsc_code: '', bank_name: '', upi_id: '' });
    } catch(e) {}
  };

  const saveBankDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/bank`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(bankDetails)
      });
      if(res.ok) showToast("Bank details saved securely!");
    } catch(e) { showToast("Failed to save bank details"); }
  };

  const fetchAdminData = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` }});
      const data = await res.json();
      if(data.users) setAdminUsers(data.users);

      const res2 = await fetch(`${API_BASE}/admin/withdrawals`, { headers: { 'Authorization': `Bearer ${token}` }});
      const data2 = await res2.json();
      if(data2.withdrawals) setAdminWithdrawals(data2.withdrawals);
    } catch(e) { showToast("Unauthorized"); }
  };

  const handleWithdrawalStatus = async (id, status) => {
    setAdminActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/withdrawals/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ withdrawalId: id, status })
      });
      if(res.ok) {
        showToast("Status updated");
        fetchAdminData();
      }
    } catch(e) {}
    setAdminActionLoading(false);
  };

  const handleBalanceUpdate = async (userId, amount) => {
    setAdminActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/user/balance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId, amount })
      });
      if(res.ok) {
        showToast(`Balance ${amount > 0 ? 'added' : 'deducted'}`);
        fetchAdminData();
      }
    } catch(e) {}
    setAdminActionLoading(false);
  };

  const handleCrashForce = async () => {
    if(!forceMultiplier) return;
    setAdminActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/crash-control`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ multiplier: forceMultiplier })
      });
      if(res.ok) {
        showToast(`Next crash forced to ${forceMultiplier}x`);
        setForceMultiplier('');
      }
    } catch(e) {}
    setAdminActionLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setCurrentRoute('lobby');
    setOtpSent(false);
    setMobile('');
    setOtp('');
  };


  // ================= ACTION HANDLERS =================
  const handleCrashAction = () => {
    initAudio();
    if (gameState === 'WAITING' && !isBetPlaced) {
      if (balance >= betAmount && betAmount > 0) {
        socketRef.current.emit('crash_place_bet', { amount: betAmount });
        setIsBetPlaced(true);
      }
    } else if (gameState === 'PLAYING' && isBetPlaced && !cashedOut) {
      handleCrashCashOut();
    }
  };

  const handleCrashCashOut = () => {
    socketRef.current.emit('crash_cashout', {});
  };

  const placeParityBet = () => {
    initAudio();
    if(balance >= parityBetAmount && paritySelected && parityTimer > 2) {
      socketRef.current.emit('parity_place_bet', { amount: parityBetAmount, color: paritySelected });
      setParityUserBet({ color: paritySelected, amount: parityBetAmount });
      setParitySelected(null);
    }
  };

  const startMines = () => {
    initAudio();
    if(balance >= minesBetAmount) {
      socketRef.current.emit('mines_start', { betAmount: minesBetAmount });
    }
  };

  const clickMine = (index) => {
    initAudio();
    if(!minesActive || minesGrid[index].revealed) return;
    socketRef.current.emit('mines_reveal', index);
  };

  const cashoutMines = () => {
    if(minesActive && minesMultiplier > 1.0) socketRef.current.emit('mines_cashout', {});
  };

  const rollDice = () => {
    initAudio();
    if(balance >= diceBetAmount) {
      socketRef.current.emit('dice_roll', { amount: diceBetAmount, target: diceTarget, isOver: diceMode === 'over' });
    }
  };

  const planePosition = () => {
    if (gameState === 'WAITING' || gameState === 'CRASHED') return {}; 
    const x = Math.min(80, 10 + (multiplier * 5)); const y = Math.min(80, 10 + (multiplier * 3));
    const tilt = Math.min(60, 45 + (multiplier * 2));
    return { bottom: `${y}%`, left: `${x}%`, transform: `rotate(${tilt}deg)` };
  };

  // ================= RENDERS =================
  const renderLogin = () => (
    <div className="mobile-wrapper" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="glass-panel" style={{width: '90%', padding: '30px', textAlign: 'center'}}>
        <img src="/logo.png" alt="ZexWin" style={{height: '50px', marginBottom: '20px'}} />
        <h2 style={{color: 'var(--gold-primary)', marginBottom: '10px'}}>Secure Login</h2>
        <p style={{color: '#aaa', fontSize: 14, marginBottom: 20}}>Please enter your mobile number</p>
        
        {loginError && <p style={{color: '#ff4444', marginBottom: '10px', fontSize: 14}}>{loginError}</p>}
        
        {!otpSent ? (
          <>
            <div className="input-group" style={{display:'flex', gap: 10, marginBottom: 20}}>
              <input type="text" value="+91" disabled className="form-input" style={{width: '60px', textAlign: 'center', padding: '12px 5px'}} />
              <input 
                type="number" placeholder="Mobile Number" className="form-input" style={{flex: 1}} 
                value={mobile} onChange={e => setMobile(e.target.value)} 
              />
            </div>
            <button className="primary-btn-large" onClick={sendOtp} disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Get OTP'}
            </button>
          </>
        ) : (
          <>
            <div className="input-group" style={{marginBottom: 20}}>
              <input 
                type="number" placeholder="Enter 6-digit OTP" className="form-input" style={{textAlign:'center', letterSpacing: '4px'}} 
                value={otp} onChange={e => setOtp(e.target.value)} 
              />
              <p style={{color: '#00e676', fontSize: 12, marginTop: 10}}>OTP Sent! (Check console for dummy OTP)</p>
            </div>
            <button className="primary-btn-large" onClick={verifyOtp} disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button className="glass-btn" style={{marginTop: 10, width: '100%', padding: 10}} onClick={() => setOtpSent(false)}>Change Number</button>
          </>
        )}
      </div>
    </div>
  );

  const renderFastParity = () => (
    <div className="crash-game-container fade-in">
      <header className="top-header glass-header">
        <ChevronLeft size={24} className="icon-gold" onClick={() => setCurrentRoute('lobby')} style={{cursor: 'pointer'}} />
        <div className="header-title">Fast Parity <span className="beta-tag" style={{background:'#f44336', color:'#fff'}}>HOT</span></div>
        <div className="balance-display glass-btn-small"><span className="coin-icon">₹</span>{balance.toFixed(2)}</div>
      </header>
      
      <div className="parity-timer-card glass-panel">
        <div className="parity-period">Global Server Timer</div>
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
          <select className="mines-select" value={minesCount} onChange={(e) => setMinesCount(Number(e.target.value))} disabled={true}>
            <option value={3}>3 (Phase 1 Fix)</option>
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
      </div>
    );
  };

  // === OVERLAY SCREENS ===
  const renderInviteScreen = () => (
    <div className="modal-screen fade-in" style={{overflowY: 'auto', background: '#0a0502', paddingBottom: 100, zIndex: 40}}>
      <div className="modal-header" style={{padding: '20px 15px', borderBottom: '1px solid rgba(255,215,0,0.1)', display: 'flex', justifyContent: 'center'}}>
        <h2 className="gold-text">Invite & Earn</h2>
      </div>

      <div className="glass-panel" style={{margin: '20px 15px', padding: 20, textAlign: 'center'}}>
        <Share2 size={40} className="icon-gold" style={{marginBottom: 10}} />
        <h3 style={{color: '#fff', marginBottom: 10}}>Refer Friends & Earn!</h3>
        <p style={{color: '#aaa', fontSize: 13, marginBottom: 20}}>Get 1% commission on every bet your friend places, for life!</p>
        
        <div style={{background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8, marginBottom: 15, border: '1px solid rgba(255,215,0,0.2)'}}>
          <p style={{color: '#888', fontSize: 12, marginBottom: 5}}>Your Referral Link</p>
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
             <input type="text" value={`https://zexwin.vercel.app/register?ref=${user?.mobile || '999999999'}`} readOnly className="form-input" style={{flex: 1, padding: 8, fontSize: 12}} />
             <button className="primary-btn-large" style={{width: 'auto', padding: '8px 15px', fontSize: 12}} onClick={() => showToast('Link Copied!')}>Copy</button>
          </div>
        </div>
      </div>

      <div style={{display: 'flex', gap: 15, margin: '0 15px 20px'}}>
        <div className="glass-panel" style={{flex: 1, padding: 15, textAlign: 'center'}}>
          <p style={{color: '#888', fontSize: 12}}>Total Invites</p>
          <h2 className="gold-text" style={{fontSize: 24, marginTop: 5}}>0</h2>
        </div>
        <div className="glass-panel" style={{flex: 1, padding: 15, textAlign: 'center'}}>
          <p style={{color: '#888', fontSize: 12}}>Commission</p>
          <h2 className="gold-text" style={{fontSize: 24, marginTop: 5}}>₹0.00</h2>
        </div>
      </div>

      <div style={{margin: '0 15px'}}>
        <button className="primary-btn-large" onClick={() => showToast('No commission to claim yet.')}>Claim Commission</button>
      </div>
    </div>
  );

  const renderQuestsScreen = () => (
    <div className="modal-screen fade-in" style={{overflowY: 'auto', background: '#0a0502', paddingBottom: 100, zIndex: 40}}>
      <div className="modal-header" style={{padding: '20px 15px', borderBottom: '1px solid rgba(255,215,0,0.1)', display: 'flex', justifyContent: 'center'}}>
        <h2 className="gold-text">Daily Quests</h2>
      </div>

      <div style={{margin: '20px 15px', paddingBottom: 100}}>
        <h4 className="section-title" style={{marginBottom: 15}}>Available Tasks</h4>
        
        <div className="glass-panel" style={{padding: 15, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 15}}>
          <div className="game-icon-bg" style={{background: 'rgba(255,215,0,0.1)', padding: 10, borderRadius: 10}}><Zap size={24} className="icon-gold" /></div>
          <div style={{flex: 1}}>
            <h4 style={{color: '#fff', fontSize: 14}}>Play 5 Crash Games</h4>
            <div style={{background: 'rgba(0,0,0,0.5)', height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden'}}>
               <div style={{background: 'var(--gold-primary)', width: '0%', height: '100%'}}></div>
            </div>
            <p style={{color: '#888', fontSize: 11, marginTop: 5}}>0 / 5 Completed</p>
          </div>
          <button className="glass-btn" style={{padding: '6px 12px', fontSize: 12, opacity: 0.5}}>₹10</button>
        </div>

        <div className="glass-panel" style={{padding: 15, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 15}}>
          <div className="game-icon-bg" style={{background: 'rgba(255,215,0,0.1)', padding: 10, borderRadius: 10}}><Crown size={24} className="icon-gold" /></div>
          <div style={{flex: 1}}>
            <h4 style={{color: '#fff', fontSize: 14}}>Win ₹500 in Fast Parity</h4>
            <div style={{background: 'rgba(0,0,0,0.5)', height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden'}}>
               <div style={{background: 'var(--gold-primary)', width: '0%', height: '100%'}}></div>
            </div>
            <p style={{color: '#888', fontSize: 11, marginTop: 5}}>₹0 / ₹500 Completed</p>
          </div>
          <button className="glass-btn" style={{padding: '6px 12px', fontSize: 12, opacity: 0.5}}>₹50</button>
        </div>

        <div className="glass-panel" style={{padding: 15, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 15}}>
          <div className="game-icon-bg" style={{background: 'rgba(255,215,0,0.1)', padding: 10, borderRadius: 10}}><Wallet size={24} className="icon-gold" /></div>
          <div style={{flex: 1}}>
            <h4 style={{color: '#fff', fontSize: 14}}>Deposit ₹1000</h4>
            <div style={{background: 'rgba(0,0,0,0.5)', height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden'}}>
               <div style={{background: 'var(--gold-primary)', width: '0%', height: '100%'}}></div>
            </div>
            <p style={{color: '#888', fontSize: 11, marginTop: 5}}>0 / 1 Completed</p>
          </div>
          <button className="glass-btn" style={{padding: '6px 12px', fontSize: 12, opacity: 0.5}}>₹100</button>
        </div>
      </div>
    </div>
  );

  const renderProfileScreen = () => (
    <div className="modal-screen slide-up glass-panel" style={{overflowY: 'auto', background: '#0a0502', paddingBottom: 100, zIndex: 40}}>
      <div className="modal-header">
        <ChevronLeft onClick={() => setActiveTab('home')} className="back-btn" />
        <h2>My Profile</h2>
        <div style={{width: 24}}></div>
      </div>
      <div className="modal-content">
        <div className="profile-header-card glass-btn">
          <div className="p-avatar"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.mobile}`} alt="profile"/></div>
          <div className="p-details"><h3>+91 {user?.mobile}</h3><p>ID: {user?.id} | Role: {user?.role.toUpperCase()}</p></div>
        </div>

        <div className="p-menu glass-btn" style={{padding: 0, marginTop: 20}}>
          {user?.role === 'admin' && (
            <div className="p-menu-item" onClick={() => {setActiveTab('home'); setCurrentRoute('admin');}}>
              <ShieldAlert size={20} className="icon-gold"/><span>Admin Dashboard</span><ChevronLeft size={16} style={{transform: 'rotate(180deg)'}} className="ml-auto"/>
            </div>
          )}
          <div className="p-menu-item" onClick={() => {setActiveTab('home'); setCurrentRoute('wallet');}}><Wallet size={20} className="icon-gold"/><span>Withdraw Funds</span><ChevronLeft size={16} style={{transform: 'rotate(180deg)'}} className="ml-auto"/></div>
          <div className="p-menu-item" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 size={20} className="icon-gold"/> : <VolumeX size={20} className="icon-gold"/>}
            <span>Sound Effects {soundEnabled ? 'ON' : 'OFF'}</span>
            <ChevronLeft size={16} style={{transform: 'rotate(180deg)'}} className="ml-auto"/>
          </div>
          <div className="p-menu-item logout" onClick={logout}><LogOut size={20} /><span>Logout</span></div>
        </div>
      </div>
    </div>
  );

  const renderAdminPanel = () => {
    return (
      <div className="crash-game-container fade-in" style={{overflowY: 'auto'}}>
        <header className="top-header glass-header">
          <ChevronLeft size={24} className="icon-gold" onClick={() => {setCurrentRoute('lobby'); setActiveTab('profile');}} style={{cursor: 'pointer'}} />
          <div className="header-title">Admin Control</div>
          <ShieldAlert size={20} className="icon-gold" />
        </header>

        <div className="admin-tabs" style={{display:'flex', gap:10, padding: 15}}>
          <button className={`glass-btn ${adminTab==='users'?'active-nav':''}`} style={{flex:1}} onClick={()=>setAdminTab('users')}>Users</button>
          <button className={`glass-btn ${adminTab==='withdrawals'?'active-nav':''}`} style={{flex:1}} onClick={()=>setAdminTab('withdrawals')}>Withdraws</button>
          <button className={`glass-btn ${adminTab==='game'?'active-nav':''}`} style={{flex:1}} onClick={()=>setAdminTab('game')}>Game</button>
        </div>

        {adminTab === 'users' && (
          <div className="glass-panel" style={{margin: '0 10px 20px 10px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 15}}>
              <h4 className="gold-text">Registered Users</h4>
              <button className="glass-btn-small" onClick={fetchAdminData}>Refresh</button>
            </div>
            
            <table className="players-table" style={{fontSize: 12}}>
              <thead><tr><th>Mobile</th><th>Balance</th><th>Action</th></tr></thead>
              <tbody>
                {adminUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.mobile}</td>
                    <td className="gold-text">₹{u.balance.toFixed(0)}</td>
                    <td>
                      <div style={{display:'flex', gap: 5}}>
                        <button className="glass-btn-small" style={{background: 'rgba(0,255,0,0.1)'}} onClick={() => handleBalanceUpdate(u.id, 500)} disabled={adminActionLoading}>+500</button>
                        <button className="glass-btn-small" style={{background: 'rgba(255,0,0,0.1)'}} onClick={() => handleBalanceUpdate(u.id, -500)} disabled={adminActionLoading}>-500</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {adminTab === 'withdrawals' && (
          <div className="glass-panel" style={{margin: '0 10px 20px 10px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 15}}>
              <h4 className="gold-text">Pending Withdrawals</h4>
              <button className="glass-btn-small" onClick={fetchAdminData}>Refresh</button>
            </div>
            {adminWithdrawals.filter(w=>w.status==='pending').length === 0 && <p style={{color:'#aaa', textAlign:'center'}}>No pending requests</p>}
            {adminWithdrawals.filter(w=>w.status==='pending').map(w => (
              <div key={w.id} style={{background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, marginBottom: 10}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 5}}>
                  <span style={{color: '#fff'}}>User: {w.mobile}</span>
                  <span className="gold-text" style={{fontWeight:'bold'}}>₹{w.amount}</span>
                </div>
                <div style={{fontSize: 12, color: '#aaa', marginBottom: 10}}>
                  A/c: {w.account_number}<br/>IFSC: {w.ifsc_code}
                </div>
                <div style={{display:'flex', gap: 10}}>
                  <button className="primary-btn-large" style={{flex:1, marginTop:0, background:'#00e676'}} onClick={() => handleWithdrawalStatus(w.id, 'approved')} disabled={adminActionLoading}>Approve</button>
                  <button className="primary-btn-large" style={{flex:1, marginTop:0, background:'#f44336'}} onClick={() => handleWithdrawalStatus(w.id, 'rejected')} disabled={adminActionLoading}>Reject</button>
                </div>
              </div>
            ))}
            
            <h4 className="gold-text" style={{marginTop: 20, marginBottom: 10}}>History</h4>
            {adminWithdrawals.filter(w=>w.status!=='pending').map(w => (
              <div key={w.id} style={{display:'flex', justifyContent:'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                <span style={{fontSize: 12}}>₹{w.amount} - {w.mobile}</span>
                <span style={{fontSize: 12, color: w.status==='approved' ? '#00e676' : '#f44336'}}>{w.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}

        {adminTab === 'game' && (
          <div className="glass-panel" style={{margin: '0 10px 20px 10px'}}>
            <h4 className="gold-text" style={{marginBottom: 15}}>Rig Crash Game</h4>
            <p style={{color: '#aaa', fontSize: 14, marginBottom: 15}}>Enter a multiplier to force the NEXT round to crash exactly at that number.</p>
            <div className="input-group" style={{display:'flex', gap: 10, marginBottom: 15}}>
              <input type="number" step="0.01" placeholder="e.g. 1.05" className="form-input" style={{flex: 1}} value={forceMultiplier} onChange={e => setForceMultiplier(e.target.value)} />
              <button className="primary-btn-large" style={{width: 'auto', marginTop: 0, padding: '0 20px'}} onClick={handleCrashForce} disabled={adminActionLoading}>Set Crash</button>
            </div>
            <div style={{background: 'rgba(255,0,0,0.1)', border: '1px solid #f44336', padding: 10, borderRadius: 8, fontSize: 12, color: '#ffaaaa'}}>
              Warning: This completely overrides the random engine for 1 round.
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWalletScreen = () => {
    return (
      <div className="crash-game-container fade-in" style={{overflowY: 'auto'}}>
        <header className="top-header glass-header">
          <ChevronLeft size={24} className="icon-gold" onClick={() => setCurrentRoute('lobby')} style={{cursor: 'pointer'}} />
          <div className="header-title">Wallet & Withdrawal</div>
          <Wallet size={20} className="icon-gold" />
        </header>

        <div className="balance-card glass-panel" style={{margin: '15px', textAlign: 'center'}}>
          <p style={{color: '#aaa', fontSize: 14}}>Total Balance</p>
          <h2 className="gold-text" style={{fontSize: 32}}>₹{balance.toFixed(2)}</h2>
        </div>

        <div style={{display:'flex', gap: 10, margin: '0 15px 20px 15px'}}>
          <button className={walletTab === 'deposit' ? 'primary-btn-large' : 'glass-btn'} style={{flex: 1, padding: 10}} onClick={() => setWalletTab('deposit')}>Deposit</button>
          <button className={walletTab === 'withdraw' ? 'primary-btn-large' : 'glass-btn'} style={{flex: 1, padding: 10}} onClick={() => setWalletTab('withdraw')}>Withdraw</button>
        </div>

        {walletTab === 'deposit' && (
          <div className="glass-panel" style={{margin: '0 15px 20px 15px', padding: 15}}>
            <h4 className="section-title" style={{marginBottom: 15}}>Recharge Amount</h4>
            <div style={{display: 'flex', gap: 10, marginBottom: 15, flexWrap: 'wrap'}}>
               {[500, 1000, 2000, 5000].map(amt => (
                 <button key={amt} className="glass-btn" style={{flex: '1 1 40%', padding: 10, border: depositAmount === amt.toString() ? '1px solid var(--gold-primary)' : ''}} onClick={() => setDepositAmount(amt.toString())}>₹{amt}</button>
               ))}
            </div>
            <input type="number" placeholder="Enter Custom Amount" className="form-input" style={{marginBottom: 15}} value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
            <button className="primary-btn-large" onClick={() => {
              if(!depositAmount || Number(depositAmount) < 100) return showToast('Minimum deposit is ₹100');
              setBalance(prev => prev + Number(depositAmount));
              showToast(`Successfully initiated recharge of ₹${depositAmount}!`);
              setDepositAmount('');
            }}>Recharge Now</button>
          </div>
        )}

        {walletTab === 'withdraw' && (
          <>
            <h4 className="section-title" style={{marginLeft: 15}}>Withdraw Funds</h4>
            <div className="glass-panel" style={{margin: '0 15px 20px 15px', padding: 15}}>
              <input type="number" placeholder="Enter Amount to Withdraw" className="form-input" style={{marginBottom: 15}} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
              <button className="primary-btn-large" onClick={async () => {
                if(!withdrawAmount || Number(withdrawAmount) < 100) return showToast('Minimum withdrawal is ₹100');
                if(Number(withdrawAmount) > balance) return showToast('Insufficient balance!');
                try {
                  const res = await fetch(`${API_BASE}/bank/withdraw`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ amount: Number(withdrawAmount) })
                  });
                  const data = await res.json();
                  if(data.success) {
                    setBalance(prev => prev - Number(withdrawAmount));
                    showToast(`Withdrawal request of ₹${withdrawAmount} submitted!`);
                    setWithdrawAmount('');
                  } else {
                    showToast(data.error || 'Withdrawal failed');
                  }
                } catch(e) {
                  showToast('Error requesting withdrawal');
                }
              }}>Request Withdrawal</button>
            </div>

            <h4 className="section-title" style={{marginLeft: 15}}>Bank Setup</h4>
            <div className="glass-panel" style={{margin: '0 15px 20px 15px', padding: 15}}>
              {bankDetails ? (
                <div style={{display:'flex', flexDirection:'column', gap: 10}}>
                  <input type="text" placeholder="Bank Name" className="form-input" value={bankDetails.bank_name} onChange={e => setBankDetails({...bankDetails, bank_name: e.target.value})} />
                  <input type="text" placeholder="Account Number" className="form-input" value={bankDetails.account_number} onChange={e => setBankDetails({...bankDetails, account_number: e.target.value})} />
                  <input type="text" placeholder="IFSC Code" className="form-input" value={bankDetails.ifsc_code} onChange={e => setBankDetails({...bankDetails, ifsc_code: e.target.value})} />
                  <input type="text" placeholder="UPI ID" className="form-input" value={bankDetails.upi_id} onChange={e => setBankDetails({...bankDetails, upi_id: e.target.value})} />
                  <button className="primary-btn-large" style={{padding: 10, fontSize: 14}} onClick={saveBankDetails}>Save Bank Details</button>
                </div>
              ) : <p style={{textAlign: 'center', fontSize: 12}}>Loading...</p>}
            </div>
          </>
        )}

        <h4 className="section-title" style={{marginLeft: 15}}>Transaction History</h4>
        <div className="glass-panel" style={{margin: '0 15px 20px 15px', padding: 15}}>
          <p style={{textAlign: 'center', color: '#888', fontSize: 12}}>No recent transactions found.</p>
        </div>
      </div>
    );
  };

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
           <marquee>🎉 <b>91****9876</b> just won ₹15,000 in Crash! &nbsp; &nbsp; 🎉 <b>91****5432</b> just won ₹5,200 in Parity!</marquee>
        </div>
      </div>
    </div>
  );

  if (!token || !user) return renderLogin();

  return (
    <div className="mobile-wrapper">
      {toastMessage && <div className="toast-notification">{toastMessage}</div>}
      {currentRoute === 'lobby' && renderLobby()}
      {currentRoute === 'crash' && renderCrashGame()}
      {currentRoute === 'parity' && renderFastParity()}
      {currentRoute === 'mines' && renderMines()}
      {currentRoute === 'dice' && renderDice()}
      {currentRoute === 'admin' && renderAdminPanel()}
      {currentRoute === 'wallet' && renderWalletScreen()}

      {/* Overlay Screens */}
      {activeTab === 'profile' && renderProfileScreen()}
      {activeTab === 'invite' && renderInviteScreen()}
      {activeTab === 'quests' && renderQuestsScreen()}

      {/* Bottom Nav Bar */}
      {currentRoute === 'lobby' && (
        <div className="bottom-nav glass-nav">
          <div className="nav-item" onClick={() => {setActiveTab('home'); setCurrentRoute('wallet');}}><Wallet size={24} /><span>Recharge</span></div>
          <div className={`nav-item ${activeTab === 'invite' ? 'active-nav' : ''}`} onClick={() => setActiveTab('invite')}><LinkIcon size={24} /><span>Invite</span></div>
          <div className={`nav-item center-tab ${activeTab === 'home' ? 'active-nav' : ''}`} onClick={() => setActiveTab('home')}><div className="center-icon-bg"><Crown size={28} /></div><span style={{fontWeight: 'bold'}}>HOME</span></div>
          <div className={`nav-item ${activeTab === 'quests' ? 'active-nav' : ''}`} onClick={() => setActiveTab('quests')}><CalendarCheck size={24} /><span>Quests</span></div>
          <div className={`nav-item ${activeTab === 'profile' ? 'active-nav' : ''}`} onClick={() => setActiveTab('profile')}><User size={24} /><span>My</span></div>
        </div>
      )}
    </div>
  );
}

export default App;
