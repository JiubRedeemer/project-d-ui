<script setup lang="ts">
import {computed, ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonToolbar,
  onIonViewWillEnter, useIonRouter,
} from "@ionic/vue";
import {businessOutline, createOutline, peopleOutline, personOutline, trashOutline} from "ionicons/icons";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {marked} from "marked";
import {getOrganizationByIdForRoom, deleteOrganizationForRoom, getOrganizationsForRoom} from "@/api/organizationApi";
import {getNpcsByRoomIdForRoom} from "@/api/npcApi";
import {getRoomCharacters} from "@/api/masterApi";
import {
  ORGANIZATION_RELATION_LABELS,
  type OrganizationDto,
  type OrganizationRelationDto,
  type OrganizationRelationTypeEnum,
} from "@/api/organizationApi.types";

marked.setOptions({breaks: true});

const route = useRoute();
const router = useRouter();
const ionRouter = useIonRouter();
const roomId = computed(() => String(route.params.roomId));
const orgId = computed(() => String(route.params.orgId));

const org = ref<OrganizationDto | null>(null);
const nameById = ref<Map<string, { name: string; kind: string }>>(new Map());

const renderMarkdown = (t: string | null | undefined): string =>
    t ? (marked.parse(t.replace(/\r\n/g, "\n"), {gfm: true, breaks: true}) as string) : "";

const imageUrl = computed(() => {
  const u = org.value?.imgUrl;
  return u?.trim()
      ? `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${u}`
      : null;
});

const RELATION_ORDER: OrganizationRelationTypeEnum[] = ["LEADER", "MEMBER", "AGENT", "ALLY", "ENEMY"];

const relationGroups = computed(() => {
  const rels = org.value?.relations ?? [];
  return RELATION_ORDER
      .map((type) => ({
        type,
        label: ORGANIZATION_RELATION_LABELS[type],
        items: rels.filter((r) => r.relationType === type),
      }))
      .filter((g) => g.items.length > 0);
});

function targetLabel(rel: OrganizationRelationDto): string {
  if (!rel.targetId) return "—";
  return nameById.value.get(rel.targetId)?.name ?? "Неизвестно";
}

function targetIcon(rel: OrganizationRelationDto) {
  return rel.targetType === "CHARACTER" ? personOutline
      : rel.targetType === "ORGANIZATION" ? businessOutline : peopleOutline;
}

async function load() {
  try {
    const [loaded, npcs, characters, orgs] = await Promise.all([
      getOrganizationByIdForRoom(roomId.value, orgId.value),
      getNpcsByRoomIdForRoom(roomId.value, {forceAll: true}).catch(() => []),
      getRoomCharacters(roomId.value).catch(() => []),
      getOrganizationsForRoom(roomId.value).catch(() => []),
    ]);
    org.value = loaded;
    const map = new Map<string, { name: string; kind: string }>();
    for (const n of npcs) if (n.id) map.set(n.id, {name: n.name, kind: "NPC"});
    for (const c of characters as Array<{ id?: string; name?: string }>)
      if (c.id) map.set(c.id, {name: c.name ?? "Игрок", kind: "Игрок"});
    for (const o of orgs) if (o.id) map.set(o.id, {name: o.name, kind: "Организация"});
    nameById.value = map;
  } catch (e) {
    console.error("Failed to load organization:", e);
  }
}

function edit() {
  ionRouter.push(`/rooms/${roomId.value}/organizations/${orgId.value}/edit`);
}

async function remove() {
  if (!confirm("Удалить организацию?")) return;
  try {
    await deleteOrganizationForRoom(roomId.value, orgId.value);
    router.back();
  } catch (e) {
    console.error("Failed to delete organization:", e);
  }
}

onIonViewWillEnter(load);
</script>

<template>
  <ion-page class="item-page-root">
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button default-href="/" text=""/>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="edit"><ion-icon :icon="createOutline" slot="icon-only"/></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content color="dark" class="content" v-if="org">
      <div class="page">
        <div class="hero">
          <span class="hero__icon">
            <img v-if="imageUrl" :src="imageUrl" class="hero__img" alt=""/>
            <ion-icon v-else :icon="businessOutline"/>
          </span>
          <div class="hero__info">
            <h1 class="hero__name">{{ org.name }}</h1>
            <span v-if="org.type" class="hero__type">{{ org.type }}</span>
          </div>
        </div>

        <section v-if="org.activity || org.location" class="panel">
          <h2 class="panel__title">Сведения</h2>
          <div v-if="org.activity" class="detail-row"><span class="detail-row__label">Деятельность</span><span class="detail-row__val">{{ org.activity }}</span></div>
          <div v-if="org.location" class="detail-row"><span class="detail-row__label">Расположение</span><span class="detail-row__val">{{ org.location }}</span></div>
        </section>

        <section v-if="org.description" class="panel">
          <h2 class="panel__title">Описание</h2>
          <div class="description-html" v-html="renderMarkdown(org.description)"/>
        </section>

        <section v-if="relationGroups.length" class="panel">
          <h2 class="panel__title">Связи</h2>
          <div v-for="group in relationGroups" :key="group.type" class="rel-group">
            <div class="rel-group__label">{{ group.label }}</div>
            <div class="rel-chips">
              <span v-for="(rel, ri) in group.items" :key="ri" class="rel-chip">
                <ion-icon :icon="targetIcon(rel)"/>
                {{ targetLabel(rel) }}
                <small v-if="rel.note" class="rel-chip__note">— {{ rel.note }}</small>
              </span>
            </div>
          </div>
        </section>
      </div>

      <div class="delete-section">
        <ion-button expand="block" fill="clear" color="danger" @click="remove">
          <ion-icon slot="start" :icon="trashOutline"/>
          Удалить организацию
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.content { --background: var(--ion-color-dark); }
.page { display: flex; flex-direction: column; gap: 10px; padding: 10px 14px; max-width: 720px; margin: 0 auto; }

.hero { display: flex; align-items: center; gap: 14px; padding: 4px 2px 8px; }
.hero__icon {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  width: 64px; height: 64px; border-radius: 20px; font-size: 30px; overflow: hidden;
  color: var(--ion-color-primary); background: rgba(var(--ion-color-primary-rgb), 0.14);
}
.hero__img { width: 100%; height: 100%; object-fit: cover; }
.hero__name { margin: 0; font-size: 22px; font-weight: 700; color: var(--ion-color-light); }
.hero__type { font-size: 13px; color: var(--ion-color-primary); }

.panel { padding: 14px; border-radius: 16px; background: var(--ion-color-medium); border: 1px solid rgba(var(--ion-color-light-rgb), 0.06); }
.panel__title { margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(var(--ion-color-light-rgb), 0.5); }

.detail-row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.06); }
.detail-row:last-child { border-bottom: none; }
.detail-row__label { font-size: 14px; color: rgba(var(--ion-color-light-rgb), 0.62); }
.detail-row__val { font-size: 14px; font-weight: 600; color: var(--ion-color-light); text-align: right; }

.rel-group { margin-bottom: 12px; }
.rel-group:last-child { margin-bottom: 0; }
.rel-group__label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(var(--ion-color-light-rgb), 0.45); margin-bottom: 6px; }
.rel-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rel-chip {
  display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px;
  font-size: 13px; color: var(--ion-color-light);
  background: rgba(var(--ion-color-primary-rgb), 0.1); border: 1px solid rgba(var(--ion-color-primary-rgb), 0.22);
}
.rel-chip__note { color: rgba(var(--ion-color-light-rgb), 0.55); }

.description-html :deep(p) { margin: 0 0 0.6em; font-size: 15px; line-height: 1.6; color: rgba(var(--ion-color-light-rgb), 0.9); }
.delete-section { padding: 8px 16px 24px; }
</style>
