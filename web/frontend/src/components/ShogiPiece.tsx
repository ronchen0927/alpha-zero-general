import React from 'react'
import './ShogiPiece.css'

/** Piece type value → two-character kanji mapping */
const PIECE_KANJI: Record<number, [string, string]> = {
    1: ['歩', '兵'],
    2: ['銀', '將'],
    3: ['金', '將'],
    4: ['角', '行'],
    5: ['飛', '車'],
    // 6 (King) handled separately: 玉將 for sente, 王將 for gote
    7: ['と', '金'],
    8: ['成', '銀'],
    9: ['龍', '馬'],
    10: ['龍', '王'],
}

/** Piece type value → name for labels */
export const PIECE_NAMES: Record<number, string> = {
    1: '歩兵', 2: '銀將', 3: '金將', 4: '角行', 5: '飛車', 6: '玉將',
    7: 'と金', 8: '成銀', 9: '龍馬', 10: '龍王'
}

/** Whether the piece is a promoted form */
function isPromoted(pieceType: number): boolean {
    return pieceType >= 7 && pieceType <= 10
}

interface ShogiPieceProps {
    /** Piece type value (1-10), always positive */
    pieceType: number
    /** Which player owns it: 1 = sente (black, upright), -1 = gote (white, inverted) */
    player: 1 | -1
    /** Size of the piece in pixels */
    size?: number
}

/**
 * Renders a traditional shogi piece as an SVG pentagon (五角形) with two-character kanji.
 * Player 1 (sente) pieces point up, Player 2 (gote) pieces point down (rotated 180°).
 * King: 玉將 for sente (player 1), 王將 for gote (player -1).
 * Promoted pieces get red kanji color.
 */
export const ShogiPiece: React.FC<ShogiPieceProps> = ({
    pieceType,
    player,
    size = 48
}) => {
    // Get kanji pair — king depends on player
    let kanji: [string, string]
    if (pieceType === 6) {
        kanji = player === 1 ? ['玉', '將'] : ['王', '將']
    } else {
        kanji = PIECE_KANJI[pieceType] || ['?', '?']
    }

    const promoted = isPromoted(pieceType)

    // Pentagon path: flat bottom, pointed top — classic shogi koma shape
    const pentagonPath = 'M 50 5 L 92 30 L 85 105 L 15 105 L 8 30 Z'

    return (
        <svg
            className={`shogi-piece ${player === -1 ? 'gote' : ''}`}
            width={size}
            height={size}
            viewBox="0 0 100 110"
        >
            {/* Piece body */}
            <path d={pentagonPath} className="piece-body" />
            {/* Piece outline */}
            <path d={pentagonPath} className="piece-outline" fill="none" strokeWidth="2" />
            {/* Top character */}
            <text
                x="50"
                y="48"
                textAnchor="middle"
                dominantBaseline="middle"
                className={`piece-kanji ${promoted ? 'promoted' : ''}`}
                fontSize="34"
            >
                {kanji[0]}
            </text>
            {/* Bottom character */}
            <text
                x="50"
                y="86"
                textAnchor="middle"
                dominantBaseline="middle"
                className={`piece-kanji ${promoted ? 'promoted' : ''}`}
                fontSize="34"
            >
                {kanji[1]}
            </text>
        </svg>
    )
}

/** Inline piece for use in move history text */
export const InlinePiece: React.FC<{ pieceType: number; player: 1 | -1 }> = ({ pieceType, player }) => (
    <ShogiPiece pieceType={pieceType} player={player} size={22} />
)
