import React from 'react'
import { ShogiPiece } from './ShogiPiece'
import './Board.css'

interface BoardProps {
    board: number[][]
    validMoves?: number[]
    selected?: [number, number] | null
    lastMove?: { from_sq?: [number, number]; to_sq?: [number, number] } | null
    highlightedSquares?: [number, number][]
    onSquareClick?: (row: number, col: number) => void
}

export const Board: React.FC<BoardProps> = ({
    board,
    selected,
    lastMove,
    highlightedSquares,
    onSquareClick
}) => {
    const highlightSet = new Set(
        (highlightedSquares || []).map(([r, c]) => `${r},${c}`)
    )

    const isSelected = (row: number, col: number): boolean => {
        return selected !== null && selected !== undefined && selected[0] === row && selected[1] === col
    }

    const isLastMove = (row: number, col: number): boolean => {
        if (!lastMove) return false
        const { to_sq, from_sq } = lastMove
        if (to_sq && to_sq[0] === row && to_sq[1] === col) return true
        if (from_sq && from_sq[0] === row && from_sq[1] === col) return true
        return false
    }

    const isHighlighted = (row: number, col: number): boolean => {
        return highlightSet.has(`${row},${col}`)
    }

    const handleClick = (row: number, col: number) => {
        onSquareClick?.(row, col)
    }

    return (
        <div className="board">
            <div className="col-labels">
                {[0, 1, 2, 3, 4].map(c => (
                    <span key={c}>{c}</span>
                ))}
            </div>
            <div className="board-grid">
                <div className="row-labels">
                    {[0, 1, 2, 3, 4].map(r => (
                        <span key={r}>{r}</span>
                    ))}
                </div>
                <div className="squares">
                    {[0, 1, 2, 3, 4].map(row => (
                        <div key={row} className="row">
                            {[0, 1, 2, 3, 4].map(col => {
                                const piece = board[row][col]
                                const highlighted = isHighlighted(row, col)
                                const squareClasses = [
                                    'square',
                                    (row + col) % 2 === 0 ? 'light' : 'dark',
                                    isSelected(row, col) ? 'selected' : '',
                                    isLastMove(row, col) ? 'last-move' : '',
                                    highlighted && piece === 0 ? 'valid-target' : '',
                                    highlighted && piece !== 0 ? 'valid-capture' : ''
                                ].filter(Boolean).join(' ')

                                return (
                                    <div
                                        key={col}
                                        className={squareClasses}
                                        onClick={() => handleClick(row, col)}
                                    >
                                        {piece !== 0 && (
                                            <ShogiPiece
                                                pieceType={Math.abs(piece)}
                                                player={piece > 0 ? 1 : -1}
                                                size={46}
                                            />
                                        )}
                                        {highlighted && piece === 0 && (
                                            <span className="move-dot" />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
