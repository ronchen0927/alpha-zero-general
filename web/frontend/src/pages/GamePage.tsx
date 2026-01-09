import React, { useState, useEffect, useRef, useCallback } from 'react'
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

export const GamePage: React.FC = () => {
    const [gameId, setGameId] = useState<string | null>(null)
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null)
    const [selectedHandPiece, setSelectedHandPiece] = useState<number | null>(null)
    const wsRef = useRef<WebSocket | null>(null)

    const currentPlayerText = gameState
        ? gameState.current_player === 1 ? '先手（黒）' : '後手（白）'
        : ''

    const gameEndedText = gameState && gameState.game_ended !== 0
        ? gameState.game_ended === 1 ? '先手の勝ち！' : '後手の勝ち！'
        : null

    const fetchGameState = useCallback(async (id: string) => {
        const res = await fetch(`/api/game/${id}`)
        const data = await res.json()
        setGameState(data)
    }, [])

    const connectWebSocket = useCallback((id: string) => {
        if (wsRef.current) wsRef.current.close()
        wsRef.current = new WebSocket(`ws://localhost:8000/api/game/ws/${id}`)
        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.type === 'state') {
                setGameState(data.payload)
            }
        }
    }, [])

    const startNewGame = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/game/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vs_ai: true })
            })
            const data = await res.json()
            setGameId(data.game_id)
            await fetchGameState(data.game_id)
            connectWebSocket(data.game_id)
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setLoading(false)
        }
    }, [fetchGameState, connectWebSocket])

    const checkCanPromote = (fromRow: number, toRow: number): boolean => {
        if (!gameState) return false
        const player = gameState.current_player
        if (player === 1) {
            return toRow === 0 || fromRow === 0
        } else {
            return toRow === 4 || fromRow === 4
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

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'move', payload }))
        } else {
            try {
                const res = await fetch(`/api/game/${gameId}/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                setGameState(await res.json())
            } catch (e) {
                setError((e as Error).message)
            }
        }
    }

    const handleSquareClick = (row: number, col: number) => {
        if (!gameState || gameState.game_ended !== 0) return

        // If we have a hand piece selected, try to drop
        if (selectedHandPiece !== null) {
            makeMove(null, [row, col], false, selectedHandPiece)
            setSelectedHandPiece(null)
            return
        }

        // If clicking on own piece, select it
        const piece = gameState.board[row][col]
        const isOwnPiece = (piece > 0 && gameState.current_player === 1) ||
            (piece < 0 && gameState.current_player === -1)

        if (selectedSquare === null) {
            if (isOwnPiece) {
                setSelectedSquare([row, col])
            }
        } else {
            // Try to move
            const [fromRow, fromCol] = selectedSquare
            if (fromRow === row && fromCol === col) {
                setSelectedSquare(null)
            } else {
                const canPromote = checkCanPromote(fromRow, row)
                makeMove([fromRow, fromCol], [row, col], canPromote, null)
                setSelectedSquare(null)
            }
        }
    }

    const handleHandPieceClick = (pieceType: number) => {
        setSelectedHandPiece(pieceType)
        setSelectedSquare(null)
    }

    useEffect(() => {
        startNewGame()
        return () => {
            if (wsRef.current) wsRef.current.close()
        }
    }, [startNewGame])

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
                    {!loading && !error && gameState && (
                        <Board
                            board={gameState.board}
                            validMoves={gameState.valid_moves}
                            selected={selectedSquare}
                            lastMove={gameState.last_move}
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
                </div>
            </div>

            {/* Analysis Panel */}
            {gameId && gameState && <Analysis gameId={gameId} />}
        </div>
    )
}
