import React, { useRef, useEffect } from 'react'
import { ShogiPiece, PIECE_NAMES } from './ShogiPiece'
import './MoveHistory.css'

interface MoveInfo {
    from_sq?: [number, number] | null
    to_sq: [number, number]
    promote?: boolean
    drop_piece?: number | null
}

interface MoveHistoryProps {
    moves: MoveInfo[]
    /** Board state snapshots — the board[i] is the state AFTER move[i] */
    boardSnapshots?: number[][][]
}

/** Format a square coordinate like "3一" or "(3,0)" */
function formatSquare(sq: [number, number]): string {
    return `(${sq[0]},${sq[1]})`
}

/** Guess what piece was moved based on board change */
function describeMoveSimple(
    move: MoveInfo,
    moveIndex: number
): { player: 1 | -1; text: string; pieceType?: number } {
    const player = moveIndex % 2 === 0 ? 1 : -1 as 1 | -1

    if (move.drop_piece) {
        const name = PIECE_NAMES[move.drop_piece] || `?`
        return {
            player,
            text: `${name}打 ${formatSquare(move.to_sq)}`,
            pieceType: move.drop_piece
        }
    }

    let text = ''
    if (move.from_sq) {
        text = `${formatSquare(move.from_sq)} → ${formatSquare(move.to_sq)}`
    } else {
        text = `→ ${formatSquare(move.to_sq)}`
    }
    if (move.promote) text += ' 成'

    return { player, text }
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
    const endRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new moves arrive
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [moves.length])

    return (
        <div className="move-history card">
            <h3>📜 棋譜</h3>
            <div className="move-list">
                {moves.length === 0 ? (
                    <div className="no-moves">尚無走步記錄</div>
                ) : (
                    moves.map((move, idx) => {
                        const { player, text, pieceType } = describeMoveSimple(move, idx)
                        return (
                            <div key={idx} className={`move-entry ${player === 1 ? 'sente' : 'gote'}`}>
                                <span className="move-number">{idx + 1}.</span>
                                <span className="move-player-badge">
                                    {player === 1 ? '☗' : '☖'}
                                </span>
                                {pieceType && (
                                    <span className="move-piece-icon">
                                        <ShogiPiece pieceType={pieceType} player={player} size={20} />
                                    </span>
                                )}
                                <span className="move-text">{text}</span>
                            </div>
                        )
                    })
                )}
                <div ref={endRef} />
            </div>
        </div>
    )
}
