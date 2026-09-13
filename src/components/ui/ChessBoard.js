/**
 * Chess board UI: green/black squares; white pieces = filled white, black pieces = white border only.
 * Orientation: amIWhite => white at bottom (row 0 at bottom); !amIWhite => black at bottom (row 7 at bottom).
 */
import React from 'react';
import styled from 'styled-components';
import { createInitialState, getLegalMovesForState, posToCoord, coordToPos } from '../../utils/chessEngine';

const BoardWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 8px;
  position: relative;
`;

/* Strictly square board; glow when it's player's turn */
const BoardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  width: min(88vmin, 420px);
  height: min(88vmin, 420px);
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid ${({ theme }) => theme.colors.ink};
  border-radius: 12px;
  ${({ $myTurn, theme }) => $myTurn && `box-shadow: 0 0 0 3px ${theme.colors.sun};`}
  transition: box-shadow 0.2s ease;
`;

/* Flat squares: paper white and sun amber. No bevel, no texture. */
const Cell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $light, theme }) => ($light ? theme.colors.sun : theme.colors.paper)};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  position: relative;
  border: none;

  &:hover {
    ${({ $clickable }) => $clickable && 'filter: brightness(0.94);'}
  }
`;

/* White pieces read as paper with an ink outline; black pieces are solid ink. */
const PieceSpan = styled.span`
  font-size: clamp(20px, 5.5vw, 30px);
  font-weight: bold;
  user-select: none;
  pointer-events: none;
  line-height: 1;
  ${({ $whiteFilled }) =>
    $whiteFilled
      ? 'color: #FFFFFF; -webkit-text-stroke: 1.2px #1C1C1E; text-shadow: 0 1px 0 rgba(28,28,30,0.35);'
      : 'color: #1C1C1E; text-shadow: 0 1px 0 rgba(255,255,255,0.35);'}
`;

const HighlightDot = styled.div`
  width: 26%;
  height: 26%;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.blue};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  position: absolute;
`;

const LastMoveHighlight = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(45, 127, 249, 0.22);
  box-shadow: inset 0 0 0 2px ${({ theme }) => theme.colors.blue};
  pointer-events: none;
`;

const GameOverText = styled.div`
  margin-top: 10px;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.ink};
  text-align: center;
`;
const SYMBOLS = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

function ChessBoard({ state, amIWhite, onMove, disabled }) {
  const fallbackState = React.useMemo(() => createInitialState(), []);
  const board = state?.board ?? fallbackState.board;
  const turn = state?.turn ?? fallbackState.turn;
  const gameOver = state?.gameOver;
  const lastMove = state?.lastMove;
  const myTurn = (turn === 'white' && amIWhite) || (turn === 'black' && !amIWhite);
  const legalMoves = state ? getLegalMovesForState(state) : [];
  const [selected, setSelected] = React.useState(null);

  const displayRows = amIWhite ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const displayCols = [0, 1, 2, 3, 4, 5, 6, 7];

  const handleCellClick = (row, col) => {
    if (disabled || gameOver) return;
    const pos = coordToPos(row, col);
    const piece = board[row][col];
    const isWhitePiece = piece && piece === piece.toUpperCase() && piece !== '';
    const isBlackPiece = piece && piece === piece.toLowerCase();
    const isMine = (amIWhite && isWhitePiece) || (!amIWhite && isBlackPiece);

    if (selected) {
      const fromPos = coordToPos(selected.row, selected.col);
      let move = legalMoves.find((m) => m.from === fromPos && m.to === pos && (m.promotion === 'Q' || !m.promotion));
      if (!move) move = legalMoves.find((m) => m.from === fromPos && m.to === pos);
      if (move) {
        onMove({ from: move.from, to: move.to, promotion: move.promotion || undefined });
        setSelected(null);
        return;
      }
      if (isMine) {
        setSelected({ row, col });
        return;
      }
      setSelected(null);
      return;
    }
    if (myTurn && isMine) setSelected({ row, col });
  };

  const isLegalTarget = (row, col) => {
    if (!selected) return false;
    const fromPos = coordToPos(selected.row, selected.col);
    const toPos = coordToPos(row, col);
    return legalMoves.some((m) => m.from === fromPos && m.to === toPos);
  };

  const isLastMoveSquare = (row, col) => {
    if (!lastMove) return false;
    const from = posToCoord(lastMove.from);
    const to = posToCoord(lastMove.to);
    return (from && from.row === row && from.col === col) || (to && to.row === row && to.col === col);
  };

  let gameOverText = null;
  if (gameOver === 'draw') gameOverText = 'Draw';
  else if (gameOver === 'white') gameOverText = 'White wins';
  else if (gameOver === 'black') gameOverText = 'Black wins';

  return (
    <BoardWrap>
      <BoardGrid $myTurn={!gameOver && myTurn}>
        {displayRows.map((row) =>
          displayCols.map((col) => {
            const piece = board[row][col];
            const light = (row + col) % 2 === 1;
            const clickable = !disabled && ((myTurn && piece && ((amIWhite && piece === piece.toUpperCase()) || (!amIWhite && piece === piece.toLowerCase()))) || (selected && isLegalTarget(row, col)));
            const showDot = selected && isLegalTarget(row, col) && !piece;
            const showCaptureDot = selected && isLegalTarget(row, col) && piece;
            const whiteFilled = piece ? piece === piece.toUpperCase() : true;

            return (
              <Cell
                key={`${row}-${col}`}
                $light={light}
                $clickable={clickable}
                onClick={() => handleCellClick(row, col)}
              >
                {isLastMoveSquare(row, col) && <LastMoveHighlight />}
                {showDot && <HighlightDot />}
                {showCaptureDot && <LastMoveHighlight />}
                {piece && (
                  <PieceSpan $whiteFilled={whiteFilled}>
                    {SYMBOLS[piece] || piece}
                  </PieceSpan>
                )}
              </Cell>
            );
          })
        )}
      </BoardGrid>
      {gameOverText && <GameOverText>{gameOverText}</GameOverText>}
    </BoardWrap>
  );
}

export default ChessBoard;
