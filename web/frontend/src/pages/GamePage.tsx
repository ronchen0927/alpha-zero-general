import React, { useState, useMemo } from 'react'
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

type GameMode = 'human' | 'ai'
type AiAlgorithm = 'random' | 'greedy' | 'minimax' | 'alphabeta' | 'negamax' | 'mcts' | 'alphazero'

interface GameSettings {
    mode: GameMode
    aiAlgorithm: AiAlgorithm
    playerSide: 1 | -1  // which side the human plays (1 = sente/first, -1 = gote/second)
}

const AI_ALGORITHMS: { value: AiAlgorithm; label: string; description: string; category: string }[] = [
    // Simple
    { value: 'random', label: '隨機 (Random)', description: '隨機選擇合法走步', category: '基礎' },
    { value: 'greedy', label: '貪婪 (Greedy)', description: '選擇棋子價值最高的走步', category: '基礎' },
    // Classical search
    { value: 'minimax', label: 'Minimax', description: '極小化極大搜索，完整展開博弈樹', category: '傳統搜索' },
    { value: 'alphabeta', label: 'Alpha-Beta Pruning', description: 'Minimax + 剪枝優化，大幅減少搜索節點', category: '傳統搜索' },
    { value: 'negamax', label: 'Negamax', description: 'Minimax 的簡化變體，利用零和對稱性', category: '傳統搜索' },
    // Modern
    { value: 'mcts', label: 'MCTS', description: '蒙地卡羅樹搜索，隨機模擬評估局面', category: '現代方法' },
    { value: 'alphazero', label: 'AlphaZero', description: 'MCTS + 神經網路（需訓練模型）', category: '現代方法' },
]

/** Decode an action index into a structured move */
function decodeAction(action: number): DecodedMove | null {
    if (action === 1375) return null // pass
    if (action >= 1250) {
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

/** Game Setup Screen */
const GameSetup: React.FC<{ onStart: (settings: GameSettings) => void }> = ({ onStart }) => {
    const [mode, setMode] = useState<GameMode>('human')
    const [aiAlgorithm, setAiAlgorithm] = useState<AiAlgorithm>('random')
    const [playerSide, setPlayerSide] = useState<1 | -1>(1)

    return (
        <div className="setup-screen">
            <div className="setup-card card">
                <h2>♟ 新對局設定</h2>

                {/* Mode Selection */}
                <div className="setup-section">
                    <label className="setup-label">對戰模式</label>
                    <div className="mode-selector">
                        <button
                            className={`mode-btn ${mode === 'human' ? 'active' : ''}`}
                            onClick={() => setMode('human')}
                        >
                            <span className="mode-icon">👥</span>
                            <span className="mode-text">人類 vs 人類</span>
                        </button>
                        <button
                            className={`mode-btn ${mode === 'ai' ? 'active' : ''}`}
                            onClick={() => setMode('ai')}
                        >
                            <span className="mode-icon">🤖</span>
                            <span className="mode-text">人類 vs AI</span>
                        </button>
                    </div>
                </div>

                {/* AI Options — only visible in AI mode */}
                {mode === 'ai' && (
                    <>
                        <div className="setup-section">
                            <label className="setup-label">AI 演算法</label>
                            <div className="algorithm-list">
                                {(['基礎', '傳統搜索', '現代方法'] as const).map(cat => {
                                    const algos = AI_ALGORITHMS.filter(a => a.category === cat)
                                    return (
                                        <div key={cat} className="algo-group">
                                            <div className="algo-category">{cat}</div>
                                            {algos.map(algo => (
                                                <button
                                                    key={algo.value}
                                                    className={`algo-btn ${aiAlgorithm === algo.value ? 'active' : ''}`}
                                                    onClick={() => setAiAlgorithm(algo.value)}
                                                >
                                                    <span className="algo-name">{algo.label}</span>
                                                    <span className="algo-desc">{algo.description}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="setup-section">
                            <label className="setup-label">你的陣營</label>
                            <div className="side-selector">
                                <button
                                    className={`side-btn ${playerSide === 1 ? 'active' : ''}`}
                                    onClick={() => setPlayerSide(1)}
                                >
                                    ☗ 先手（黒）
                                </button>
                                <button
                                    className={`side-btn ${playerSide === -1 ? 'active' : ''}`}
                                    onClick={() => setPlayerSide(-1)}
                                >
                                    ☖ 後手（白）
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Start Button */}
                <button
                    className="btn btn-primary start-btn"
                    onClick={() => onStart({ mode, aiAlgorithm, playerSide })}
                >
                    開始對局
                </button>
            </div>
        </div>
    )
}

export const GamePage: React.FC = () => {
    const [gameId, setGameId] = useState<string | null>(null)
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null)
    const [selectedHandPiece, setSelectedHandPiece] = useState<number | null>(null)
    const [showSetup, setShowSetup] = useState(true)
    const [settings, setSettings] = useState<GameSettings>({
        mode: 'human',
        aiAlgorithm: 'random',
        playerSide: 1,
    })

    const currentPlayerText = gameState
        ? gameState.current_player === 1 ? '先手（黒）' : '後手（白）'
        : ''

    const modeLabel = settings.mode === 'human'
        ? '人類 vs 人類'
        : `人類 vs AI (${AI_ALGORITHMS.find(a => a.value === settings.aiAlgorithm)?.label || settings.aiAlgorithm})`

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

    const highlightedSquares = useMemo((): [number, number][] => {
        return Array.from(validTargets).map(key => {
            const [r, c] = key.split(',').map(Number)
            return [r, c] as [number, number]
        })
    }, [validTargets])

    const startGame = async (newSettings: GameSettings) => {
        setSettings(newSettings)
        setShowSetup(false)
        setLoading(true)
        setError(null)
        setSelectedSquare(null)
        setSelectedHandPiece(null)
        try {
            const res = await fetch('/api/game/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vs_ai: newSettings.mode === 'ai',
                    ai_first: newSettings.mode === 'ai' && newSettings.playerSide === -1,
                    mode: newSettings.mode,
                    ai_algorithm: newSettings.aiAlgorithm,
                })
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

    const handleNewGame = () => {
        setShowSetup(true)
        setGameId(null)
        setGameState(null)
        setError(null)
        setSelectedSquare(null)
        setSelectedHandPiece(null)
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
            if (isOwnPiece) {
                setSelectedSquare([row, col])
            }
        } else {
            const [fromRow, fromCol] = selectedSquare

            if (fromRow === row && fromCol === col) {
                setSelectedSquare(null)
                return
            }

            if (isOwnPiece) {
                setSelectedSquare([row, col])
                return
            }

            const key = `${row},${col}`
            if (!validTargets.has(key)) {
                setSelectedSquare(null)
                return
            }

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

    // Show setup screen
    if (showSetup) {
        return (
            <div className="game-page">
                <GameSetup onStart={startGame} />
            </div>
        )
    }

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
                <div className="mode-badge">{modeLabel}</div>
                <div className="status">
                    {gameEndedText ? (
                        <span className="game-ended">{gameEndedText}</span>
                    ) : (
                        <span>{currentPlayerText}の番</span>
                    )}
                </div>
                <div className="actions">
                    <button className="btn btn-primary" onClick={handleNewGame}>
                        新對局
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
