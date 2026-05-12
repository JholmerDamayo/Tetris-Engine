
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  COLS, ROWS, TETROMINOS, SCORING, INITIAL_LEVEL, 
  BASE_SPEED, SPEED_INCREMENT, MINIMUM_SPEED, LINES_PER_LEVEL,
  MISDROP_THRESHOLD
} from '../constants';
import { GameStatus, ShapeType, Tetromino, Position, GameStats, PlayerState } from '../types';
import { useInterval } from '../hooks/useInterval';
import Peer from 'https://esm.sh/peerjs@1.5.4';

interface Props {
  status: GameStatus;
  setStatus: (status: GameStatus) => void;
  onGameOver: (stats: GameStats) => void;
  onAchievementUnlock: (id: string) => void;
  onStatsUpdate: (stats: GameStats) => void;
  // Multiplayer Props
  multiplayerMode?: boolean;
  initialPlayers?: PlayerState[];
  peer?: Peer;
  isHost?: boolean;
  currentHighScore: number;
}

const TetrisGame: React.FC<Props> = ({ 
  status, setStatus, onGameOver, onAchievementUnlock, onStatsUpdate,
  multiplayerMode = false, initialPlayers = [], peer, currentHighScore
}) => {
  const getRandomTetromino = (): Tetromino => {
    const keys = Object.keys(TETROMINOS) as ShapeType[];
    return TETROMINOS[keys[Math.floor(Math.random() * keys.length)]];
  };

  const [grid, setGrid] = useState<(string | null)[][]>(() => 
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [activePiece, setActivePiece] = useState<Tetromino | null>(null);
  
  const [nextPieces, setNextPieces] = useState<Tetromino[]>(() => [
    getRandomTetromino(),
    getRandomTetromino(),
    getRandomTetromino()
  ]);

  const [heldPiece, setHeldPiece] = useState<Tetromino | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [pos, setPos] = useState<Position>({ x: 3, y: 0 });
  const [garbageInQueue, setGarbageInQueue] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  
  const [localSlot2Unlocked, setLocalSlot2Unlocked] = useState(false);
  const [localSlot3Unlocked, setLocalSlot3Unlocked] = useState(false);
  const [clearingRows, setClearingRows] = useState<number[]>([]);

  const [stats, setStats] = useState<GameStats>({
    score: 0, lines: 0, level: INITIAL_LEVEL, piecesPlaced: 0,
    timeSurvived: 0, lpm: 0, misdrops: 0, holdCount: 0, gamesPlayed: 0
  });

  const [dropTime, setDropTime] = useState<number | null>(BASE_SPEED);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    const hasGlobalRecord = currentHighScore > 0;
    if (!localSlot2Unlocked) {
      const s2Target = hasGlobalRecord ? currentHighScore : 2000;
      if (stats.score >= s2Target) setLocalSlot2Unlocked(true);
    }
    if (!localSlot3Unlocked) {
      const s3Target = hasGlobalRecord ? currentHighScore * 0.5 : 5000;
      if (stats.score >= s3Target) setLocalSlot3Unlocked(true);
    }
  }, [stats.score, currentHighScore, localSlot2Unlocked, localSlot3Unlocked, status]);

  const calculateSpeed = (currentLevel: number) => {
    const speed = BASE_SPEED - (currentLevel - 1) * SPEED_INCREMENT;
    return Math.max(MINIMUM_SPEED, speed);
  };

  const resetGame = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setStats({
      score: 0, lines: 0, level: INITIAL_LEVEL, piecesPlaced: 0,
      timeSurvived: 0, lpm: 0, misdrops: 0, holdCount: 0, gamesPlayed: stats.gamesPlayed + 1
    });
    setDropTime(BASE_SPEED);
    setHeldPiece(null);
    setCanHold(true);
    setNextPieces([getRandomTetromino(), getRandomTetromino(), getRandomTetromino()]);
    setActivePiece(null);
    setGarbageInQueue(0);
    setIsNewRecord(false);
    setClearingRows([]);
    setLocalSlot2Unlocked(false);
    setLocalSlot3Unlocked(false);
    setStatus(GameStatus.PLAYING);
  };

  const checkCollision = (position: Position, shape: number[][], currentGrid: (string | null)[][]): boolean => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = position.x + x;
          const newY = position.y + y;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && currentGrid[newY][newX] !== null)) return true;
        }
      }
    }
    return false;
  };

  const addGarbage = useCallback((linesToAdd: number) => {
    setGrid(prev => {
      const newGrid = prev.slice(linesToAdd);
      const holeX = Math.floor(Math.random() * COLS);
      for (let i = 0; i < linesToAdd; i++) {
        const row = Array(COLS).fill('#555555');
        row[holeX] = null;
        newGrid.push(row);
      }
      return newGrid;
    });
  }, []);

  const spawnPiece = useCallback((pieceToSpawn?: Tetromino) => {
    if (clearingRows.length > 0) return;
    let piece: Tetromino;
    if (pieceToSpawn) {
      piece = pieceToSpawn;
    } else {
      piece = nextPieces[0];
      setNextPieces(prev => [...prev.slice(1), getRandomTetromino()]);
    }
    if (garbageInQueue > 0) {
      addGarbage(garbageInQueue);
      setGarbageInQueue(0);
    }
    const startX = Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2);
    const startPos = { x: startX, y: 0 };
    if (checkCollision(startPos, piece.shape, grid)) {
      setStatus(GameStatus.GAMEOVER);
      const isRecord = stats.score > currentHighScore;
      setIsNewRecord(isRecord);
      onGameOver(stats);
      setDropTime(null);
    } else {
      setActivePiece(piece);
      setPos(startPos);
    }
  }, [nextPieces, grid, stats, onGameOver, setStatus, garbageInQueue, addGarbage, currentHighScore, clearingRows.length]);

  const handleHold = useCallback(() => {
    if (!activePiece || !canHold || status !== GameStatus.PLAYING || clearingRows.length > 0) return;
    const currentHeld = heldPiece;
    const pieceToHold = TETROMINOS[activePiece.type];
    setHeldPiece(pieceToHold);
    setCanHold(false);
    setStats(s => ({ ...s, holdCount: s.holdCount + 1 }));
    if (currentHeld) spawnPiece(currentHeld);
    else spawnPiece();
  }, [activePiece, heldPiece, canHold, status, spawnPiece, clearingRows.length]);

  const rotate = (matrix: number[][]): number[][] => matrix[0].map((_, index) => matrix.map(col => col[index]).reverse());

  const handleRotate = () => {
    if (!activePiece || status !== GameStatus.PLAYING || clearingRows.length > 0) return;
    const rotatedShape = rotate(activePiece.shape);
    let offset = 0;
    if (checkCollision({ x: pos.x, y: pos.y }, rotatedShape, grid)) {
        offset = 1;
        if (checkCollision({ x: pos.x + offset, y: pos.y }, rotatedShape, grid)) {
            offset = -1;
            if (checkCollision({ x: pos.x + offset, y: pos.y }, rotatedShape, grid)) offset = 0;
        }
    }
    if (offset !== 0 || !checkCollision({ x: pos.x, y: pos.y }, rotatedShape, grid)) {
        setActivePiece({ ...activePiece, shape: rotatedShape });
        setPos(prev => ({ ...prev, x: prev.x + offset }));
    }
  };

  const lockPiece = useCallback((finalPos: Position, finalPiece: Tetromino) => {
    let misdropped = false;
    if (finalPos.y < MISDROP_THRESHOLD) misdropped = true;
    const newGridWithPiece = grid.map(row => [...row]);
    finalPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const boardY = finalPos.y + y;
          const boardX = finalPos.x + x;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newGridWithPiece[boardY][boardX] = finalPiece.color;
          }
        }
      });
    });

    const fullRows: number[] = [];
    newGridWithPiece.forEach((row, y) => {
      if (row.every(cell => cell !== null)) fullRows.push(y);
    });

    if (fullRows.length > 0) {
      setGrid(newGridWithPiece);
      setClearingRows(fullRows);
      setDropTime(null);
      setTimeout(() => {
        setGrid(currentGrid => {
          const finalGrid = currentGrid.reduce((acc, row, idx) => {
            if (fullRows.includes(idx)) {
              acc.unshift(Array(COLS).fill(null));
            } else acc.push(row);
            return acc;
          }, [] as (string | null)[][]);
          return finalGrid;
        });
        const lineScores = [0, SCORING.SINGLE, SCORING.DOUBLE, SCORING.TRIPLE, SCORING.TETRIS];
        const addedScore = lineScores[fullRows.length] * stats.level;
        const newLines = stats.lines + fullRows.length;
        const newLevel = Math.floor(newLines / LINES_PER_LEVEL) + 1;
        const newStats = {
          ...stats,
          score: stats.score + addedScore,
          lines: newLines,
          level: newLevel,
          piecesPlaced: stats.piecesPlaced + 1,
          misdrops: stats.misdrops + (misdropped ? 1 : 0)
        };
        setStats(newStats);
        setDropTime(calculateSpeed(newLevel));
        onStatsUpdate(newStats);
        setClearingRows([]);
        setCanHold(true);
        setActivePiece(null);
      }, 300);
    } else {
      setGrid(newGridWithPiece);
      setStats(prev => ({...prev, piecesPlaced: prev.piecesPlaced + 1, misdrops: prev.misdrops + (misdropped ? 1 : 0)}));
      setCanHold(true);
      setActivePiece(null);
    }
  }, [grid, stats, onStatsUpdate]);

  const drop = useCallback(() => {
    if (!activePiece || status !== GameStatus.PLAYING || clearingRows.length > 0) return;
    if (!checkCollision({ x: pos.x, y: pos.y + 1 }, activePiece.shape, grid)) setPos(prev => ({ ...prev, y: prev.y + 1 }));
    else lockPiece(pos, activePiece);
  }, [activePiece, pos, grid, status, lockPiece, clearingRows.length]);

  const hardDrop = () => {
    if (!activePiece || status !== GameStatus.PLAYING || clearingRows.length > 0) return;
    let currentY = pos.y;
    while (!checkCollision({ x: pos.x, y: currentY + 1 }, activePiece.shape, grid)) currentY++;
    setStats(s => ({ ...s, score: s.score + (currentY - pos.y) * SCORING.HARD_DROP }));
    lockPiece({ x: pos.x, y: currentY }, activePiece);
  };

  const move = (dir: number) => {
    if (!activePiece || status !== GameStatus.PLAYING || clearingRows.length > 0) return;
    if (!checkCollision({ x: pos.x + dir, y: pos.y }, activePiece.shape, grid)) setPos(prev => ({ ...prev, x: prev.x + dir }));
  };

  useInterval(() => { if (status === GameStatus.PLAYING) drop(); }, dropTime);
  useInterval(() => {
    if (status === GameStatus.PLAYING) setStats(s => ({ ...s, timeSurvived: s.timeSurvived + 1 }));
  }, status === GameStatus.PLAYING ? 1000 : null);

  useEffect(() => { 
    if (status === GameStatus.PLAYING && !activePiece && clearingRows.length === 0) spawnPiece(); 
  }, [status, activePiece, spawnPiece, clearingRows.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'p' || e.key === 'P') && !multiplayerMode) {
        if (status === GameStatus.PLAYING) {
          setStatus(GameStatus.PAUSED);
        } else if (status === GameStatus.PAUSED) {
          setStatus(GameStatus.PLAYING);
        }
        return;
      }

      if (status !== GameStatus.PLAYING || clearingRows.length > 0) return;

      switch (e.key) {
        case 'ArrowLeft': move(-1); break;
        case 'ArrowRight': move(1); break;
        case 'ArrowDown': setStats(s => ({...s, score: s.score + SCORING.SOFT_DROP})); drop(); break;
        case 'ArrowUp': handleRotate(); break;
        case ' ': e.preventDefault(); hardDrop(); break;
        case 'c':
        case 'C':
        case 'Shift': e.preventDefault(); handleHold(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, pos, activePiece, grid, handleHold, multiplayerMode, clearingRows.length]);

  const ghostY = (() => {
    if (!activePiece) return pos.y;
    let y = pos.y;
    while (!checkCollision({ x: pos.x, y: y + 1 }, activePiece.shape, grid)) y++;
    return y;
  })();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center p-4">
      <style>{`
        @keyframes pop-crack {
          0% { transform: scale(1); filter: brightness(1); opacity: 1; }
          20% { transform: scale(1.15, 1.3); filter: brightness(4) saturate(2); opacity: 1; }
          40% { transform: scale(1.1, 1.2) translateX(-2px); filter: brightness(3); opacity: 1; }
          50% { transform: scale(1.12, 1.2) translateX(2px); filter: brightness(5); }
          60% { transform: scale(1.05, 1.1) translateX(-1px); }
          100% { transform: scale(0.5, 0.1); filter: brightness(10); opacity: 0; }
        }
        .animate-pop-crack {
          animation: pop-crack 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards;
          z-index: 50;
        }
      `}</style>

      <div className="hidden xl:flex flex-col gap-4 w-28">
        <section className="bg-neutral-900/50 backdrop-blur border border-neutral-800 p-3 rounded-xl flex flex-col items-center shadow-xl">
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2">Hold</p>
          <div className="h-14 w-full flex items-center justify-center bg-black/40 rounded-lg">
             {heldPiece && (
               <div className="grid" style={{ gridTemplateColumns: `repeat(${heldPiece.shape[0].length}, 0.75rem)`, gap: '1px' }}>
                  {heldPiece.shape.map((row, y) => row.map((cell, x) => (
                      <div key={`${x}-${y}`} className={`w-3 h-3 rounded-sm ${!canHold ? 'opacity-30' : ''}`} style={{ backgroundColor: cell ? heldPiece.color : 'transparent' }} />
                  )))}
               </div>
             )}
          </div>
        </section>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-b from-cyan-500/20 to-purple-500/20 rounded-2xl blur-lg transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-neutral-950 border border-neutral-800 rounded-xl p-1.5 shadow-2xl overflow-hidden">
          <div className="grid grid-cols-10 gap-[1px] bg-neutral-900/50" style={{ width: '280px', height: '560px' }}>
            {grid.map((row, y) => row.map((cell, x) => {
              let color = cell;
              let isGhost = false;
              let isActive = false;
              const isClearing = clearingRows.includes(y);
              if (!isClearing && activePiece) {
                const pieceY = y - pos.y;
                const pieceX = x - pos.x;
                if (pieceY >= 0 && pieceY < activePiece.shape.length && pieceX >= 0 && pieceX < activePiece.shape[0].length && activePiece.shape[pieceY][pieceX] !== 0) {
                  color = activePiece.color;
                  isActive = true;
                } else {
                  const ghostPieceY = y - ghostY;
                  if (ghostPieceY >= 0 && ghostPieceY < activePiece.shape.length && pieceX >= 0 && pieceX < activePiece.shape[0].length && activePiece.shape[ghostPieceY][pieceX] !== 0) {
                    color = activePiece.color;
                    isGhost = true;
                  }
                }
              }
              return (
                <div key={`${x}-${y}`} 
                  className={`w-full h-full rounded-sm transition-colors duration-100 ${color ? '' : 'bg-neutral-950/40'} ${isClearing ? 'animate-pop-crack' : ''}`}
                  style={{ 
                      backgroundColor: color ? (isGhost ? 'transparent' : color) : undefined,
                      boxShadow: isActive ? `inset 0 0 10px rgba(255,255,255,0.4), 0 0 15px ${color}88` : undefined,
                      border: isGhost ? `1px dashed ${color}55` : undefined
                  }}
                />
              );
            }))}
          </div>

          {status === GameStatus.PAUSED && (
            <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50 animate-in fade-in duration-300">
              <div className="mb-4 relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full animate-pulse"></div>
                <div className="relative w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.4)]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6" />
                  </svg>
                </div>
              </div>
              <h3 className="text-4xl font-black uppercase text-white italic tracking-tighter leading-none">Paused</h3>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.3em] mt-2">Press 'P' to resume</p>
            </div>
          )}

          {status === GameStatus.GAMEOVER && (
            <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center z-50 animate-in fade-in zoom-in duration-500">
              {isNewRecord ? (
                <div className="w-full flex flex-col items-center">
                   <div className="mb-2 relative">
                      <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full animate-pulse"></div>
                      <div className="relative w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)]">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
                      </div>
                   </div>
                   <div className="space-y-1 mb-4">
                      <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.5em] animate-bounce">CONGRATULATIONS</p>
                      <h3 className="text-2xl font-black uppercase text-white italic tracking-tighter leading-none">NEW PEAK RECORD DETECTED</h3>
                   </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 relative">
                     <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>
                     <div className="relative w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                     </div>
                  </div>
                  <div className="mb-4">
                    <h3 className="text-4xl font-black uppercase text-white italic tracking-tighter leading-none">Game Over</h3>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.4em] mt-2">After Action Report</p>
                  </div>
                </>
              )}
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 my-2 grid grid-cols-2 gap-4">
                 <div className="text-left bg-black/40 p-2 rounded-lg border border-white/5">
                   <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Score</p>
                   <p className={`text-lg font-mono font-black ${isNewRecord ? 'text-amber-400' : 'text-white'}`}>{stats.score.toLocaleString()}</p>
                 </div>
                 <div className="text-right bg-black/40 p-2 rounded-lg border border-white/5">
                   <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Max Level</p>
                   <p className="text-lg font-mono font-black text-amber-500">{stats.level}</p>
                 </div>
              </div>
              <div className="w-full space-y-3 px-4 mt-4">
                <button onClick={resetGame} className={`group relative w-full py-4 ${isNewRecord ? 'bg-amber-500 text-black' : 'bg-white text-black'} font-black text-xs rounded-xl uppercase tracking-widest overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  New Game
                </button>
                <button onClick={() => setStatus(GameStatus.START)} className="w-full py-3 bg-neutral-900 text-neutral-400 border border-neutral-800 font-bold text-[10px] rounded-xl uppercase tracking-widest hover:text-white hover:border-neutral-700 transition-colors">
                  Exit to Menu
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-row xl:flex-col gap-4 w-full max-w-[280px] xl:w-44">
        <section className="flex-1 bg-neutral-900/50 backdrop-blur border border-neutral-800 p-4 rounded-xl flex flex-col items-center shadow-lg relative">
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-3">Next Ops</p>
          <div className="w-full flex flex-col gap-3">
            {nextPieces.map((piece, idx) => {
              const isSlotUnlocked = idx === 0 || (idx === 1 && localSlot2Unlocked) || (idx === 2 && localSlot3Unlocked);
              const hasGlobalRecord = currentHighScore > 0;
              let lockMessage = "";
              let conditionExplainer = "";
              if (idx === 1 && !isSlotUnlocked) {
                lockMessage = "ENCRYPTED";
                conditionExplainer = !hasGlobalRecord ? "CALIBRATION: 2,000" : `MATCH PEAK: ${currentHighScore.toLocaleString()}`;
              }
              if (idx === 2 && !isSlotUnlocked) {
                lockMessage = "ENCRYPTED";
                conditionExplainer = !hasGlobalRecord ? "CALIBRATION: 5,000" : `50% PEAK: ${(currentHighScore * 0.5).toLocaleString()}`;
              }
              return (
                <div key={idx} className={`relative h-14 w-full flex items-center justify-center rounded-lg transition-all duration-500 border overflow-hidden ${
                  isSlotUnlocked ? 'bg-black/40 border-white/5' : 'bg-black/80 border-red-500/20 grayscale opacity-40'
                }`}>
                  {isSlotUnlocked ? (
                    <>
                      <div className="grid" style={{ gridTemplateColumns: `repeat(${piece.shape[0].length}, 0.75rem)`, gap: '1px' }}>
                        {piece.shape.map((row, y) => row.map((cell, x) => (
                            <div key={`${x}-${y}`} className="w-3 h-3 rounded-sm" style={{ backgroundColor: cell ? piece.color : 'transparent' }} />
                        )))}
                      </div>
                      <span className="absolute top-1 left-1 px-1 bg-cyan-500/10 text-[6px] text-cyan-400 font-black rounded border border-cyan-500/20 uppercase tracking-tighter">BLOCK {idx+1} ONLINE</span>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-center px-1">
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-red-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        <span className="text-[7px] font-black text-red-500/80 uppercase tracking-widest">{lockMessage}</span>
                      </div>
                      <span className="text-[6px] font-bold text-neutral-500 uppercase leading-none">{conditionExplainer}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        <section className="flex-1 bg-neutral-900/50 backdrop-blur border border-neutral-800 p-4 rounded-xl space-y-4 shadow-lg">
          <div>
            <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Total Score</p>
            <p className="text-xl font-mono font-black text-white">{stats.score.toLocaleString()}</p>
          </div>
          <div className="flex justify-between border-t border-white/5 pt-3">
             <div className="text-center">
                <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-tighter">LVL</p>
                <p className="text-xs font-mono font-bold text-amber-400">{stats.level}</p>
             </div>
             <div className="text-center">
                <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-tighter">LINES</p>
                <p className="text-xs font-mono font-bold text-purple-400">{stats.lines}</p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TetrisGame;
