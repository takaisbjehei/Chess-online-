import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface CustomChessBoardProps {
  fen: string;
  onPieceDrop: (sourceSquare: string, targetSquare: string, piece: string) => boolean;
  boardOrientation: 'white' | 'black';
  arePiecesDraggable: boolean;
}

const CustomChessBoard: React.FC<CustomChessBoardProps> = ({
  fen,
  onPieceDrop,
  boardOrientation,
  arePiecesDraggable,
}) => {
  const [game, setGame] = useState(new Chess(fen));
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});
  
  // Sync internal game instance when FEN changes from parent
  useEffect(() => {
    try {
      const newGame = new Chess(fen);
      setGame(newGame);
      // We only clear selection if the board totally changes (new FEN from server)
      // This prevents "flickering" if the local optimistic update was successful
      setMoveFrom(null);
      setOptionSquares({});
    } catch (e) {
      console.error("Invalid FEN:", fen);
    }
  }, [fen]);

  function getMoveOptions(square: string) {
    const moves = game.moves({
      square: square as any,
      verbose: true,
    });

    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, any> = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to as any) && game.get(move.to as any).color !== game.get(square as any).color
            ? 'radial-gradient(circle, rgba(255,0,0,.6) 85%, transparent 85%)' // Capture hint
            : 'radial-gradient(circle, rgba(0,0,0,.5) 25%, transparent 25%)', // Move hint
        borderRadius: '50%',
      };
      return move;
    });

    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.5)', // Highlight selected piece
    };
    setOptionSquares(newSquares);
    return true;
  }

  function onSquareClick(square: string) {
    if (!arePiecesDraggable) return;

    // 1. If we have a piece selected, try to move to the clicked square
    if (moveFrom) {
      // Get all valid moves for the selected piece
      const moves = game.moves({
        square: moveFrom as any,
        verbose: true,
      });
      
      const foundMove = moves.find((m) => m.to === square);

      // A. Valid Move found
      if (foundMove) {
        const piece = game.get(moveFrom as any);
        const pieceString = piece.color + piece.type.toUpperCase(); // e.g., 'wP'
        
        // Optimistically update internal state
        const gameCopy = new Chess(game.fen());
        gameCopy.move({
            from: moveFrom,
            to: square,
            promotion: 'q'
        });
        setGame(gameCopy);
        
        // Clear selection immediately on valid move attempt
        setMoveFrom(null);
        setOptionSquares({});

        // Notify parent
        const success = onPieceDrop(moveFrom, square, pieceString);
        
        if (!success) {
            // Revert if parent rejected
            setGame(new Chess(fen));
        }
        return;
      }

      // B. Clicked on the same square (Deselect)
      if (moveFrom === square) {
        setMoveFrom(null);
        setOptionSquares({});
        return;
      }
    }

    // 2. Select a new piece
    const piece = game.get(square as any);
    if (piece) {
       // Only allow selecting own pieces
       if (piece.color === game.turn()) {
           setMoveFrom(square);
           getMoveOptions(square);
           return;
       }
    }

    // 3. Clicked empty square or enemy piece (without a valid capture move) -> Deselect
    setMoveFrom(null);
    setOptionSquares({});
  }

  function onPieceDragBegin(piece: string, sourceSquare: string) {
    if (!arePiecesDraggable) return;
    
    // Check if it's actually the turn of the piece being dragged
    const turnColor = game.turn();
    const pieceColor = piece[0]; // 'w' or 'b'
    if (turnColor !== pieceColor) return;

    setMoveFrom(sourceSquare);
    getMoveOptions(sourceSquare);
  }

  function onPieceDragEnd() {
    // CRITICAL FIX FOR MOBILE:
    // Do NOT clear optionSquares or moveFrom here.
    // On touch devices, a "tap" can trigger DragBegin -> DragEnd.
    // If we clear here, the selection vanishes immediately.
    // We strictly rely on onPieceDrop (for successful drags) 
    // or onSquareClick (for clicking elsewhere) to clear state.
  }

  return (
    <div className="relative w-full max-w-[500px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700 bg-slate-800 touch-none">
      {/* Testing Badge */}
      <div className="absolute top-0 right-0 z-20 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl shadow-md pointer-events-none">
        v3.1 Mobile Fix
      </div>

      <Chessboard
        id="BasicBoard"
        position={game.fen()}
        onPieceDrop={(source, target, piece) => {
            const success = onPieceDrop(source, target, piece);
            if (success) {
                setOptionSquares({});
                setMoveFrom(null);
            }
            return success;
        }}
        onPieceDragBegin={onPieceDragBegin}
        onPieceDragEnd={onPieceDragEnd}
        onSquareClick={onSquareClick}
        boardOrientation={boardOrientation}
        arePiecesDraggable={arePiecesDraggable}
        customDarkSquareStyle={{ backgroundColor: '#779556' }}
        customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
        customSquareStyles={{
          ...optionSquares,
        }}
        animationDuration={200}
      />
    </div>
  );
};

export default CustomChessBoard;