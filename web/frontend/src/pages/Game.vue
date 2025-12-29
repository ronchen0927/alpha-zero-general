<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Board from '../components/Board.vue'
import Hand from '../components/Hand.vue'
import Analysis from '../components/Analysis.vue'

const gameId = ref(null)
const gameState = ref(null)
const loading = ref(false)
const error = ref(null)
const selectedSquare = ref(null)
const selectedHandPiece = ref(null)
const ws = ref(null)

// Piece characters for display
const PIECE_CHARS = {
  1: '歩', 2: '銀', 3: '金', 4: '角', 5: '飛', 6: '王',
  7: 'と', 8: '全', 9: '馬', 10: '龍'
}

const currentPlayerText = computed(() => {
  if (!gameState.value) return ''
  return gameState.value.current_player === 1 ? '先手（黒）' : '後手（白）'
})

const gameEndedText = computed(() => {
  if (!gameState.value || gameState.value.game_ended === 0) return null
  return gameState.value.game_ended === 1 ? '先手の勝ち！' : '後手の勝ち！'
})

async function startNewGame() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch('/api/game/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vs_ai: true })
    })
    const data = await res.json()
    gameId.value = data.game_id
    await fetchGameState()
    connectWebSocket()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function fetchGameState() {
  if (!gameId.value) return
  const res = await fetch(`/api/game/${gameId.value}`)
  gameState.value = await res.json()
}

function connectWebSocket() {
  if (ws.value) ws.value.close()
  ws.value = new WebSocket(`ws://localhost:8000/api/game/ws/${gameId.value}`)
  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'state') {
      gameState.value = data.payload
    }
  }
}

function handleSquareClick(row, col) {
  if (!gameState.value || gameState.value.game_ended !== 0) return

  // If we have a hand piece selected, try to drop
  if (selectedHandPiece.value !== null) {
    makeMove(null, [row, col], false, selectedHandPiece.value)
    selectedHandPiece.value = null
    return
  }

  // If clicking on own piece, select it
  const piece = gameState.value.board[row][col]
  const isOwnPiece = (piece > 0 && gameState.value.current_player === 1) ||
                     (piece < 0 && gameState.value.current_player === -1)

  if (selectedSquare.value === null) {
    if (isOwnPiece) {
      selectedSquare.value = [row, col]
    }
  } else {
    // Try to move
    const [fromRow, fromCol] = selectedSquare.value
    if (fromRow === row && fromCol === col) {
      selectedSquare.value = null
    } else {
      // Check if this is a promotion zone move
      const canPromote = checkCanPromote(fromRow, row)
      if (canPromote) {
        // Ask for promotion (simplified: always promote if possible)
        makeMove([fromRow, fromCol], [row, col], true, null)
      } else {
        makeMove([fromRow, fromCol], [row, col], false, null)
      }
      selectedSquare.value = null
    }
  }
}

function checkCanPromote(fromRow, toRow) {
  const player = gameState.value.current_player
  if (player === 1) {
    return toRow === 0 || fromRow === 0
  } else {
    return toRow === 4 || fromRow === 4
  }
}

function handleHandPieceClick(pieceType) {
  selectedHandPiece.value = pieceType
  selectedSquare.value = null
}

async function makeMove(fromSq, toSq, promote, dropPiece) {
  if (!gameId.value) return

  const payload = {
    to_sq: toSq,
    promote: promote
  }
  if (fromSq) payload.from_sq = fromSq
  if (dropPiece) payload.drop_piece = dropPiece

  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({ type: 'move', payload }))
  } else {
    try {
      const res = await fetch(`/api/game/${gameId.value}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      gameState.value = await res.json()
    } catch (e) {
      error.value = e.message
    }
  }
}

onMounted(() => {
  startNewGame()
})

onUnmounted(() => {
  if (ws.value) ws.value.close()
})
</script>

<template>
  <div class="game-page">
    <div class="game-container">
      <!-- Player 2 Hand -->
      <Hand
        v-if="gameState"
        :pieces="gameState.hands[1]"
        :player="-1"
        :selected="selectedHandPiece"
        @select="handleHandPieceClick"
      />

      <!-- Board -->
      <div class="board-wrapper">
        <div v-if="loading" class="loading">載入中...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <Board
          v-else-if="gameState"
          :board="gameState.board"
          :valid-moves="gameState.valid_moves"
          :selected="selectedSquare"
          :last-move="gameState.last_move"
          @click="handleSquareClick"
        />
      </div>

      <!-- Player 1 Hand -->
      <Hand
        v-if="gameState"
        :pieces="gameState.hands[0]"
        :player="1"
        :selected="selectedHandPiece"
        @select="handleHandPieceClick"
      />
    </div>

    <!-- Game Info -->
    <div class="game-info card">
      <div class="status">
        <span v-if="gameEndedText" class="game-ended">{{ gameEndedText }}</span>
        <span v-else>{{ currentPlayerText }}の番</span>
      </div>
      <div class="actions">
        <button class="btn btn-primary" @click="startNewGame">新しい対局</button>
      </div>
    </div>

    <!-- Analysis Panel -->
    <Analysis v-if="gameId && gameState" :game-id="gameId" />
  </div>
</template>

<style scoped>
.game-page {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.board-wrapper {
  position: relative;
}

.loading, .error {
  padding: 2rem;
  text-align: center;
}

.error {
  color: #ff6b6b;
}

.game-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status {
  font-size: 1.2rem;
  font-weight: bold;
}

.game-ended {
  color: var(--accent);
}

.actions {
  display: flex;
  gap: 0.5rem;
}
</style>
