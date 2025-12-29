<script setup>
import { ref, onMounted } from 'vue'

const status = ref(null)
const history = ref(null)
const checkpoints = ref([])
const loading = ref(true)

async function fetchData() {
  loading.value = true
  try {
    const [statusRes, historyRes, checkpointsRes] = await Promise.all([
      fetch('/api/train/status'),
      fetch('/api/train/history'),
      fetch('/api/train/checkpoints')
    ])
    status.value = await statusRes.json()
    history.value = await historyRes.json()
    checkpoints.value = await checkpointsRes.json()
  } catch (e) {
    console.error('Failed to fetch training data:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="dashboard">
    <h1>📊 訓練監控</h1>

    <div v-if="loading" class="loading">載入中...</div>

    <template v-else>
      <!-- Status Card -->
      <div class="status-card card">
        <h2>訓練狀態</h2>
        <div class="status-grid">
          <div class="stat">
            <div class="stat-label">狀態</div>
            <div class="stat-value" :class="{ running: status?.is_running }">
              {{ status?.is_running ? '🟢 運行中' : '⚪ 停止' }}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">Iteration</div>
            <div class="stat-value">
              {{ status?.current_iteration }} / {{ status?.total_iterations }}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">階段</div>
            <div class="stat-value">{{ status?.current_phase || 'N/A' }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">完成 Episodes</div>
            <div class="stat-value">{{ status?.episodes_completed }}</div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-row">
        <div class="chart-card card">
          <h3>Loss 曲線</h3>
          <div class="chart-placeholder">
            <div v-if="history?.iterations?.length">
              <div v-for="(iter, idx) in history.iterations.slice(-10)" :key="idx" class="chart-bar">
                <span class="iter">{{ iter }}</span>
                <div class="bar policy" :style="{ width: `${history.policy_losses[idx] * 100}%` }"></div>
                <div class="bar value" :style="{ width: `${history.value_losses[idx] * 100}%` }"></div>
              </div>
            </div>
            <div v-else class="no-data">尚無訓練資料</div>
          </div>
          <div class="legend">
            <span class="legend-item"><span class="dot policy"></span> Policy Loss</span>
            <span class="legend-item"><span class="dot value"></span> Value Loss</span>
          </div>
        </div>

        <div class="chart-card card">
          <h3>勝率曲線</h3>
          <div class="chart-placeholder">
            <div v-if="history?.win_rates?.length">
              <div v-for="(rate, idx) in history.win_rates.slice(-10)" :key="idx" class="win-rate-bar">
                <span class="iter">{{ history.iterations[idx] }}</span>
                <div class="bar" :style="{ width: `${rate * 100}%` }"></div>
                <span class="rate">{{ (rate * 100).toFixed(1) }}%</span>
              </div>
            </div>
            <div v-else class="no-data">尚無訓練資料</div>
          </div>
        </div>
      </div>

      <!-- Checkpoints -->
      <div class="checkpoints-card card">
        <h3>模型 Checkpoints</h3>
        <div class="checkpoints-list">
          <div v-if="checkpoints.length === 0" class="no-data">尚無 Checkpoints</div>
          <div
            v-for="cp in checkpoints"
            :key="cp.filename"
            class="checkpoint-item"
          >
            <span class="filename">{{ cp.filename }}</span>
            <span class="size">{{ cp.size_mb }} MB</span>
            <span class="iteration">Iter {{ cp.iteration }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="btn btn-secondary" @click="fetchData">🔄 重新整理</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1000px;
  margin: 0 auto;
}

.dashboard h1 {
  margin-bottom: 1.5rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.status-card {
  margin-bottom: 1.5rem;
}

.status-card h2 {
  margin-bottom: 1rem;
  color: var(--accent);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat {
  text-align: center;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
}

.stat-value.running {
  color: #4caf50;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.chart-card h3 {
  margin-bottom: 1rem;
}

.chart-placeholder {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chart-bar, .win-rate-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.iter {
  width: 30px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.bar {
  height: 8px;
  border-radius: 4px;
  transition: width 0.3s;
}

.bar.policy {
  background: #ff6b6b;
}

.bar.value {
  background: #4ecdc4;
}

.win-rate-bar .bar {
  background: var(--accent);
  flex: 1;
  max-width: 200px;
}

.rate {
  font-size: 0.8rem;
}

.legend {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.policy {
  background: #ff6b6b;
}

.dot.value {
  background: #4ecdc4;
}

.no-data {
  color: var(--text-secondary);
  text-align: center;
  padding: 2rem;
}

.checkpoints-card h3 {
  margin-bottom: 1rem;
}

.checkpoints-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkpoint-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.filename {
  font-family: monospace;
}

.size, .iteration {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.actions {
  margin-top: 1rem;
}
</style>
