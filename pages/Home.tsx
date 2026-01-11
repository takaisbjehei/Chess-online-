import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/utils';
import { Play, Search, Crown, AlertCircle, Trash2 } from 'lucide-react';
import { USER_ID_KEY } from '../constants';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createGame = async () => {
    setCreating(true);
    setErrorMsg(null);
    const userId = getUserId();
    
    // Generate a random 4-digit number (1000-9999)
    const gameId = Math.floor(1000 + Math.random() * 9000).toString();

    try {
      // Create new game with explicit ID
      const { data, error } = await supabase
        .from('games')
        .insert({
          id: gameId,
          player_white: userId,
          status: 'waiting',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          turn: 'white'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        navigate(`/game/${data.id}`);
      }
    } catch (err: any) {
      console.error('Creation error:', err);
      // Handle collision or connection error
      if (err.code === '23505') { // Duplicate key error
         setErrorMsg('Game ID collision, please try again.');
      } else {
         setErrorMsg(err.message || 'Failed to create game. Please check your connection.');
      }
      setCreating(false);
    }
  };

  const joinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      navigate(`/game/${joinId.trim()}`);
    }
  };

  const resetProfile = () => {
    if (window.confirm("This will generate a new User ID for you. Use this to simulate a second player in the same browser.")) {
        localStorage.removeItem(USER_ID_KEY);
        window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[100px]"></div>
      </div>

      <div className="z-10 max-w-md w-full bg-slate-900/80 backdrop-blur-lg p-8 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
                <Crown className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-400">
                TakaDori online- Chess
            </h1>
            <p className="text-slate-400 mt-2">Real-time 1v1 multiplayer chess</p>
        </div>

        <div className="space-y-4">
            <button
                onClick={createGame}
                disabled={creating}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group shadow-lg shadow-emerald-900/20"
            >
                {creating ? (
                    'Creating...'
                ) : (
                    <>
                        <Play className="w-5 h-5 fill-current" /> Create New Game
                    </>
                )}
            </button>

            {errorMsg && (
              <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">OR</span>
                <div className="flex-grow border-t border-slate-700"></div>
            </div>

            <form onSubmit={joinGame} className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Enter 4-Digit Game ID"
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                        maxLength={4}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-500"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={!joinId || joinId.length < 4} 
                    className="w-full mt-3 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Join Game
                </button>
            </form>
        </div>
      </div>

      <footer className="z-10 mt-8 flex flex-col items-center gap-2 text-slate-500 text-sm">
        <p>Powered by 1only TakaDori</p>
        <button onClick={resetProfile} className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3 h-3" /> Reset Profile (Testing)
        </button>
      </footer>
    </div>
  );
};

export default Home;
