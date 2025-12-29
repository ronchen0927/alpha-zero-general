<script setup>
const props = defineProps({
  pieces: { type: Object, required: true },
  player: { type: Number, required: true },
  selected: { type: Number, default: null }
})

const emit = defineEmits(['select'])

const PIECE_CHARS = {
  1: '歩', 2: '銀', 3: '金', 4: '角', 5: '飛'
}

// Convert pieces object to array
function getPiecesList() {
  const list = []
  for (const [pieceType, count] of Object.entries(props.pieces)) {
    for (let i = 0; i < count; i++) {
      list.push(parseInt(pieceType))
    }
  }
  return list
}

function handleClick(pieceType) {
  emit('select', pieceType)
}
</script>

<template>
  <div class="hand" :class="{ 'player2': player === -1 }">
    <div class="hand-label">{{ player === 1 ? '先手持ち駒' : '後手持ち駒' }}</div>
    <div class="pieces">
      <div
        v-for="(pieceType, idx) in getPiecesList()"
        :key="idx"
        class="hand-piece"
        :class="{ selected: selected === pieceType }"
        @click="handleClick(pieceType)"
      >
        {{ PIECE_CHARS[pieceType] }}
      </div>
      <div v-if="getPiecesList().length === 0" class="empty">なし</div>
    </div>
  </div>
</template>

<style scoped>
.hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  min-width: 200px;
}

.hand.player2 {
  order: -1;
}

.hand-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.pieces {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  justify-content: center;
}

.hand-piece {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--board-light);
  border-radius: 4px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
}

.hand-piece:hover {
  transform: scale(1.1);
  background: var(--accent);
}

.hand-piece.selected {
  background: #7cb342;
  box-shadow: 0 0 10px rgba(124, 179, 66, 0.5);
}

.empty {
  color: var(--text-secondary);
  font-size: 0.9rem;
}
</style>
