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

  // Sync internal game instance when FEN changes from parent (e.g., after a move)
  useEffect(() => {
    setGame(new Chess(fen));
    setMoveFrom(null);
    setOptionSquares({});
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
            ? 'radial-gradient(circle, rgba(255,0,0,.5) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.5) 25%, transparent 25%)',
        borderRadius: '50%',
      };
      return move;
    });
    
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)',
    };
    setOptionSquares(newSquares);
    return true;
  }

  function onSquareClick(square: string) {
    if (!arePiecesDraggable) return;

    // 1. If we have a selected piece, try to move to the clicked square
    if (moveFrom) {
        // Get valid moves for the selected piece
        const moves = game.moves({ square: moveFrom as any, verbose: true });
        const foundMove = moves.find((m) => m.to === square);

        if (foundMove) {
             // Calculate piece string (e.g., 'wP') for the onPieceDrop callback
             const piece = game.get(moveFrom as any);
             // React-chessboard expects 'wP', 'bK' etc.
             const pieceString = piece.color + piece.type.toUpperCase(); 

             // Execute the move via prop
             const success = onPieceDrop(moveFrom, square, pieceString);
             
             if (success) {
                 setMoveFrom(null);
                 setOptionSquares({});
                 return;
             }
        }
        
        // If clicking the same square again, deselect
        if (moveFrom === square) {
             setMoveFrom(null);
             setOptionSquares({});
             return;
        }
    }

    // 2. Select a new piece (if it belongs to the current turn)
    const piece = game.get(square as any);
    if (piece) {
         // Check if it's the correct turn's color
         if (piece.color === game.turn()) { 
            setMoveFrom(square);
            getMoveOptions(square);
            return;
         }
    }

    // 3. Clicked empty square or opponent's piece without a valid move -> Clear selection
    setMoveFrom(null);
    setOptionSquares({});
  }

  function onPieceDragBegin(piece: string, sourceSquare: string) {
    if (!arePiecesDraggable) return;
    setMoveFrom(sourceSquare); 
    getMoveOptions(sourceSquare);
  }

  function onPieceDragEnd() {
    setOptionSquares({});
    setMoveFrom(null);
  }

  return (
    <div className="w-full max-w-[500px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700 bg-slate-800">
      <Chessboard
        id="BasicBoard"
        position={fen}
        onPieceDrop={(source, target, piece) => {
            const success = onPieceDrop(source, target, piece);
            if (success) {
                setMoveFrom(null);
                setOptionSquares({});
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