import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/utils';
import { GameState, Player, MoveRecord } from '../types';
import CustomChessBoard from '../components/CustomChessBoard';
import { Copy, Users, Flag, Trophy, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const GameRoom: React.FC = () => {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = useMemo(() => getUserId(), []);

  const [game, setGame] = useState(new Chess());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerRole, setPlayerRole] = useState<Player['color']>('spectator');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and Fetch Game
  useEffect(() => {
    if (!gameId) return;

    const fetchGame = async () => {
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Game not found');

        // Determine Role
        let role: Player['color'] = 'spectator';
        if (data.player_white === userId) role = 'w';
        else if (data.player_black === userId) role = 'b';
        else if (!data.player_white) {
            // Claim White
            await supabase.from('games').update({ player_white: userId }).eq('id', gameId);
            role = 'w';
        } else if (!data.player_black) {
            // Claim Black
            await supabase.from('games').update({ player_black: userId, status: 'active' }).eq('id', gameId);
            role = 'b';
        }

        setPlayerRole(role);
        setGameState(data);
        const newGame = new Chess(data.fen);
        setGame(newGame);
        setLoading(false);

      } catch (err: any) {
        console.error('Error fetching game:', err);
        setError('Could not load game. It might not exist.');
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId, userId]);

  // Realtime Subscription
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const newData = payload.new as GameState;
          setGameState(newData);
          
          // Fallback sync if moves subscription misses or for status updates
          const newGame = new Chess(newData.fen);
          setGame((current) => {
             if (current.fen() !== newData.fen) return newGame;
             return current;
          });
          
          if (newData.status === 'finished') {
             // Basic win detection just to trigger confetti
             if (newGame.isCheckmate()) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
             }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moves', filter: `game_id=eq.${gameId}` },
        (payload) => {
            const newMove = payload.new as MoveRecord;
            // Immediate update from move for smoother experience
            setGame(new Chess(newMove.fen_after));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Handle Move
  const onPieceDrop = (sourceSquare: string, targetSquare: string, piece: string): boolean => {
    // Basic checks
    if (playerRole === 'spectator') return false;
    if (game.turn() !== playerRole) return false;
    if (gameState?.status === 'finished') return false;

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece[1]?.toLowerCase() ?? 'q', // auto-promote to queen for simplicity
      });

      if (!move) return false; // Illegal move

      // Optimistic Update
      setGame(gameCopy);

      // Persist to Backend
      const updateGame = async () => {
        const newFen = gameCopy.fen();
        let status = 'active';

        if (gameCopy.isCheckmate() || gameCopy.isDraw() || gameCopy.isStalemate() || gameCopy.isThreefoldRepetition()) {
          status = 'finished';
        }

        const turnText = gameCopy.turn() === 'w' ? 'white' : 'black';

        // 1. Insert Move
        await supabase.from('moves').insert({
          game_id: gameId,
          from_square: sourceSquare,
          to_square: targetSquare,
          fen_after: newFen,
        });

        // 2. Update Game
        await supabase.from('games').update({
          fen: newFen,
          status: status,
          turn: turnText
        }).eq('id', gameId);
      };

      updateGame();
      return true;
    } catch (e) {
      return false;
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Game link copied to clipboard!');
  };

  const leaveGame = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" />
        <p>Loading Game Room...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
        <div className="bg-red-900/50 p-6 rounded-lg border border-red-700 text-center">
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p>{error}</p>
            <button onClick={leaveGame} className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded">Go Home</button>
        </div>
      </div>
    );
  }

  const isMyTurn = game.turn() === playerRole && gameState?.status !== 'finished';
  const turnColor = game.turn() === 'w' ? 'White' : 'Black';

  // Derived Winner State
  let winnerText = '';
  if (gameState?.status === 'finished') {
      if (game.isCheckmate()) {
          // If it's checkmate, the person whose turn it IS lost.
          const winner = game.turn() === 'w' ? 'Black' : 'White';
          winnerText = `Winner: ${winner}`;
      } else {
          winnerText = 'Game Draw!';
      }
  }

  const getStatusMessage = () => {
    if (gameState?.status === 'waiting') return 'Waiting for opponent...';
    if (gameState?.status === 'finished') return winnerText;
    return `${turnColor}'s Turn ${game.inCheck() ? '(Check!)' : ''}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar / Info Panel */}
      <div className="w-full md:w-80 bg-slate-800 p-6 flex flex-col border-b md:border-b-0 md:border-r border-slate-700">
        <div className="mb-8">
            <h1 onClick={leaveGame} className="text-2xl font-bold text-emerald-400 cursor-pointer flex items-center gap-2 mb-1">
                <Users className="w-6 h-6" />
                Chess Online
            </h1>
            <p className="text-xs text-slate-400">ID: {gameId?.slice(0,8)}...</p>
        </div>

        <div className="flex-1 space-y-6">
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <h3 className="text-sm uppercase text-slate-400 font-semibold mb-2">Game Status</h3>
                <div className={`text-lg font-bold flex items-center gap-2 ${
                    gameState?.status === 'active' && isMyTurn ? 'text-emerald-400' : 'text-white'
                }`}>
                    {gameState?.status === 'finished' && <Trophy className="w-5 h-5 text-yellow-400" />}
                    {getStatusMessage()}
                </div>
            </div>

            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <h3 className="text-sm uppercase text-slate-400 font-semibold mb-2">You are playing as</h3>
                <div className="flex items-center gap-2 font-medium">
                    {playerRole === 'w' && <div className="w-4 h-4 bg-white rounded-full border border-slate-300"></div>}
                    {playerRole === 'b' && <div className="w-4 h-4 bg-black rounded-full border border-slate-500"></div>}
                    {playerRole === 'spectator' && <Users className="w-4 h-4" />}
                    
                    {playerRole === 'w' && 'White'}
                    {playerRole === 'b' && 'Black'}
                    {playerRole === 'spectator' && 'Spectator'}
                </div>
            </div>

            {gameState?.status === 'waiting' && (
                 <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-800 animate-pulse">
                    <p className="text-sm text-blue-200 mb-3">Share this link to invite a friend:</p>
                    <button 
                        onClick={copyInviteLink}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
                    >
                        <Copy className="w-4 h-4" /> Copy Game Link
                    </button>
                 </div>
            )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700">
            <button onClick={leaveGame} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm transition-colors">
                <Flag className="w-4 h-4" /> Return to Home
            </button>
        </div>
      </div>

      {/* Game Board Area */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-slate-900">
        <div className="flex flex-col items-center gap-4 w-full">
            {/* Opponent Info (Visual sugar) */}
            <div className="flex items-center gap-3 w-full max-w-[500px] text-slate-400">
                <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                    {playerRole === 'w' ? 'B' : 'W'}
                </div>
                <span>
                   {gameState?.status === 'waiting' ? 'Waiting for opponent...' : 'Opponent'}
                </span>
            </div>

            <CustomChessBoard 
                fen={game.fen()} 
                onPieceDrop={onPieceDrop}
                boardOrientation={playerRole === 'b' ? 'black' : 'white'}
                arePiecesDraggable={gameState?.status !== 'finished' && playerRole !== 'spectator'}
            />

            {/* My Info */}
             <div className="flex items-center gap-3 w-full max-w-[500px] text-slate-200">
                <div className="w-8 h-8 rounded bg-emerald-700 flex items-center justify-center font-bold">
                   {playerRole === 'w' ? 'W' : (playerRole === 'b' ? 'B' : 'S')}
                </div>
                <span>You</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
