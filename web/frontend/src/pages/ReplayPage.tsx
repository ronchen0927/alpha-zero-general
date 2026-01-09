import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Board } from '../components/Board'
import './ReplayPage.css'

interface RecordSummary {
    id: string
    created_at: string
    player1: string
    player2: string
    winner: number
    move_count: number
}

interface GameRecord {
    id: string
    created_at: string
    player1: string
    player2: string
    winner: number
    moves: Record<string, unknown>[]
    final_board: number[][]
}

export const ReplayPage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const [records, setRecords] = useState<RecordSummary[]>([])
    const [selectedRecord, setSelectedRecord] = useState<GameRecord | null>(null)
    const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [isPlaying, setIsPlaying] = useState(false)
    const playIntervalRef = useRef<number | null>(null)

    const fetchRecords = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/records')
            setRecords(await res.json())
        } catch (e) {
            console.error('Failed to fetch records:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    const selectRecord = useCallback(async (recordId: string) => {
        const res = await fetch(`/api/records/${recordId}`)
        setSelectedRecord(await res.json())
        setCurrentMoveIndex(0)
    }, [])

    const nextMove = () => {
        if (!selectedRecord) return
        if (currentMoveIndex < selectedRecord.moves.length) {
            setCurrentMoveIndex(prev => prev + 1)
        }
    }

    const prevMove = () => {
        if (currentMoveIndex > 0) {
            setCurrentMoveIndex(prev => prev - 1)
        }
    }

    const togglePlay = () => {
        if (isPlaying) {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current)
            }
            setIsPlaying(false)
        } else {
            setIsPlaying(true)
            playIntervalRef.current = window.setInterval(() => {
                setCurrentMoveIndex(prev => {
                    if (selectedRecord && prev < selectedRecord.moves.length) {
                        return prev + 1
                    } else {
                        if (playIntervalRef.current) {
                            clearInterval(playIntervalRef.current)
                        }
                        setIsPlaying(false)
                        return prev
                    }
                })
            }, 1000)
        }
    }

    const copyShareLink = () => {
        if (!selectedRecord) return
        const url = `${window.location.origin}/replay/${selectedRecord.id}`
        navigator.clipboard.writeText(url)
        alert('分享連結已複製！')
    }

    useEffect(() => {
        fetchRecords()
    }, [fetchRecords])

    useEffect(() => {
        if (id) {
            selectRecord(id)
        }
    }, [id, selectRecord])

    useEffect(() => {
        return () => {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current)
            }
        }
    }, [])

    return (
        <div className="replay-page">
            <h1>📝 棋譜回放</h1>

            <div className="replay-layout">
                {/* Records List */}
                <div className="records-list card">
                    <h3>棋譜列表</h3>
                    {loading && <div className="loading">載入中...</div>}
                    {!loading && records.length === 0 && (
                        <div className="no-data">尚無棋譜</div>
                    )}
                    {records.map(record => (
                        <div
                            key={record.id}
                            className={`record-item ${selectedRecord?.id === record.id ? 'active' : ''}`}
                            onClick={() => selectRecord(record.id)}
                        >
                            <div className="record-info">
                                <span className="record-id">#{record.id}</span>
                                <span className="record-players">
                                    {record.player1} vs {record.player2}
                                </span>
                            </div>
                            <div className="record-meta">
                                <span>{record.move_count} 手</span>
                                <span className="winner">
                                    {record.winner === 1 ? '先手勝' : record.winner === -1 ? '後手勝' : '引分'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Replay Viewer */}
                <div className="replay-viewer">
                    {!selectedRecord ? (
                        <div className="no-selection card">選擇棋譜開始回放</div>
                    ) : (
                        <>
                            <div className="board-area">
                                <Board
                                    board={selectedRecord.final_board}
                                    validMoves={[]}
                                />
                            </div>

                            {/* Controls */}
                            <div className="controls card">
                                <div className="progress">
                                    第 {currentMoveIndex} / {selectedRecord.moves.length} 手
                                </div>
                                <div className="buttons">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setCurrentMoveIndex(0)}
                                    >
                                        ⏮
                                    </button>
                                    <button className="btn btn-secondary" onClick={prevMove}>
                                        ◀
                                    </button>
                                    <button className="btn btn-primary" onClick={togglePlay}>
                                        {isPlaying ? '⏸ 暫停' : '▶ 播放'}
                                    </button>
                                    <button className="btn btn-secondary" onClick={nextMove}>
                                        ▶
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setCurrentMoveIndex(selectedRecord.moves.length)}
                                    >
                                        ⏭
                                    </button>
                                </div>
                                <button
                                    className="btn btn-secondary share-btn"
                                    onClick={copyShareLink}
                                >
                                    🔗 複製分享連結
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
