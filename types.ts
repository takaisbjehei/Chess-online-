export interface GameState {
  id: string;
  created_at: string;
  player_white: string | null;
  player_black: string | null;
  fen: string;
  status: 'waiting' | 'active' | 'finished';
  turn: 'white' | 'black';
}

export interface MoveRecord {
  id: string;
  game_id: string;
  from_square: string;
  to_square: string;
  fen_after: string;
  created_at: string;
}

export interface Player {
  id: string;
  color: 'w' | 'b' | 'spectator';
}
