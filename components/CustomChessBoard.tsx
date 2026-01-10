import React from 'react';
import { Chessboard } from 'react-chessboard';

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
  return (
    <div className="w-full max-w-[500px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700">
      <Chessboard
        position={fen}
        onPieceDrop={onPieceDrop}
        boardOrientation={boardOrientation}
        arePiecesDraggable={arePiecesDraggable}
        customDarkSquareStyle={{ backgroundColor: '#779556' }}
        customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
        animationDuration={200}
      />
    </div>
  );
};

export default CustomChessBoard;
