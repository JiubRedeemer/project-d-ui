<script setup lang="ts">
import { watch } from "vue";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits(["close"]);

const close = () => emit("close");

// блокируем скролл body
watch(
  () => props.isOpen,
  (val) => {
    document.body.style.overflow = val ? "hidden" : "";
  }
);
</script>


<template>
  <teleport to="body">
    <div
      v-if="isOpen"
      class="top-modal-backdrop"
      @click.self="close"
    >
      <div class="top-modal">
        <slot />
      </div>
    </div>
  </teleport>
</template>


<style scoped>
.top-modal-backdrop {
  position: relative;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9999;
}

.top-modal {
  position: relative;
  top: 125px;
  left: 50%;
  transform: translate(-50%, -100%);
  width: 95%;
  max-width: 480px;
  background: var(--ion-background-color, #fff);
  border-radius: 0 0 16px 16px;
  padding: 0px;

  animation: slideDown 0.25s ease-out forwards;
}

@keyframes slideDown {
  to {
    transform: translate(-50%, 0);
  }
}
</style>

