<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonPage,
  IonSelect, IonSelectOption, IonTextarea, IonToggle, IonToolbar, toastController,
} from "@ionic/vue";
import {addOutline, businessOutline, closeCircleOutline, saveOutline} from "ionicons/icons";
import axios from "axios";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {
  getOrganizationByIdForRoom, saveOrganizationForRoom,
} from "@/api/organizationApi";
import {getOrganizationsForRoom} from "@/api/organizationApi";
import {getNpcsByRoomIdForRoom} from "@/api/npcApi";
import {getRoomCharacters} from "@/api/masterApi";
import {
  ORGANIZATION_RELATION_LABELS, RELATION_TARGET_LABELS,
  type OrganizationRelationTypeEnum, type RelationTargetTypeEnum,
  type SaveOrganizationRelationRequest, type SaveOrganizationRequest,
} from "@/api/organizationApi.types";

const route = useRoute();
const router = useRouter();
const roomId = computed(() => String(route.params.roomId));
const orgId = computed(() => (route.params.orgId ? String(route.params.orgId) : null));

const form = ref<SaveOrganizationRequest>({
  roomId: roomId.value,
  name: "",
  description: "",
  type: "",
  activity: "",
  location: "",
  visible: true,
  statsHidden: false,
  imgUrl: null,
  relations: [],
});
const relations = ref<SaveOrganizationRelationRequest[]>([]);
const saving = ref(false);

// Аватар: храним в том же бакете, что и NPC, с префиксом org_
const fileInput = ref<HTMLInputElement | null>(null);
const previewImage = ref<string | null>(null);
const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];

function orgImageUrl(imgUrl: string | null | undefined): string | null {
  if (!imgUrl?.trim()) return null;
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${imgUrl}`;
}

const currentImageUrl = computed(() => previewImage.value ?? orgImageUrl(form.value.imgUrl));

function triggerFileInput() {
  fileInput.value?.click();
}

async function uploadToStorage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userFilename", `org_${Date.now()}`);
  const res = await axios.put(
      `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
      formData,
      {headers: {"Content-Type": "multipart/form-data"}}
  );
  return res.data;
}

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  if (!file || !allowedFormats.includes(file.type)) {
    if (file) alert("Формат файла не поддерживается.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => { previewImage.value = reader.result as string; };
  reader.readAsDataURL(file);
  form.value.imgUrl = await uploadToStorage(file);
}

// Справочники целей связей
const characters = ref<Array<{ id: string; name: string }>>([]);
const npcs = ref<Array<{ id: string; name: string }>>([]);
const orgs = ref<Array<{ id: string; name: string }>>([]);

const relationTypeOptions = Object.entries(ORGANIZATION_RELATION_LABELS) as [OrganizationRelationTypeEnum, string][];
const targetTypeOptions = Object.entries(RELATION_TARGET_LABELS) as [RelationTargetTypeEnum, string][];

function targetOptions(type: RelationTargetTypeEnum | null | undefined) {
  if (type === "CHARACTER") return characters.value;
  if (type === "NPC") return npcs.value;
  if (type === "ORGANIZATION") return orgs.value.filter((o) => o.id !== orgId.value);
  return [];
}

function addRelation() {
  relations.value.push({targetType: "NPC", targetId: null, relationType: "MEMBER", note: ""});
}

function removeRelation(i: number) {
  relations.value.splice(i, 1);
}

async function loadReferences() {
  const [chs, ns, os] = await Promise.all([
    getRoomCharacters(roomId.value).catch(() => []),
    getNpcsByRoomIdForRoom(roomId.value, {forceAll: true}).catch(() => []),
    getOrganizationsForRoom(roomId.value).catch(() => []),
  ]);
  characters.value = (chs as Array<{ id?: string; name?: string }>)
      .filter((c) => c.id).map((c) => ({id: c.id!, name: c.name ?? "Игрок"}));
  npcs.value = ns.filter((n) => n.id).map((n) => ({id: n.id, name: n.name}));
  orgs.value = os.filter((o) => o.id).map((o) => ({id: o.id, name: o.name}));
}

async function loadIfEditing() {
  if (!orgId.value) return;
  const dto = await getOrganizationByIdForRoom(roomId.value, orgId.value);
  form.value = {
    id: dto.id,
    roomId: dto.roomId,
    name: dto.name ?? "",
    description: dto.description ?? "",
    type: dto.type ?? "",
    activity: dto.activity ?? "",
    location: dto.location ?? "",
    visible: dto.visible ?? true,
    statsHidden: dto.statsHidden ?? false,
    imgUrl: dto.imgUrl ?? null,
    relations: [],
  };
  // Редактируем только исходящие связи этой организации (входящие — чужие).
  relations.value = (dto.relations ?? [])
      .filter((r) => !r.incoming)
      .map((r) => ({
        id: r.id, targetType: r.targetType, targetId: r.targetId,
        relationType: r.relationType, note: r.note ?? "",
      }));
}

async function onSave() {
  if (!form.value.name.trim()) {
    (await toastController.create({message: "Введите название", duration: 1500, position: "top", color: "warning"})).present();
    return;
  }
  saving.value = true;
  try {
    const body: SaveOrganizationRequest = {
      ...form.value,
      roomId: roomId.value,
      name: form.value.name.trim(),
      relations: relations.value.filter((r) => r.targetId && r.targetType && r.relationType),
    };
    await saveOrganizationForRoom(roomId.value, body);
    (await toastController.create({message: orgId.value ? "Организация обновлена" : "Организация создана", duration: 1000, position: "top"})).present();
    router.back();
  } catch (e) {
    console.error("Failed to save organization:", e);
    (await toastController.create({message: "Ошибка при сохранении", duration: 2000, position: "top", color: "danger"})).present();
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadReferences();
  await loadIfEditing();
});
</script>

<template>
  <ion-page class="item-page-root">
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start"><ion-back-button default-href="/" text=""/></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content color="dark" class="content">
      <div class="page">
        <button type="button" class="avatar" @click="triggerFileInput">
          <img v-if="currentImageUrl" :src="currentImageUrl" class="avatar__img" alt=""/>
          <span v-else class="avatar__placeholder">
            <ion-icon :icon="businessOutline"/>
            <span>Логотип</span>
          </span>
          <input ref="fileInput" type="file" accept="image/*" class="avatar__file" @change="handleFileUpload"/>
        </button>

        <div class="item-identity">
          <ion-input v-model="form.name" class="name-input" placeholder="Название организации"/>
        </div>

        <section class="panel">
          <h2 class="panel__title">Сведения</h2>
          <div class="field"><span class="field__label">Тип</span><ion-input v-model="form.type" class="field__input" placeholder="напр. Гильдия"/></div>
          <div class="field"><span class="field__label">Деятельность</span><ion-input v-model="form.activity" class="field__input" placeholder="Чем занимается"/></div>
          <div class="field"><span class="field__label">Расположение</span><ion-input v-model="form.location" class="field__input" placeholder="Где базируется"/></div>
          <div class="field field--toggle">
            <span class="field__label">Видна игрокам</span>
            <ion-toggle :checked="form.visible !== false" @ionChange="(e:any)=>form.visible=e.detail.checked"/>
          </div>
          <div class="field field--toggle">
            <span class="field__label">Скрыть характеристики</span>
            <ion-toggle :checked="!!form.statsHidden" @ionChange="(e:any)=>form.statsHidden=e.detail.checked"/>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel__title">Описание</h2>
          <ion-textarea v-model="form.description" class="area" :rows="5" auto-grow placeholder="Описание организации..."/>
        </section>

        <section class="panel">
          <h2 class="panel__title">Связи</h2>
          <div class="rel-list">
            <div v-for="(rel, i) in relations" :key="i" class="rel-row">
              <div class="rel-row__top">
                <ion-select class="rel-select" :value="rel.targetType" interface="action-sheet"
                            @ionChange="(e:any)=>{ rel.targetType=e.detail.value; rel.targetId=null; }">
                  <ion-select-option v-for="[val,label] in targetTypeOptions" :key="val" :value="val">{{ label }}</ion-select-option>
                </ion-select>
                <button class="rel-remove" @click="removeRelation(i)">✕</button>
              </div>
              <ion-select class="rel-select rel-select--wide" :value="rel.targetId" interface="action-sheet"
                          placeholder="Выберите цель"
                          @ionChange="(e:any)=>rel.targetId=e.detail.value">
                <ion-select-option v-for="opt in targetOptions(rel.targetType)" :key="opt.id" :value="opt.id">{{ opt.name }}</ion-select-option>
              </ion-select>
              <ion-select class="rel-select rel-select--wide" :value="rel.relationType" interface="action-sheet"
                          placeholder="Тип связи"
                          @ionChange="(e:any)=>rel.relationType=e.detail.value">
                <ion-select-option v-for="[val,label] in relationTypeOptions" :key="val" :value="val">{{ label }}</ion-select-option>
              </ion-select>
              <ion-input class="rel-note" :value="rel.note" placeholder="Заметка (опц.)"
                         @ionInput="(e:any)=>rel.note=e.target.value"/>
            </div>
            <button class="rel-add" @click="addRelation"><ion-icon :icon="addOutline"/> Добавить связь</button>
          </div>
        </section>
      </div>
    </ion-content>

    <div class="footer">
      <ion-button class="footer__btn" fill="clear" shape="round" @click="router.back()">
        <ion-icon slot="start" :icon="closeCircleOutline"/>Отменить
      </ion-button>
      <ion-button class="footer__btn footer__btn--primary" fill="solid" shape="round" color="primary"
                  :disabled="saving || !form.name.trim()" @click="onSave">
        <ion-icon slot="start" :icon="saveOutline"/>Сохранить
      </ion-button>
    </div>
  </ion-page>
</template>

<style scoped>
.content { --background: var(--ion-color-dark); --padding-bottom: 120px; }
.page { display: flex; flex-direction: column; gap: 10px; padding: 8px 14px; max-width: 720px; margin: 0 auto; }

.avatar {
  position: relative;
  align-self: center;
  width: 120px;
  height: 120px;
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--ion-color-medium);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
}
.avatar__img { width: 100%; height: 100%; object-fit: cover; }
.avatar__placeholder { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 13px; color: rgba(var(--ion-color-light-rgb), 0.5); }
.avatar__placeholder ion-icon { font-size: 34px; }
.avatar__file { display: none; }

.item-identity { padding: 0 4px; }
.name-input { font-size: 22px; font-weight: 700; --color: var(--ion-color-light); --placeholder-color: rgba(var(--ion-color-light-rgb), 0.35); }

.panel { padding: 14px; border-radius: 16px; background: var(--ion-color-medium); border: 1px solid rgba(var(--ion-color-light-rgb), 0.06); }
.panel__title { margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(var(--ion-color-light-rgb), 0.5); }

.field { display: grid; grid-template-columns: 130px 1fr; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.06); }
.field--toggle { grid-template-columns: 1fr auto; }
.field:last-child { border-bottom: none; }
.field__label { font-size: 14px; color: rgba(var(--ion-color-light-rgb), 0.62); }
.field__input { --background: rgba(0,0,0,0.16); --padding-start: 10px; --padding-end: 10px; --color: var(--ion-color-light); border-radius: 10px; min-height: 36px; }
.area { --background: rgba(0,0,0,0.16); --padding-start: 12px; --padding-end: 12px; --color: var(--ion-color-light); border-radius: 12px; }

.rel-list { display: flex; flex-direction: column; gap: 10px; }
.rel-row { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }
.rel-row__top { display: flex; align-items: center; gap: 6px; }
.rel-select { flex: 1; --background: rgba(255,255,255,0.06); border-radius: 8px; background: rgba(255,255,255,0.06); min-height: 38px; --padding-start: 10px; --padding-end: 10px; }
.rel-select--wide { width: 100%; }
.rel-note { --background: rgba(255,255,255,0.06); --padding-start: 10px; --padding-end: 10px; --color: var(--ion-color-light); border-radius: 8px; min-height: 36px; }
.rel-remove { width: 30px; height: 30px; flex-shrink: 0; border-radius: 8px; background: transparent; border: 1px solid rgba(var(--ion-color-danger-rgb), 0.3); color: var(--ion-color-danger); cursor: pointer; }
.rel-add { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; background: transparent; border: 1px dashed rgba(var(--ion-color-primary-rgb), 0.35); color: var(--ion-color-primary); font-weight: 600; cursor: pointer; }

.footer { position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 8px; padding: 8px 14px calc(10px + env(safe-area-inset-bottom, 0px)); background: rgba(var(--ion-color-dark-rgb), 0.94); border-top: 1px solid rgba(var(--ion-color-primary-rgb), 0.12); backdrop-filter: blur(12px); }
.footer__btn { flex: 1; margin: 0; text-transform: none; --border-radius: 14px; }
.footer__btn--primary { flex: 1.4; }
</style>
