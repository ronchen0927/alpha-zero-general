import React from 'react'
import { ShogiPiece } from './ShogiPiece'
import './Hand.css'

interface HandProps {
    pieces: Record<string, number>
    player: number
    selected?: number | null
    onSelect?: (pieceType: number) => void
}

export const Hand: React.FC<HandProps> = ({
    pieces,
    player,
    selected,
    onSelect
}) => {
    const getPiecesList = (): number[] => {
        const list: number[] = []
        for (const [pieceType, count] of Object.entries(pieces)) {
            for (let i = 0; i < count; i++) {
                list.push(parseInt(pieceType))
            }
        }
        return list
    }

    const handleClick = (pieceType: number) => {
        onSelect?.(pieceType)
    }

    const piecesList = getPiecesList()

    return (
        <div className={`hand ${player === -1 ? 'player2' : ''}`}>
            <div className="hand-label">
                {player === 1 ? '先手持ち駒' : '後手持ち駒'}
            </div>
            <div className="pieces">
                {piecesList.length > 0 ? (
                    piecesList.map((pieceType, idx) => (
                        <div
                            key={idx}
                            className={`hand-piece ${selected === pieceType ? 'selected' : ''}`}
                            onClick={() => handleClick(pieceType)}
                        >
                            <ShogiPiece
                                pieceType={pieceType}
                                player={player as 1 | -1}
                                size={36}
                            />
                        </div>
                    ))
                ) : (
                    <div className="empty">なし</div>
                )}
            </div>
        </div>
    )
}
