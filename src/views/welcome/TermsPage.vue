<script setup lang="ts">
import {IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar} from "@ionic/vue";
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button default-href="/welcome" />
        </ion-buttons>
        <ion-title>Условия использования</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="terms-content" color="dark">
      <div class="wrapper">
        <div class="terms-card">
          <p class="lead">Используя Mythrill, вы соглашаетесь с условиями, изложенными ниже.</p>

          <h2 class="section-title">1. Предоставление сервиса</h2>
          <p>
            Сервис Mythrill предоставляется на условиях «как есть» (as is), в соответствии с
            общепринятой международной практикой. Это означает, что мы не гарантируем
            бесперебойную и безошибочную работу сервиса, полное соответствие результатов
            использования вашим ожиданиям, а также не несём ответственности за сбои и ошибки,
            возникающие при использовании и обновлении сервиса, в том числе связанные с
            несовместимостью с другим программным обеспечением.
          </p>

          <h2 class="section-title">2. Пользовательский контент</h2>
          <p>
            Персонажи, комнаты, NPC, изображения, заметки и любые иные материалы, размещаемые
            пользователями в Mythrill, создаются самими пользователями. Администрация Mythrill не
            проверяет и не модерирует пользовательский контент до его публикации.
          </p>
          <p>
            Полную ответственность за размещаемый контент, включая его соответствие
            законодательству и правам третьих лиц, несёт пользователь, разместивший этот контент.
            Если к нам будут предъявлены претензии третьих лиц в связи с содержанием, размещённым
            пользователем, такой пользователь обязуется урегулировать эти претензии самостоятельно
            и за свой счёт.
          </p>

          <h2 class="section-title">3. Ограничение ответственности</h2>
          <p>
            Mythrill не несёт ответственности за какой-либо прямой или косвенный ущерб,
            причинённый пользователям или третьим лицам в результате использования или
            невозможности использования сервиса, включая потерю данных, если иное не предусмотрено
            действующим законодательством.
          </p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.terms-content {
  --padding-top: 12px;
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-bottom: 24px;
}

.wrapper {
  width: 100%;
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12px;
}

.terms-card {
  width: min(680px, 100%);
  border-radius: 20px;
  padding: 24px 22px;
  box-sizing: border-box;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.18);
  background: linear-gradient(155deg, rgba(var(--ion-color-medium-rgb), 0.38), rgba(var(--ion-color-medium-rgb), 0.24));
  color: rgba(var(--ion-color-light-rgb), 0.86);
  line-height: 1.6;
}

.lead {
  margin: 0 0 20px;
  font-size: 15px;
  color: rgba(var(--ion-color-light-rgb), 0.7);
}

.section-title {
  margin: 24px 0 10px;
  font-size: 17px;
  color: var(--ion-color-light);
}

.section-title:first-of-type {
  margin-top: 0;
}

p {
  margin: 0 0 12px;
  font-size: 14.5px;
}
</style>
