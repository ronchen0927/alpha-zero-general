import React, { useState, useEffect, useMemo } from 'react'
import { Board } from '../components/Board'
import { Hand } from '../components/Hand'
import { Analysis } from '../components/Analysis'
import './GamePage.css'

interface GameState {
    board: number[][]
    current_player: number
    hands: Record<string, number>[]
    valid_moves: number[]
    game_ended: number
    last_move?: { from_sq?: [number, number]; to_sq?: [number, number] } | null
}

interface DecodedMove {
    from_sq: [number, number] | null
    to_sq: [number, number]
    promote: boolean
    drop_piece: number | null
}

/** Decode an action index into a structured move */
function decodeAction(action: number): DecodedMove | null {
    if (action === 1375) return null // pass
    if (action >= 1250) {
        // Drop: 1250 + (piece_type - 1) * 25 + to_idx
        const dropIdx = action - 1250
        const pieceType = Math.floor(dropIdx / 25) + 1
        const toIdx = dropIdx % 25
        return {
            from_sq: null,
            to_sq: [Math.floor(toIdx / 5), toIdx % 5],
            promote: false,
            drop_piece: pieceType
        }
    }
    // Move: from_idx * 50 + to_idx * 2 + promote
    const promote = action % 2 === 1
    const rest = Math.floor(action / 2)
    const toIdx = rest % 25
    const fromIdx = Math.floor(rest / 25)
    return {
        from_sq: [Math.floor(fromIdx / 5), fromIdx % 5],
        to_sq: [Math.floor(toIdx / 5), toIdx % 5],
        promote,
        drop_piece: null
    }
}

export const GamePage: React.FC = () => {
    const [gameId, setGameId] = useState<string | null>(null)
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null)
    const [selectedHandPiece, setSelectedHandPiece] = useState<number | null>(null)

    const currentPlayerText = gameState
        ? gameState.current_player === 1 ? '先手（黒）' : '後手（白）'
        : ''

    const gameEndedText = gameState && gameState.game_ended !== 0
        ? gameState.game_ended === 1 ? '先手勝利！' : '後手勝利！'
        : null

    // Decode all valid moves once when game state changes
    const decodedMoves = useMemo(() => {
        if (!gameState) return []
        return gameState.valid_moves
            .map(decodeAction)
            .filter((m): m is DecodedMove => m !== null)
    }, [gameState])

    // Compute valid target squares for the currently selected piece or hand piece
    const validTargets = useMemo((): Set<string> => {
        const targets = new Set<string>()
        if (selectedSquare) {
            const [sr, sc] = selectedSquare
            for (const m of decodedMoves) {
                if (m.from_sq && m.from_sq[0] === sr && m.from_sq[1] === sc) {
                    targets.add(`${m.to_sq[0]},${m.to_sq[1]}`)
                }
            }
        } else if (selectedHandPiece !== null) {
            for (const m of decodedMoves) {
                if (m.drop_piece === selectedHandPiece) {
                    targets.add(`${m.to_sq[0]},${m.to_sq[1]}`)
                }
            }
        }
        return targets
    }, [selectedSquare, selectedHandPiece, decodedMoves])

    // Convert to array of [row, col] for the Board component
    const highlightedSquares = useMemo((): [number, number][] => {
        return Array.from(validTargets).map(key => {
            const [r, c] = key.split(',').map(Number)
            return [r, c] as [number, number]
        })
    }, [validTargets])

    const startNewGame = async () => {
        setLoading(true)
        setError(null)
        setSelectedSquare(null)
        setSelectedHandPiece(null)
        try {
            const res = await fetch('/api/game/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vs_ai: false, mode: 'manual' })
            })
            const data = await res.json()
            setGameId(data.game_id)
            const stateRes = await fetch(`/api/game/${data.game_id}`)
            const stateData = await stateRes.json()
            setGameState(stateData)
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const makeMove = async (
        fromSq: [number, number] | null,
        toSq: [number, number],
        promote: boolean,
        dropPiece: number | null
    ) => {
        if (!gameId) return

        const payload: Record<string, unknown> = {
            to_sq: toSq,
            promote: promote
        }
        if (fromSq) payload.from_sq = fromSq
        if (dropPiece) payload.drop_piece = dropPiece

        try {
            const res = await fetch(`/api/game/${gameId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Invalid move' }))
                setError(err.detail || 'Invalid move')
                // Don't clear game state on error!
                return
            }
            setGameState(await res.json())
            setError(null)
        } catch (e) {
            setError((e as Error).message)
        }
    }

    const handleResign = async () => {
        if (!gameId || !gameState || gameState.game_ended !== 0) return
        const who = gameState.current_player === 1 ? '先手（黒）' : '後手（白）'
        if (!window.confirm(`${who} 確定要投降嗎？`)) return
        try {
            const res = await fetch(`/api/game/${gameId}/resign`, {
                method: 'POST',
            })
            if (res.ok) {
                setGameState(await res.json())
                setError(null)
            }
        } catch (e) {
            setError((e as Error).message)
        }
    }

    const handleSquareClick = (row: number, col: number) => {
        if (!gameState || gameState.game_ended !== 0) return

        // If we have a hand piece selected
        if (selectedHandPiece !== null) {
            const key = `${row},${col}`
            if (validTargets.has(key)) {
                makeMove(null, [row, col], false, selectedHandPiece)
            }
            setSelectedHandPiece(null)
            return
        }

        const piece = gameState.board[row][col]
        const isOwnPiece = (piece > 0 && gameState.current_player === 1) ||
            (piece < 0 && gameState.current_player === -1)

        if (selectedSquare === null) {
            // No piece selected yet — select an own piece
            if (isOwnPiece) {
                setSelectedSquare([row, col])
            }
        } else {
            const [fromRow, fromCol] = selectedSquare

            // Clicking the same square deselects
            if (fromRow === row && fromCol === col) {
                setSelectedSquare(null)
                return
            }

            // Clicking another own piece switches selection
            if (isOwnPiece) {
                setSelectedSquare([row, col])
                return
            }

            // Only allow moves to highlighted (valid) target squares
            const key = `${row},${col}`
            if (!validTargets.has(key)) {
                // Not a valid target — deselect
                setSelectedSquare(null)
                return
            }

            // Check if promotion is possible for this move
            const movesFromHere = decodedMoves.filter(m =>
                m.from_sq && m.from_sq[0] === fromRow && m.from_sq[1] === fromCol &&
                m.to_sq[0] === row && m.to_sq[1] === col
            )

            const canPromote = movesFromHere.some(m => m.promote)
            const mustPromote = canPromote && !movesFromHere.some(m => !m.promote)
            let promote = mustPromote
            if (canPromote && !mustPromote) {
                promote = window.confirm('升變嗎？（成る？）')
            }

            makeMove([fromRow, fromCol], [row, col], promote, null)
            setSelectedSquare(null)
        }
    }

    const handleHandPieceClick = (pieceType: number) => {
        if (selectedHandPiece === pieceType) {
            setSelectedHandPiece(null)
        } else {
            setSelectedHandPiece(pieceType)
            setSelectedSquare(null)
        }
    }

    useEffect(() => {
        startNewGame()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="game-page">
            <div className="game-container">
                {/* Player 2 Hand */}
                {gameState && (
                    <Hand
                        pieces={gameState.hands[1]}
                        player={-1}
                        selected={selectedHandPiece}
                        onSelect={handleHandPieceClick}
                    />
                )}

                {/* Board */}
                <div className="board-wrapper">
                    {loading && <div className="loading">載入中...</div>}
                    {error && <div className="error">{error}</div>}
                    {gameState && (
                        <Board
                            board={gameState.board}
                            validMoves={gameState.valid_moves}
                            selected={selectedSquare}
                            lastMove={gameState.last_move}
                            highlightedSquares={highlightedSquares}
                            onSquareClick={handleSquareClick}
                        />
                    )}
                </div>

                {/* Player 1 Hand */}
                {gameState && (
                    <Hand
                        pieces={gameState.hands[0]}
                        player={1}
                        selected={selectedHandPiece}
                        onSelect={handleHandPieceClick}
                    />
                )}
            </div>

            {/* Game Info */}
            <div className="game-info card">
                <div className="status">
                    {gameEndedText ? (
                        <span className="game-ended">{gameEndedText}</span>
                    ) : (
                        <span>{currentPlayerText}の番</span>
                    )}
                </div>
                <div className="actions">
                    <button className="btn btn-primary" onClick={startNewGame}>
                        新しい対局
                    </button>
                    {gameState && gameState.game_ended === 0 && (
                        <button className="btn btn-danger" onClick={handleResign}>
                            投降
                        </button>
                    )}
                </div>
            </div>

            {/* Analysis Panel */}
            {gameId && gameState && <Analysis gameId={gameId} />}
        </div>
    )
}
