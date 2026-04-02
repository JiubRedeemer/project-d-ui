<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {IonButton, IonIcon, IonInput, IonModal} from "@ionic/vue";
import {checkmarkOutline} from "ionicons/icons";

const props = defineProps({
  isOpen: Boolean,
  title: String,
  initialValue: Number
});

const emit = defineEmits(["close", "save"]);

const inputValue = ref<number | null>(null);

watch(
  () => [props.isOpen, props.initialValue],
  () => {
    const initialValue = Number.isFinite(props.initialValue) ? Number(props.initialValue) : 0;
    inputValue.value = initialValue === 0 ? null : initialValue;
  },
  {immediate: true}
);

const canSubmit = computed(() => inputValue.value === null || Number.isFinite(Number(inputValue.value)));

const onSave = () => {
  if (!canSubmit.value) return;
  emit("save", Number(inputValue.value ?? 0));
};
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="emit('close')"
    :initial-breakpoint="1"
    :breakpoints="[0, 0.5, 1]"
  >
    <div class="block">
      <div class="header">
        <div class="name">{{ title }}</div>
      </div>
      <div class="input-block">
        <ion-input
          type="number"
          fill="outline"
          color="primary"
          :clear-input="false"
          v-model.number="inputValue"
          label-placement="floating"
          label="Bonus value"
          class="input-block"
          shape="round"
        />
      </div>
      <div class="footer">
        <ion-button size="large" shape="round" :disabled="!canSubmit" @click="onSave">
          <ion-icon slot="icon-only" :icon="checkmarkOutline" color="onPrimary"></ion-icon>
        </ion-button>
      </div>
    </div>
  </ion-modal>
</template>

<style scoped>
.block {
  width: 100%;
  height: 300px;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
}

.header {
  padding: 10px;
  font-size: 1.25rem;
  width: 100%;
  display: flex;
  justify-content: start;
  flex-direction: row;
}

.input-block {
  padding: 10px;
  display: flex;
  justify-content: center;
}

.footer {
  padding: 10px;
  display: flex;
  justify-content: end;
}

ion-modal {
  --border-radius: 10px;
  --height: auto;
  --width: 90%;
  --background: var(--ion-color-dark);
}
</style>
