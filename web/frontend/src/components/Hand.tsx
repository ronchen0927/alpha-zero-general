import React from 'react'
import './Hand.css'

interface HandProps {
    pieces: Record<string, number>
    player: number
    selected?: number | null
    onSelect?: (pieceType: number) => void
}

const PIECE_CHARS: Record<number, string> = {
    1: '歩', 2: '銀', 3: '金', 4: '角', 5: '飛'
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
                            {PIECE_CHARS[pieceType]}
                        </div>
                    ))
                ) : (
                    <div className="empty">なし</div>
                )}
            </div>
        </div>
    )
}
