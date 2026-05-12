
import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'https://esm.sh/peerjs@1.5.4';
import { GameStatus, PlayerState, NetworkMessage } from '../types';

interface LobbyProps {
  playerName: string;
  onStartGame: (players: PlayerState[], isHost: boolean, peer: Peer) => void;
  onBack: () => void;
}

const MultiplayerLobby: React.FC<LobbyProps> = ({ playerName, onStartGame, onBack }) => {
  const [peerId, setPeerId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'IN_LOBBY'>('IDLE');
  
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Record<string, DataConnection>>({});

  useEffect(() => {
    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  const createRoom = () => {
    setStatus('CONNECTING');
    const newPeer = new Peer(`NEON-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    
    newPeer.on('open', (id) => {
      setPeerId(id);
      setIsHost(true);
      setStatus('IN_LOBBY');
      setPlayers([{
        id, name: playerName, isHost: true, isReady: true, isAlive: true,
        grid: Array.from({ length: 20 }, () => Array(10).fill(null)),
        score: 0, level: 1, lines: 0, activePiece: null, nextPiece: null, heldPiece: null,
        pos: { x: 3, y: 0 }, garbageQueue: 0
      }]);
    });

    newPeer.on('connection', (conn) => {
      conn.on('data', (data: any) => {
        const msg = data as NetworkMessage;
        if (msg.type === 'JOIN_REQUEST') {
          const newPlayer: PlayerState = {
            id: conn.peer, name: msg.payload.name, isHost: false, isReady: false, isAlive: true,
            grid: Array.from({ length: 20 }, () => Array(10).fill(null)),
            score: 0, level: 1, lines: 0, activePiece: null, nextPiece: null, heldPiece: null,
            pos: { x: 3, y: 0 }, garbageQueue: 0
          };
          setPlayers(prev => {
            const next = [...prev, newPlayer];
            // Broadcast new state
            // FIX: Cast Object.values to DataConnection[] and use newPeer.id instead of undefined id
            (Object.values(connectionsRef.current) as DataConnection[]).forEach(c => {
              c.send({ type: 'ROOM_STATE', payload: { players: next }, senderId: newPeer.id });
            });
            return next;
          });
          connectionsRef.current[conn.peer] = conn;
          // FIX: Use newPeer.id instead of undefined id
          conn.send({ type: 'ROOM_STATE', payload: { players: [...players, newPlayer] }, senderId: newPeer.id });
        }
        if (msg.type === 'PLAYER_READY') {
          setPlayers(prev => {
            const next = prev.map(p => p.id === msg.senderId ? { ...p, isReady: !p.isReady } : p);
            // FIX: Cast Object.values to DataConnection[] and use newPeer.id instead of undefined id
            (Object.values(connectionsRef.current) as DataConnection[]).forEach(c => {
               c.send({ type: 'ROOM_STATE', payload: { players: next }, senderId: newPeer.id });
            });
            return next;
          });
        }
      });
    });

    peerRef.current = newPeer;
  };

  const joinRoom = () => {
    if (!roomCode.trim()) return;
    setStatus('CONNECTING');
    const newPeer = new Peer();
    
    newPeer.on('open', (id) => {
      const conn = newPeer.connect(roomCode.toUpperCase());
      conn.on('open', () => {
        setIsHost(false);
        setStatus('IN_LOBBY');
        conn.send({ type: 'JOIN_REQUEST', payload: { name: playerName }, senderId: id });
      });

      conn.on('data', (data: any) => {
        const msg = data as NetworkMessage;
        if (msg.type === 'ROOM_STATE') setPlayers(msg.payload.players);
        if (msg.type === 'GAME_START') onStartGame(msg.payload.players, false, newPeer);
      });
    });

    peerRef.current = newPeer;
  };

  const toggleReady = () => {
    const id = peerRef.current?.id;
    if (!id) return;
    if (isHost) {
      setPlayers(prev => prev.map(p => p.id === id ? { ...p, isReady: !p.isReady } : p));
    } else {
      const hostId = roomCode.toUpperCase();
      peerRef.current?.connect(hostId).send({ type: 'PLAYER_READY', senderId: id });
    }
  };

  const startGame = () => {
    if (!isHost) return;
    const msg: NetworkMessage = { type: 'GAME_START', payload: { players }, senderId: peerId, timestamp: Date.now() };
    // FIX: Cast Object.values to DataConnection[]
    (Object.values(connectionsRef.current) as DataConnection[]).forEach(c => c.send(msg));
    onStartGame(players, true, peerRef.current!);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto p-8 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl backdrop-blur-xl">
      <h2 className="text-3xl font-black italic uppercase mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
        LAN Tactical
      </h2>

      {status === 'IDLE' && (
        <div className="space-y-4 w-full">
          <button onClick={createRoom} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-[1.02] transition-transform">
            Create Room
          </button>
          <div className="flex gap-2">
            <input 
              value={roomCode} onChange={e => setRoomCode(e.target.value)} 
              placeholder="ROOM CODE" className="flex-1 bg-black border border-neutral-800 rounded-xl px-4 py-3 text-xs font-mono focus:border-cyan-500 outline-none uppercase" 
            />
            <button onClick={joinRoom} className="px-6 py-3 bg-neutral-800 text-white font-bold text-xs rounded-xl hover:bg-neutral-700">
              Join
            </button>
          </div>
          <button onClick={onBack} className="w-full text-neutral-500 text-[10px] font-bold uppercase tracking-widest hover:text-white mt-4">
            Back to Single Player
          </button>
        </div>
      )}

      {status === 'CONNECTING' && <div className="text-cyan-500 font-black animate-pulse uppercase tracking-[0.2em] text-xs">Synchronizing...</div>}

      {status === 'IN_LOBBY' && (
        <div className="w-full space-y-6">
          <div className="bg-black/50 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between">
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Room ID</p>
            <p className="font-mono text-cyan-400 font-black tracking-widest">{peerId || roomCode.toUpperCase()}</p>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
            {players.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-neutral-800/50 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${p.isReady ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                   <span className="text-xs font-bold uppercase">{p.name} {p.isHost && "(HOST)"}</span>
                </div>
                <span className={`text-[9px] font-black uppercase ${p.isReady ? 'text-emerald-500' : 'text-red-500'}`}>
                  {p.isReady ? 'Ready' : 'Waiting'}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 flex gap-3">
             <button onClick={toggleReady} className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] ${players.find(p => p.id === peerRef.current?.id)?.isReady ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500 text-black'}`}>
               {players.find(p => p.id === peerRef.current?.id)?.isReady ? 'Unready' : 'Ready Up'}
             </button>
             {isHost && (
               <button 
                 disabled={!players.every(p => p.isReady) || players.length < 2} 
                 onClick={startGame}
                 className="flex-1 py-3 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl disabled:opacity-20"
               >
                 Start Match
               </button>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiplayerLobby;
