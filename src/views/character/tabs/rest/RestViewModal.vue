<script setup lang="ts">
import {IonButton, IonModal, IonRange} from "@ionic/vue";

const props = defineProps({
  isOpen: Boolean, // Принимаем видимость модалки
});

const emit = defineEmits(["closeRestModal"]); // Добавляем событие закрытия

</script>

<template>
  <ion-modal :is-open="isOpen"
             @didDismiss="emit('closeRestModal')"
             :initial-breakpoint="1"
             :breakpoints="[0, 0.5, 1]">
    <div class="rest">
      <div class="rest-parameters">
        <div class="dice-count">
          <div class="dice-count-header">
            Использовать кубов здоровья
          </div>
          <div class="dice-count-value">
            <IonRange aria-label="Rest counter" :pin="true" :ticks="true" :snaps="true"
                      :min="0" :max="10"></IonRange>
          </div>
          <div class="rest-selector">
            <ion-toggle aria-label="Toggle rest" color="primary" :checked="false"></ion-toggle>
            <div class="rest-selected-name">
              Короткий отдых
            </div>
          </div>
        </div>
      </div>
      <ion-button expand="block" shape="round" color="secondary" fill="outline">
        Отдохнуть
      </ion-button>
    </div>
  </ion-modal>
</template>
<style scoped>


ion-modal {
  --height: 50%;
  --width: 95%;
  margin-bottom: 100%;
  --border-radius: 15px;
}

ion-modal::part(backdrop) {
}

ion-modal ion-toolbar {
}
</style>