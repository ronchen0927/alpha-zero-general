<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  gameId: { type: String, required: true }
})

const analysis = ref(null)
const loading = ref(false)

async function fetchAnalysis() {
  if (!props.gameId) return
  loading.value = true
  try {
    const res = await fetch(`/api/game/${props.gameId}/analysis`)
    analysis.value = await res.json()
  } catch (e) {
    console.error('Analysis fetch error:', e)
  } finally {
    loading.value = false
  }
}

watch(() => props.gameId, fetchAnalysis, { immediate: true })
</script>

<template>
  <div class="analysis card">
    <h3>🧠 AI 分析</h3>

    <div v-if="loading" class="loading">分析中...</div>

    <div v-else-if="analysis" class="analysis-content">
      <!-- Value (Position Evaluation) -->
      <div class="eval-section">
        <div class="eval-label">局面評価</div>
        <div class="eval-bar">
          <div
            class="eval-fill"
            :style="{ width: `${(analysis.value + 1) * 50}%` }"
          ></div>
        </div>
        <div class="eval-value">{{ (analysis.value * 100).toFixed(1) }}%</div>
      </div>

      <!-- Top Moves -->
      <div class="top-moves">
        <div class="section-title">推奨手</div>
        <div
          v-for="(move, idx) in analysis.top_moves"
          :key="idx"
          class="move-item"
        >
          <span class="move-rank">{{ idx + 1 }}.</span>
          <span class="move-action">Action {{ move.action }}</span>
          <span class="move-prob">{{ (move.probability * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <button class="btn btn-secondary refresh-btn" @click="fetchAnalysis">
        🔄 更新
      </button>
    </div>
  </div>
</template>

<style scoped>
.analysis {
  margin-top: 1rem;
}

.analysis h3 {
  margin-bottom: 1rem;
  color: var(--accent);
}

.loading {
  color: var(--text-secondary);
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.eval-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.eval-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.eval-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.eval-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b6b, #ffd700, #4caf50);
  transition: width 0.3s;
}

.eval-value {
  font-size: 1.2rem;
  font-weight: bold;
}

.top-moves {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.move-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.move-rank {
  color: var(--accent);
  font-weight: bold;
}

.move-action {
  flex: 1;
}

.move-prob {
  color: var(--text-secondary);
}

.refresh-btn {
  margin-top: 0.5rem;
}
</style>
