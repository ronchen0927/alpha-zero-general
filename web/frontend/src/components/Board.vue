<script setup>
import { computed } from 'vue'

const props = defineProps({
  board: { type: Array, required: true },
  validMoves: { type: Array, default: () => [] },
  selected: { type: Array, default: null },
  lastMove: { type: Object, default: null }
})

const emit = defineEmits(['click'])

const PIECE_CHARS = {
  1: '歩', 2: '銀', 3: '金', 4: '角', 5: '飛', 6: '王',
  7: 'と', 8: '全', 9: '馬', 10: '龍'
}

function getPieceChar(value) {
  if (value === 0) return ''
  return PIECE_CHARS[Math.abs(value)] || '?'
}

function isSelected(row, col) {
  return props.selected && props.selected[0] === row && props.selected[1] === col
}

function isLastMove(row, col) {
  if (!props.lastMove) return false
  const { to_sq, from_sq } = props.lastMove
  if (to_sq && to_sq[0] === row && to_sq[1] === col) return true
  if (from_sq && from_sq[0] === row && from_sq[1] === col) return true
  return false
}

function handleClick(row, col) {
  emit('click', row, col)
}
</script>

<template>
  <div class="board">
    <div class="col-labels top">
      <span v-for="c in 5" :key="c">{{ c - 1 }}</span>
    </div>
    <div class="board-grid">
      <div class="row-labels">
        <span v-for="r in 5" :key="r">{{ r - 1 }}</span>
      </div>
      <div class="squares">
        <div
          v-for="row in 5"
          :key="row"
          class="row"
        >
          <div
            v-for="col in 5"
            :key="col"
            class="square"
            :class="{
              light: (row + col) % 2 === 0,
              dark: (row + col) % 2 === 1,
              selected: isSelected(row - 1, col - 1),
              'last-move': isLastMove(row - 1, col - 1),
            }"
            @click="handleClick(row - 1, col - 1)"
          >
            <span
              v-if="board[row - 1][col - 1] !== 0"
              class="piece"
              :class="{
                player1: board[row - 1][col - 1] > 0,
                player2: board[row - 1][col - 1] < 0,
              }"
            >
              {{ getPieceChar(board[row - 1][col - 1]) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.col-labels {
  display: flex;
  justify-content: center;
  gap: 0;
  margin-left: 1.5rem;
}

.col-labels span {
  width: 60px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.board-grid {
  display: flex;
}

.row-labels {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
}

.row-labels span {
  height: 60px;
  width: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.squares {
  display: flex;
  flex-direction: column;
  border: 2px solid var(--accent);
  border-radius: 4px;
  overflow: hidden;
}

.row {
  display: flex;
}

.square {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.light {
  background: var(--board-light);
}

.dark {
  background: var(--board-dark);
}

.selected {
  background: #7cb342 !important;
}

.last-move {
  background: rgba(255, 215, 0, 0.4) !important;
}

.square:hover {
  filter: brightness(1.1);
}

.piece {
  font-size: 1.8rem;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.player1 {
  color: #1a1a1a;
}

.player2 {
  color: #8b0000;
  transform: rotate(180deg);
}
</style>
