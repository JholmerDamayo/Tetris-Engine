
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameStatus, GameStats, Achievement, PlayerState, User } from './types';
import { ACHIEVEMENTS_LIST } from './constants';
import TetrisGame from './components/TetrisGame';
import MultiplayerLobby from './components/MultiplayerLobby';
import GameGeniusChat from './components/GameGeniusChat';
import AuthModal from './components/AuthModal';
import Peer from 'https://esm.sh/peerjs@1.5.4';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [stats, setStats] = useState<GameStats | null>(null);
  
  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('logged-in-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [playerName, setPlayerName] = useState(() => {
    const savedUser = localStorage.getItem('logged-in-user');
    if (savedUser) return JSON.parse(savedUser).fullname;
    return localStorage.getItem('player-name') || `User-${Math.floor(Math.random()*9000)+1000}`;
  });
  
  // Global Highest Score - Persisted
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('tetris-high-score')) || 0);
  const [highScorePlayer, setHighScorePlayer] = useState(() => localStorage.getItem('tetris-high-score-player') || 'N/A');
  const [lastSession, setLastSession] = useState<{name: string, score: number} | null>(() => {
    const saved = localStorage.getItem('tetris-last-session');
    return saved ? JSON.parse(saved) : null;
  });

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState(false);
  const [roomPlayers, setRoomPlayers] = useState<PlayerState[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [peerInstance, setPeerInstance] = useState<Peer | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('unlocked-achievements');
    return new Set(saved ? JSON.parse(saved) : []);
  });
  const [toasts, setToasts] = useState<Achievement[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);

  useEffect(() => {
    if (user) {
      setPlayerName(user.fullname);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('player-name', playerName);
  }, [playerName]);

  const handleAuthSuccess = (newUser: User) => {
    setUser(newUser);
    setPlayerName(newUser.fullname);
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    
    // Artificial delay for the aesthetic loading screen
    setTimeout(() => {
      setUser(null);
      localStorage.removeItem('logged-in-user');
      localStorage.removeItem('tetris-last-session');
      setLastSession(null);
      setPlayerName(`User-${Math.floor(Math.random()*9000)+1000}`);
      setStatus(GameStatus.START);
      setIsLoggingOut(false);
    }, 1500);
  };

  const handleGameOver = (finalStats: GameStats) => {
    setStats(finalStats);
    
    // Update Last Session
    const session = { name: playerName, score: finalStats.score };
    setLastSession(session);
    localStorage.setItem('tetris-last-session', JSON.stringify(session));

    // Update Global High Score - ONLY if logged in
    if (user && finalStats.score > highScore) {
      setHighScore(finalStats.score);
      setHighScorePlayer(playerName);
      localStorage.setItem('tetris-high-score', finalStats.score.toString());
      localStorage.setItem('tetris-high-score-player', playerName);
    }
  };

  const handleAchievementUnlock = (id: string) => {
    if (!unlockedIds.has(id)) {
      const ach = ACHIEVEMENTS_LIST.find(a => a.id === id);
      if (ach) {
        setUnlockedIds(prev => {
          const next = new Set(prev).add(id);
          localStorage.setItem('unlocked-achievements', JSON.stringify(Array.from(next)));
          return next;
        });
        setToasts(prev => [...prev, ach]);
        setTimeout(() => setToasts(prev => prev.slice(1)), 4000);
      }
    }
  };

  const onStartMultiplayerGame = (players: PlayerState[], host: boolean, peer: Peer) => {
    setRoomPlayers(players);
    setIsHost(host);
    setPeerInstance(peer);
    setMultiplayerMode(true);
    setStatus(GameStatus.PLAYING);
  };

  const isGameActive = status === GameStatus.PLAYING || status === GameStatus.PAUSED || status === GameStatus.GAMEOVER;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-cyan-500/30 overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <header className="relative z-10 flex flex-col backdrop-blur-md border-b border-white/5 bg-black/20">
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h7" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Tetris Engine</h1>
              <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-[0.2em]">Augmented Performance Trainer</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
               <button 
                 onClick={handleLogout}
                 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-[0_5px_15px_rgba(239,68,68,0.1)] active:scale-95"
               >
                 <LogOut size={12} />
                 Sign Off
               </button>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="group relative flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest hover:translate-y-[-2px] active:translate-y-0 transition-all shadow-[0_10px_20px_rgba(6,182,212,0.2)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <LogIn size={12} className="relative z-10" />
                <span className="relative z-10">Login</span>
              </button>
            )}

            <div className="flex flex-col items-end mr-4">
              <p className="text-[8px] text-neutral-600 font-black uppercase tracking-widest">Operator Identity</p>
              <div className="flex items-center gap-2">
                {user && <UserIcon size={10} className="text-cyan-400" />}
                <input 
                  value={playerName} 
                  onChange={e => !user && setPlayerName(e.target.value)} 
                  readOnly={!!user}
                  className={`bg-transparent text-right py-0 text-xs font-mono font-bold text-cyan-400 outline-none hover:text-white focus:text-white transition-colors ${user ? 'cursor-default' : 'cursor-text'}`}
                />
              </div>
            </div>
            <button onClick={() => setShowAchievements(!showAchievements)} className="relative group p-3 rounded-full bg-neutral-900 border border-neutral-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unlockedIds.size > 0 && <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-cyan-500 text-[9px] font-black text-black flex items-center justify-center">{unlockedIds.size}</span>}
            </button>
          </div>
        </div>

        {/* Tactical Telemetry Bar */}
        <div className="flex items-center justify-between px-8 py-2 bg-white/[0.02] border-t border-white/5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest">Last Op:</span>
              <span className="text-[10px] font-mono text-neutral-300">
                {lastSession ? `${lastSession.name} [${lastSession.score.toLocaleString()}]` : 'None Recorded'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest">Global Peak:</span>
            <span className="text-[10px] font-mono text-emerald-400 font-black">
              {highScore > 0 ? `${highScorePlayer} [${highScore.toLocaleString()}]` : 'Calibration Required'}
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center overflow-hidden">
        {status === GameStatus.START && (
          <div className="text-center max-w-sm animate-in fade-in zoom-in duration-500">
            <div className="mb-8 relative inline-block">
               <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>
               <h2 className="relative text-6xl font-black uppercase mb-2 italic tracking-tighter">Ready?</h2>
               <p className="text-[10px] text-cyan-500/60 font-black uppercase tracking-[0.5em]">System Core Initialized</p>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setMultiplayerMode(false);
                  setStatus(GameStatus.PLAYING);
                }}
                className="group relative w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all hover:scale-[1.02] active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                Solo Practice
              </button>
              <button 
                onClick={() => setStatus(GameStatus.LOBBY)}
                className="w-full py-5 rounded-2xl bg-neutral-900 border border-neutral-800 text-white font-black uppercase tracking-[0.2em] text-sm hover:border-cyan-500 transition-all hover:bg-neutral-800"
              >
                LAN Multiplayer
              </button>
            </div>
          </div>
        )}

        {status === GameStatus.LOBBY && (
          <MultiplayerLobby 
            playerName={playerName} 
            onStartGame={onStartMultiplayerGame} 
            onBack={() => setStatus(GameStatus.START)} 
          />
        )}

        {isGameActive && (
          <TetrisGame 
            status={status} 
            setStatus={setStatus} 
            onGameOver={handleGameOver}
            onAchievementUnlock={handleAchievementUnlock}
            onStatsUpdate={s => setStats(s)}
            multiplayerMode={multiplayerMode}
            initialPlayers={roomPlayers}
            peer={peerInstance || undefined}
            isHost={isHost}
            currentHighScore={highScore}
          />
        )}
      </main>

      <GameGeniusChat />

      <AnimatePresence>
        {isLoggingOut && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-[#050505] flex flex-col items-center justify-center"
          >
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 rounded-full border-t-2 border-r-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-16 h-16 rounded-full border-b-2 border-l-2 border-purple-500" 
                />
              </div>
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 text-center"
            >
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">System Purge</h3>
              <p className="text-[10px] text-cyan-500/60 font-black uppercase tracking-[0.4em] mt-2">Securing Operator Credentials</p>
              <div className="mt-4 flex gap-1 justify-center">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1 h-1 bg-cyan-500"
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Overlays */}
      <div className="fixed bottom-8 left-8 z-[100] space-y-3">
        {toasts.map((ach, i) => (
          <div key={i} className="flex items-center gap-4 bg-white text-black p-4 rounded-2xl shadow-2xl animate-in slide-in-from-left duration-300">
            <h4 className="text-lg font-black uppercase leading-none">{ach.title}</h4>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
