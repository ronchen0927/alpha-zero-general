<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import Board from '../components/Board.vue'

const route = useRoute()

const records = ref([])
const selectedRecord = ref(null)
const currentMoveIndex = ref(0)
const loading = ref(true)
const isPlaying = ref(false)
let playInterval = null

const currentBoard = computed(() => {
  if (!selectedRecord.value) return null
  // Reconstruct board at current move index
  // For now, just show final board
  return selectedRecord.value.final_board
})

async function fetchRecords() {
  loading.value = true
  try {
    const res = await fetch('/api/records')
    records.value = await res.json()
  } catch (e) {
    console.error('Failed to fetch records:', e)
  } finally {
    loading.value = false
  }
}

async function selectRecord(id) {
  const res = await fetch(`/api/records/${id}`)
  selectedRecord.value = await res.json()
  currentMoveIndex.value = 0
}

function nextMove() {
  if (!selectedRecord.value) return
  if (currentMoveIndex.value < selectedRecord.value.moves.length) {
    currentMoveIndex.value++
  }
}

function prevMove() {
  if (currentMoveIndex.value > 0) {
    currentMoveIndex.value--
  }
}

function togglePlay() {
  if (isPlaying.value) {
    clearInterval(playInterval)
    isPlaying.value = false
  } else {
    isPlaying.value = true
    playInterval = setInterval(() => {
      if (currentMoveIndex.value < selectedRecord.value.moves.length) {
        nextMove()
      } else {
        togglePlay()
      }
    }, 1000)
  }
}

function copyShareLink() {
  const url = `${window.location.origin}/replay/${selectedRecord.value.id}`
  navigator.clipboard.writeText(url)
  alert('分享連結已複製！')
}

watch(() => route.params.id, (id) => {
  if (id) selectRecord(id)
}, { immediate: true })

onMounted(fetchRecords)
</script>

<template>
  <div class="replay-page">
    <h1>📝 棋譜回放</h1>

    <div class="replay-layout">
      <!-- Records List -->
      <div class="records-list card">
        <h3>棋譜列表</h3>
        <div v-if="loading" class="loading">載入中...</div>
        <div v-else-if="records.length === 0" class="no-data">尚無棋譜</div>
        <div
          v-for="record in records"
          :key="record.id"
          class="record-item"
          :class="{ active: selectedRecord?.id === record.id }"
          @click="selectRecord(record.id)"
        >
          <div class="record-info">
            <span class="record-id">#{{ record.id }}</span>
            <span class="record-players">{{ record.player1 }} vs {{ record.player2 }}</span>
          </div>
          <div class="record-meta">
            <span>{{ record.move_count }} 手</span>
            <span class="winner">
              {{ record.winner === 1 ? '先手勝' : record.winner === -1 ? '後手勝' : '引分' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Replay Viewer -->
      <div class="replay-viewer">
        <div v-if="!selectedRecord" class="no-selection card">
          選擇棋譜開始回放
        </div>
        <template v-else>
          <div class="board-area">
            <Board
              v-if="currentBoard"
              :board="currentBoard"
              :valid-moves="[]"
            />
          </div>

          <!-- Controls -->
          <div class="controls card">
            <div class="progress">
              第 {{ currentMoveIndex }} / {{ selectedRecord.moves.length }} 手
            </div>
            <div class="buttons">
              <button class="btn btn-secondary" @click="currentMoveIndex = 0">⏮</button>
              <button class="btn btn-secondary" @click="prevMove">◀</button>
              <button class="btn btn-primary" @click="togglePlay">
                {{ isPlaying ? '⏸ 暫停' : '▶ 播放' }}
              </button>
              <button class="btn btn-secondary" @click="nextMove">▶</button>
              <button class="btn btn-secondary" @click="currentMoveIndex = selectedRecord.moves.length">⏭</button>
            </div>
            <button class="btn btn-secondary share-btn" @click="copyShareLink">
              🔗 複製分享連結
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.replay-page h1 {
  margin-bottom: 1.5rem;
}

.replay-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1.5rem;
}

.records-list h3 {
  margin-bottom: 1rem;
}

.loading, .no-data, .no-selection {
  color: var(--text-secondary);
  text-align: center;
  padding: 2rem;
}

.record-item {
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
}

.record-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.record-item.active {
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid var(--accent);
}

.record-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.record-id {
  font-family: monospace;
  color: var(--accent);
}

.record-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.winner {
  font-weight: bold;
}

.replay-viewer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.board-area {
  display: flex;
  justify-content: center;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.progress {
  font-size: 1.1rem;
}

.buttons {
  display: flex;
  gap: 0.5rem;
}

.share-btn {
  margin-top: 0.5rem;
}
</style>
