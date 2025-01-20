<template>
  <div class="outer-circle">
    <div class="inner-circle" :class="{ 'checked': checked }"></div>
  </div>
</template>

<script>
export default {
  name: "CircleToggle",
  props: {
    checked: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
.outer-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%; /* Задайте размер внешнего круга */
  height: 100%;
  border: 2px solid #ccc; /* Цвет рамки внешнего круга */
  border-radius: 50%;
  position: relative;
}

.inner-circle {
  width: 50%; /* Задайте размер внутреннего круга */
  height: 50%;
  border-radius: 50%;
  background-color: transparent;
  transition: background-color 0.3s ease;
}

.inner-circle.checked {
  background-color: var(--ion-color-primary); /* Цвет закрашивания, если checked=true */
}
</style>
