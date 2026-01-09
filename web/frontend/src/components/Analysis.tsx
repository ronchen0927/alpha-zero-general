import React, { useState, useEffect, useCallback } from 'react'
import './Analysis.css'

interface AnalysisProps {
    gameId: string
}

interface AnalysisData {
    policy: number[]
    value: number
    top_moves: { action: number; probability: number }[]
}

export const Analysis: React.FC<AnalysisProps> = ({ gameId }) => {
    const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
    const [loading, setLoading] = useState(false)

    const fetchAnalysis = useCallback(async () => {
        if (!gameId) return
        setLoading(true)
        try {
            const res = await fetch(`/api/game/${gameId}/analysis`)
            const data = await res.json()
            setAnalysis(data)
        } catch (e) {
            console.error('Analysis fetch error:', e)
        } finally {
            setLoading(false)
        }
    }, [gameId])

    useEffect(() => {
        fetchAnalysis()
    }, [fetchAnalysis])

    return (
        <div className="analysis card">
            <h3>🧠 AI 分析</h3>

            {loading && <div className="loading">分析中...</div>}

            {!loading && analysis && (
                <div className="analysis-content">
                    {/* Value (Position Evaluation) */}
                    <div className="eval-section">
                        <div className="eval-label">局面評価</div>
                        <div className="eval-bar">
                            <div
                                className="eval-fill"
                                style={{ width: `${(analysis.value + 1) * 50}%` }}
                            />
                        </div>
                        <div className="eval-value">
                            {(analysis.value * 100).toFixed(1)}%
                        </div>
                    </div>

                    {/* Top Moves */}
                    <div className="top-moves">
                        <div className="section-title">推奨手</div>
                        {analysis.top_moves.map((move, idx) => (
                            <div key={idx} className="move-item">
                                <span className="move-rank">{idx + 1}.</span>
                                <span className="move-action">Action {move.action}</span>
                                <span className="move-prob">
                                    {(move.probability * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>

                    <button className="btn btn-secondary refresh-btn" onClick={fetchAnalysis}>
                        🔄 更新
                    </button>
                </div>
            )}
        </div>
    )
}
