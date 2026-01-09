import React, { useState, useEffect, useCallback } from 'react'
import './DashboardPage.css'

interface TrainingStatus {
    is_running: boolean
    current_iteration: number
    total_iterations: number
    current_phase: string
    episodes_completed: number
}

interface TrainingHistory {
    iterations: number[]
    policy_losses: number[]
    value_losses: number[]
    win_rates: number[]
    timestamps: string[]
}

interface CheckpointInfo {
    filename: string
    iteration: number
    size_mb: number
    created_at: string
}

export const DashboardPage: React.FC = () => {
    const [status, setStatus] = useState<TrainingStatus | null>(null)
    const [history, setHistory] = useState<TrainingHistory | null>(null)
    const [checkpoints, setCheckpoints] = useState<CheckpointInfo[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [statusRes, historyRes, checkpointsRes] = await Promise.all([
                fetch('/api/train/status'),
                fetch('/api/train/history'),
                fetch('/api/train/checkpoints')
            ])
            setStatus(await statusRes.json())
            setHistory(await historyRes.json())
            setCheckpoints(await checkpointsRes.json())
        } catch (e) {
            console.error('Failed to fetch training data:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return (
        <div className="dashboard">
            <h1>📊 訓練監控</h1>

            {loading && <div className="loading">載入中...</div>}

            {!loading && (
                <>
                    {/* Status Card */}
                    <div className="status-card card">
                        <h2>訓練狀態</h2>
                        <div className="status-grid">
                            <div className="stat">
                                <div className="stat-label">狀態</div>
                                <div className={`stat-value ${status?.is_running ? 'running' : ''}`}>
                                    {status?.is_running ? '🟢 運行中' : '⚪ 停止'}
                                </div>
                            </div>
                            <div className="stat">
                                <div className="stat-label">Iteration</div>
                                <div className="stat-value">
                                    {status?.current_iteration} / {status?.total_iterations}
                                </div>
                            </div>
                            <div className="stat">
                                <div className="stat-label">階段</div>
                                <div className="stat-value">{status?.current_phase || 'N/A'}</div>
                            </div>
                            <div className="stat">
                                <div className="stat-label">完成 Episodes</div>
                                <div className="stat-value">{status?.episodes_completed}</div>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="charts-row">
                        <div className="chart-card card">
                            <h3>Loss 曲線</h3>
                            <div className="chart-placeholder">
                                {history?.iterations?.length ? (
                                    history.iterations.slice(-10).map((iter, idx) => (
                                        <div key={idx} className="chart-bar">
                                            <span className="iter">{iter}</span>
                                            <div
                                                className="bar policy"
                                                style={{ width: `${(history.policy_losses[idx] || 0) * 100}%` }}
                                            />
                                            <div
                                                className="bar value"
                                                style={{ width: `${(history.value_losses[idx] || 0) * 100}%` }}
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-data">尚無訓練資料</div>
                                )}
                            </div>
                            <div className="legend">
                                <span className="legend-item">
                                    <span className="dot policy" /> Policy Loss
                                </span>
                                <span className="legend-item">
                                    <span className="dot value" /> Value Loss
                                </span>
                            </div>
                        </div>

                        <div className="chart-card card">
                            <h3>勝率曲線</h3>
                            <div className="chart-placeholder">
                                {history?.win_rates?.length ? (
                                    history.win_rates.slice(-10).map((rate, idx) => (
                                        <div key={idx} className="win-rate-bar">
                                            <span className="iter">{history.iterations[idx]}</span>
                                            <div className="bar" style={{ width: `${rate * 100}%` }} />
                                            <span className="rate">{(rate * 100).toFixed(1)}%</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-data">尚無訓練資料</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Checkpoints */}
                    <div className="checkpoints-card card">
                        <h3>模型 Checkpoints</h3>
                        <div className="checkpoints-list">
                            {checkpoints.length === 0 ? (
                                <div className="no-data">尚無 Checkpoints</div>
                            ) : (
                                checkpoints.map((cp) => (
                                    <div key={cp.filename} className="checkpoint-item">
                                        <span className="filename">{cp.filename}</span>
                                        <span className="size">{cp.size_mb} MB</span>
                                        <span className="iteration">Iter {cp.iteration}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="actions">
                        <button className="btn btn-secondary" onClick={fetchData}>
                            🔄 重新整理
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
