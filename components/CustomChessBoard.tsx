import React, { useState } from 'react';
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
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});

  function getMoveOptions(square: string) {
    const game = new Chess(fen);
    const moves = game.moves({
      square: square as any,
      verbose: true,
    });
    
    if (moves.length === 0) {
      setOptionSquares({});
      return;
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
  }

  function onPieceDragBegin(piece: string, sourceSquare: string) {
    // Only show hints if it's the player's turn and pieces are draggable
    if (!arePiecesDraggable) return;
    getMoveOptions(sourceSquare);
  }

  function onPieceDragEnd() {
    setOptionSquares({});
  }

  // Wrapper to clear hints after drop
  const handlePieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    const success = onPieceDrop(sourceSquare, targetSquare, piece);
    setOptionSquares({});
    return success;
  };

  return (
    <div className="w-full max-w-[500px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700 bg-slate-800">
      <Chessboard
        position={fen}
        onPieceDrop={handlePieceDrop}
        onPieceDragBegin={onPieceDragBegin}
        onPieceDragEnd={onPieceDragEnd}
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