<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
  IonToolbar,
  toastController
} from "@ionic/vue";
import {HEADERS, TEXTS} from "@/config/localisations";
import {FILE_STORAGE_INTEGRATION_ROUTES} from "@/config/integrationRoutes";
import {add, addOutline, close, closeCircleOutline, saveOutline} from "ionicons/icons";
import {onBeforeMount, ref, watch} from "vue";
import {useCreateInventoryItemStore} from "@/stores/CreateInventoryItemStore";
import axios from "axios";
import {v4 as uuidv4} from 'uuid';
import {Price} from "@/components/models/response/InventoryResponse";

const previewImage = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const createInventoryItemStore = useCreateInventoryItemStore();
const avatarImage = ref<File | null>(null);
const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff", "image/svg+xml"];
const filePath = ref<string>("");
const itemId = uuidv4();
const itemRarity = ref<string>("COMMON");
const typeSelectRef = ref<any>(null);
const selectedType = ref(createInventoryItemStore.item.typeName);
const selectedSubtype = ref(createInventoryItemStore.item.subtypeName ?? '');
const subtypeSelectRef = ref<any>(null);
const editedValues = ref<number | undefined>(0);
const viewType = ref<string>("ARMOR");
const visibleForPlayers = ref<boolean>(true);
const customization = ref<boolean>(false);
const invalidFields = ref<string[]>([]); // Track invalid fields

onBeforeMount(() => {
  createInventoryItemStore.item.id = itemId;
  createInventoryItemStore.item.typeName = "Доспех";
  createInventoryItemStore.item.type = "ARMOR";
  createInventoryItemStore.item.stats = {
    weight: 0,
    armorClassMaxDexterityBonus: "",
    requirement: "",
    tags: []
  };
  createInventoryItemStore.item.stats.weight = 0;
  createInventoryItemStore.item.name = {
    rus: '',
    eng: ''
  };
  createInventoryItemStore.item.description = "";
  createInventoryItemStore.item.rarity = "COMMON";
});

function openTypeSelect() {
  if (typeSelectRef.value?.$el?.open) {
    typeSelectRef.value.$el.open();
  } else if (typeSelectRef.value?.open) {
    typeSelectRef.value.open();
  } else {
    console.warn('ion-select не готов');
  }
}

watch(selectedType, (newValue) => {
  createInventoryItemStore.item.typeName = newValue;
  createInventoryItemStore.item.type = mapTypeToValue(newValue);
  viewType.value = mapTypeToValue(newValue);
  createInventoryItemStore.item.name.rus = "";
  createInventoryItemStore.item.name.eng = "";
  createInventoryItemStore.item.description = "";
  invalidFields.value = []; // Reset invalid fields on type change
});

watch(() => createInventoryItemStore.item.type, (newType) => {
  if (!['ARMOR', 'WEAPON'].includes(newType)) {
    selectedSubtype.value = '';
    createInventoryItemStore.item.subtypeName = '';
    return;
  }
  const firstOption = getSubtypesByType(newType)[0]?.label ?? '';
  selectedSubtype.value = firstOption;
  createInventoryItemStore.item.subtypeName = firstOption;
  invalidFields.value = []; // Reset invalid fields on type change
});

const defaultPriceValue = ref<number>(0);
const defaultPriceCoinType = ref<string>("GOLDEN");
const defaultPrice = ref<Price>({value: 0, coinType: "GOLDEN"});

watch(defaultPriceValue, (newValue) => {
  defaultPrice.value.value = newValue;
  if (newValue >= 0) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'defaultPriceValue');
  }
});

watch(defaultPriceCoinType, (newValue) => {
  defaultPrice.value.coinType = newValue;
  if (newValue) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'defaultPriceCoinType');
  }
});

const damageType = ref<string>("CRUSHING");
const damageValue = ref<string>("");

watch(damageValue, (newValue) => {
  if (newValue?.trim()) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'damageValue');
  }
});

watch(damageType, (newValue) => {
  if (newValue?.trim()) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'damageType');
  }
});

function openSubtypeSelect() {
  if (subtypeSelectRef.value?.$el?.open) {
    subtypeSelectRef.value.$el.open();
  } else if (subtypeSelectRef.value?.open) {
    subtypeSelectRef.value.open();
  }
}

watch(itemRarity, (newValue) => {
  createInventoryItemStore.item.rarity = newValue;
  if (validRarities.includes(newValue)) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'itemRarity');
  }
});

function getSubtypesByType(type: string) {
  if (type === 'WEAPON') {
    return [
      {value: 'SHW', label: 'Простое рукопашное'},
      {value: 'SRW', label: 'Простое дальнобойное'},
      {value: 'AHW', label: 'Воинское рукопашное'},
      {value: 'ARW', label: 'Воинское дальнобойное'},
      {value: 'EHW', label: 'Экзотическое рукопашное'},
      {value: 'ERW', label: 'Экзотическое дальнобойное'},
    ];
  } else if (type === 'ARMOR') {
    return [
      {value: 'HEAVY_ARMOR', label: 'Тяжелый доспех'},
      {value: 'MEDIUM_ARMOR', label: 'Средний доспех'},
      {value: 'LIGHT_ARMOR', label: 'Легкий доспех'},
      {value: 'SHIELD', label: 'Щит'},
    ];
  }
  return [];
}

watch(selectedSubtype, (newValue) => {
  createInventoryItemStore.item.subtypeName = newValue;
  createInventoryItemStore.item.subtype = mapSubTypeToValue(newValue)
  if (newValue && getSubtypesByType(createInventoryItemStore.item.type).some(sub => sub.label === newValue)) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'selectedSubtype');
  }
});

function onTypeNameChange(event: CustomEvent) {
  const selected = event.detail.value;
  createInventoryItemStore.item.typeName = selected;
  createInventoryItemStore.item.type = mapTypeToValue(selected);
  if (selected) {
    invalidFields.value = invalidFields.value.filter(field => field !== 'selectedType');
  }
}

function mapTypeToValue(display: string): string {
  switch (display) {
    case 'Доспех':
      return 'ARMOR';
    case 'Оружие':
      return 'WEAPON';
    case 'Магический предмет':
      return 'MAGIC';
    case 'Другое':
      return 'OTHER';
    default:
      return 'OTHER';
  }
}

function mapSubTypeToValue(name: string): string {
  switch (name) {
    case 'Простое рукопашное':
      return 'SHW'
    case 'Простое дальнобойное':
      return 'SRW'
    case 'Воинское рукопашное':
      return 'AHW'
    case 'Воинское дальнобойное':
      return 'ARW'
    case 'Экзотическое рукопашное':
      return 'EHW'
    case 'Экзотическое дальнобойное':
      return 'ERW'
    case 'Тяжелый доспех':
      return 'HEAVY_ARMOR'
    case 'Средний доспех':
      return 'MEDIUM_ARMOR'
    case 'Легкий доспех':
      return 'LIGHT_ARMOR'
    case 'Щит':
      return 'SHIELD'
    default:
      return 'None'
  }
}

  const triggerFileInput = () => {
    fileInput.value?.click();
  };

  const handleFileUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (file && allowedFormats.includes(file.type)) {
      avatarImage.value = file;
      const reader = new FileReader();
      reader.onload = () => {
        previewImage.value = reader.result as string;
      };
      reader.readAsDataURL(file);
      filePath.value = await uploadToMinio(avatarImage.value);
      createInventoryItemStore.item.imgUrl = filePath.value;
    } else {
      alert("Формат файла не поддерживается. Разрешены: JPG, PNG, GIF, BMP, WEBP, TIFF, SVG.");
    }
  };

  const uploadToMinio = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userFilename", createInventoryItemStore.item.id);
    const res = await axios.put(
        `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.upload}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
    );
    return res.data;
  };

  function getAbbreviation(str: string | undefined): string {
    if (!str) {
      return "";
    }
    if (isLetter(str)) {
      return str.split(/\s+/).map(word => word[0].toUpperCase()).join('');
    } else {
      return 'Bad name';
    }
  }

  function isLetter(str: string) {
    const regExp = /[0-9]/;
    if (!regExp.test(str) && str.length >= 3) {
      return str;
    }
  }

  const startEditing = () => {
    editedValues.value = createInventoryItemStore.item.stats.weight;
  };

  const updateFieldValue = (number: number) => {
    editedValues.value = number;
  };

  const saveField = (number: number) => {
    createInventoryItemStore.item.stats.weight = number;
    if (number >= 0) {
      invalidFields.value = invalidFields.value.filter(field => field !== 'weight');
    }
  };

  const newTag = ref<string>("");

  function addTag() {
    const tag = newTag.value.trim();
    if (tag && !createInventoryItemStore?.item?.stats?.tags?.includes(tag)) {
      createInventoryItemStore?.item?.stats?.tags?.push(tag);
      newTag.value = "";
    }
  }

  function removeTag(tag: string) {
    createInventoryItemStore.item.stats.tags = createInventoryItemStore?.item?.stats?.tags?.filter(t => t !== tag);
  }

  async function saveItem() {
    if (viewType.value == "WEAPON") {
      createInventoryItemStore.item.stats.damage = {
        damageType: damageType.value,
        value: damageValue.value
      };
      createInventoryItemStore.item.stats.armorClass = undefined;
      createInventoryItemStore.item.stats.requirement = undefined;
      createInventoryItemStore.item.stats.armorClassMaxDexterityBonus = undefined;
    } else if (viewType.value == "ARMOR") {
      createInventoryItemStore.item.stats.damage = undefined;
    } else {
      createInventoryItemStore.item.stats.damage = undefined;
      createInventoryItemStore.item.stats.armorClass = undefined;
      createInventoryItemStore.item.stats.requirement = undefined;
      createInventoryItemStore.item.stats.armorClassMaxDexterityBonus = undefined;
    }

    createInventoryItemStore.item.rarity = itemRarity.value;
    createInventoryItemStore.item.visibleForPlayers = visibleForPlayers.value;
    createInventoryItemStore.item.customization = customization.value;
    createInventoryItemStore.item.stats.defaultPrice = [{
      coinType: defaultPriceCoinType.value,
      value: defaultPriceValue.value
    }];

    if (validateItem(viewType.value)) {
      console.log(createInventoryItemStore.item);
      invalidFields.value = []; // Clear invalid fields on successful save
    } else {
      const toast = await toastController.create({
        message: 'Заполните обязательные поля',
        duration: 1000,
        position: 'top'
      });
      await toast.present();
    }
  }

  const validRarities = ['COMMON', 'UNCOMMON', 'RARE', 'VERY_RARE', 'LEGENDARY'];

  function validateItem(type: string): boolean {
    invalidFields.value = []; // Reset invalid fields
    const errors: string[] = [];

    if (!createInventoryItemStore.item) {
      errors.push("Отсутствует объект предмета");
      console.error("Валидация не пройдена: Отсутствует объект предмета");
      return false;
    }

    const {item} = createInventoryItemStore;

    // Validate basic required fields
    if (!item.typeName) {
      errors.push("Не указан тип предмета (typeName)");
      invalidFields.value.push('selectedType');
    }
    if (!item.type) {
      errors.push("Не указан тип предмета (type)");
      invalidFields.value.push('selectedType');
    }
    if (!item.rarity) {
      errors.push("Не указана редкость предмета (rarity)");
      invalidFields.value.push('itemRarity');
    }
    if (!item.name?.rus?.trim()) {
      errors.push("Не указано русское название предмета");
      invalidFields.value.push('nameRus');
    }
    if (!item.name?.eng?.trim()) {
      errors.push("Не указано английское название предмета");
      invalidFields.value.push('nameEng');
    }

    // Validate stats object
    if (!item.stats) {
      errors.push("Отсутствует объект характеристик (stats)");
      console.error("Валидация не пройдена: Отсутствует объект характеристик (stats)");
      return false;
    }

    // Validate price
    if (!item.stats.defaultPrice?.length) {
      errors.push("Не указана цена (defaultPrice)");
      invalidFields.value.push('defaultPriceValue');
    } else {
      if (!item.stats.defaultPrice[0]?.value) {
        errors.push("Не указано значение цены (defaultPrice.value)");
        invalidFields.value.push('defaultPriceValue');
      } else if (item.stats.defaultPrice[0].value < 0) {
        errors.push("Значение цены не может быть отрицательным");
        invalidFields.value.push('defaultPriceValue');
      }
      if (!item.stats.defaultPrice[0]?.coinType) {
        errors.push("Не указан тип валюты (defaultPrice.coinType)");
        invalidFields.value.push('defaultPriceCoinType');
      }
    }

    // Validate rarity
    if (!validRarities.includes(item.rarity!)) {
      errors.push(`Недопустимое значение редкости. Допустимые значения: ${validRarities.join(', ')}`);
      invalidFields.value.push('itemRarity');
    }

    // Type-specific validations
    if (type === "ARMOR") {
      if (item.subtypeName && !getSubtypesByType('ARMOR').some(sub => sub.label === item.subtypeName)) {
        errors.push(`Недопустимый подтип доспеха: ${item.subtypeName}`);
        invalidFields.value.push('selectedSubtype');
      }
      if (!item.stats.weight && item.stats.weight !== 0) {
        errors.push("Не указан вес доспеха (weight)");
        invalidFields.value.push('weight');
      } else if (item.stats.weight < 0) {
        errors.push("Вес доспеха не может быть отрицательным");
        invalidFields.value.push('weight');
      }
      if (!item.stats.armorClass?.trim()) {
        errors.push("Не указан класс брони (armorClass)");
        invalidFields.value.push('armorClass');
      }
      if (!item.stats.armorClassMaxDexterityBonus?.trim()) {
        errors.push("Не указан максимальный бонус ловкости (armorClassMaxDexterityBonus)");
        invalidFields.value.push('armorClassMaxDexterityBonus');
      }
      if (!item.stats.requirement?.trim()) {
        errors.push("Не указано требование силы (requirement)");
        invalidFields.value.push('requirement');
      }
    }

    if (type === "WEAPON") {
      if (item.subtypeName && !getSubtypesByType('WEAPON').some(sub => sub.label === item.subtypeName)) {
        errors.push(`Недопустимый подтип оружия: ${item.subtypeName}`);
        invalidFields.value.push('selectedSubtype');
      }
      if (!item.stats.damage) {
        errors.push("Отсутствует объект урона (damage)");
        invalidFields.value.push('damageValue');
      } else {
        if (!item.stats.damage.damageType?.trim()) {
          errors.push("Не указан тип урона (damage.damageType)");
          invalidFields.value.push('damageType');
        }
        if (!item.stats.damage.value?.trim()) {
          errors.push("Не указано значение урона (damage.value)");
          invalidFields.value.push('damageValue');
        }
      }
    }

    if (type === "OTHER" || type === "MAGIC") {
      if (!item.stats.weight && item.stats.weight !== 0) {
        errors.push("Не указан вес предмета (weight)");
        invalidFields.value.push('weight');
      } else if (item.stats.weight < 0) {
        errors.push("Вес предмета не может быть отрицательным");
        invalidFields.value.push('weight');
      }
    }

    if (errors.length > 0) {
      console.error("Валидация не пройдена. Ошибки:", errors.join("; "));
      return false;
    }

    if (type !== "ARMOR" && type !== "WEAPON" && type !== "OTHER" && type !== "MAGIC") {
      errors.push(`Недопустимый тип предмета: ${type}`);
      console.error(`Валидация не пройдена: Недопустимый тип предмета: ${type}`);
      invalidFields.value.push('selectedType');
      return false;
    }

    return true;
  }
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button/>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="container">
        <div class="header">
          <div class="avatar" @click="triggerFileInput" :class="`rarity-${itemRarity.toLowerCase()}`">
            <img v-if="previewImage" :src="previewImage" class="avatar-img" alt="Room Image"/>
            <img v-else-if="createInventoryItemStore.item.imgUrl" :src="FILE_STORAGE_INTEGRATION_ROUTES.baseURL +
                 FILE_STORAGE_INTEGRATION_ROUTES.api +
                 FILE_STORAGE_INTEGRATION_ROUTES.items_images_bucket +
                 FILE_STORAGE_INTEGRATION_ROUTES.download + '/' + createInventoryItemStore.item.imgUrl"
                 class="avatar-img" alt="avatar"/>
            <div v-else class="avatar-img">
              <ion-icon :icon="add" class="placeholder-icon"></ion-icon>
            </div>
            <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none;"/>
          </div>
          <div class="stats">
            <div class="stat">
              {{ TEXTS.itemType.rus }} :
              <span class="stat-value" @click="openTypeSelect">
                {{ getAbbreviation(createInventoryItemStore.item?.typeName) }}
              </span>
              <ion-select
                  ref="typeSelectRef"
                  :value="createInventoryItemStore.item.typeName"
                  interface="action-sheet"
                  v-model="selectedType"
                  @ionChange="onTypeNameChange($event)"
                  style="display: none"
                  :class="{ 'invalid-field': invalidFields.includes('selectedType') }"
              >
                <ion-select-option :value="HEADERS.armor.rus">{{ HEADERS.armor.rus }}</ion-select-option>
                <ion-select-option :value="HEADERS.weapon.rus">{{ HEADERS.weapon.rus }}</ion-select-option>
                <ion-select-option :value="HEADERS.magic_items.rus">{{ HEADERS.magic_items.rus }}</ion-select-option>
                <ion-select-option :value="HEADERS.other.rus">{{ HEADERS.other.rus }}</ion-select-option>
              </ion-select>
            </div>
            <div class="stat"
                 v-if="createInventoryItemStore.item?.type && ['WEAPON', 'ARMOR'].includes(createInventoryItemStore.item?.type)">
              {{ createInventoryItemStore.item.type == 'ARMOR' ? TEXTS.armorType.rus : TEXTS.weaponType.rus }} :
              <span class="stat-value" @click="openSubtypeSelect">
                {{ getAbbreviation(createInventoryItemStore.item.subtypeName) }}
              </span>
              <ion-select
                  ref="subtypeSelectRef"
                  interface="action-sheet"
                  :value="selectedSubtype"
                  v-model="selectedSubtype"
                  style="display: none"
                  :class="{ 'invalid-field': invalidFields.includes('selectedSubtype') }"
              >
                <ion-select-option
                    v-for="option in getSubtypesByType(createInventoryItemStore.item.type)"
                    :key="option.value"
                    :value="option.label"
                >
                  {{ option.label }}
                </ion-select-option>
              </ion-select>
            </div>
            <div class="stat">
              {{ TEXTS.weight.rus }} :
              <span
                  class="stat-value"
                  contenteditable="true"
                  @focus="startEditing()"
                  @blur="saveField($event.target?.innerText)"
                  @input="updateFieldValue($event.target?.innerText)"
                  @keydown.enter.prevent="saveField($event.target?.innerText)"
                  :class="{ 'invalid-field': invalidFields.includes('weight') }"
              >{{ createInventoryItemStore.item?.stats?.weight }}</span>
            </div>
          </div>
        </div>
        <div class="stats-section armor" v-if="viewType==='ARMOR'">
          <div class="stat-section name">
            <div class="stat-section-name">{{ TEXTS.rus_armor_name.rus }}</div>
            <ion-input
                type="text"
                fill="outline"
                color="primary"
                v-model="createInventoryItemStore.item.name.rus"
                label-placement="floating"
                class="input-block"
                shape=""
                :class="{ 'invalid-field': invalidFields.includes('nameRus') }"
                @ionInput="invalidFields = invalidFields.filter(field => field !== 'nameRus')"
            />
          </div>
          <div class="stat-section name">
            <div class="stat-section-name">{{ TEXTS.eng_armor_name.rus }}</div>
            <ion-input
                type="text"
                fill="outline"
                color="primary"
                v-model="createInventoryItemStore.item.name.eng"
                label-placement="floating"
                class="input-block"
                shape=""
                :class="{ 'invalid-field': invalidFields.includes('nameEng') }"
                @ionInput="invalidFields = invalidFields.filter(field => field !== 'nameEng')"
            />
          </div>
          <div class="stat-section armory-class">
            <div class="stat-section-name">{{ HEADERS.armoryClass.rus }}</div>
            <ion-input
                type="number" inputmode="numeric"
                fill="outline"
                color="primary"
                v-model="createInventoryItemStore.item.stats.armorClass"
                label-placement="floating"
                class="input-block"
                shape=""
                :class="{ 'invalid-field': invalidFields.includes('armorClass') }"
                @ionInput="invalidFields = invalidFields.filter(field => field !== 'armorClass')"
            />
          </div>
          <div class="stat-section armor-class-max-dexterity-bonus">
            <div class="stat-section-name">{{ HEADERS.max_dex_bonus.rus }}</div>
            <ion-input
                type="number" inputmode="numeric"
                fill="outline"
                color="primary"
                v-model="createInventoryItemStore.item.stats.armorClassMaxDexterityBonus"
                label-placement="floating"
                class="input-block"
                shape=""
                :class="{ 'invalid-field': invalidFields.includes('armorClassMaxDexterityBonus') }"
                @ionInput="invalidFields = invalidFields.filter(field => field !== 'armorClassMaxDexterityBonus')"
            />
          </div>
          <div class="stat-section requirement">
            <div class="stat-section-name">{{ HEADERS.force_requirements.rus }}</div>
            <ion-input
                type="number" inputmode="numeric"
                fill="outline"
                color="primary"
                v-model="createInventoryItemStore.item.stats.requirement"
                label-placement="floating"
                class="input-block"
                shape=""
                :class="{ 'invalid-field': invalidFields.includes('requirement') }"
                @ionInput="invalidFields = invalidFields.filter(field => field !== 'requirement')"
            />
          </div>
          <div class="stat-section customization">
            <div class="stat-section-name">{{ HEADERS.need_customization.rus }}</div>
            <ion-toggle :checked="createInventoryItemStore.item?.customization" v-model="customization"></ion-toggle>
          </div>
          <div class="stat-section tags">
            <div class="stat-section-name">{{ HEADERS.tags.rus }}</div>
            <div class="tags-value">
              <ion-chip
                  v-for="(tag, idx) in createInventoryItemStore.item.stats.tags"
                  :key="idx"
                  @click="removeTag(tag)"
                  class="tag-chip"
              >
                {{ tag }}
                <ion-icon color="dark" :icon="close" class="tag-close-icon"></ion-icon>
              </ion-chip>
              <div class="tag-input-container">
                <ion-input
                    type="text"
                    v-model="newTag"
                    :placeholder="TEXTS.enterTag.rus"
                    class="tag-input"
                    @keydown.enter.prevent="addTag"
                    fill="outline"
                />
                <ion-button size="small" shape="round" @click="addTag">
                  <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
                </ion-button>
              </div>
            </div>
          </div>
          <div class="stat-section price">
            <div class="stat-section-name">{{ HEADERS.default_price.rus }}</div>
            <div class="price-value">
              <ion-input
                  type="number" inputmode="numeric"
                  fill="outline"
                  color="primary"
                  v-model="defaultPriceValue"
                  label-placement="floating"
                  class="input-block"
                  shape=""
                  :class="{ 'invalid-field': invalidFields.includes('defaultPriceValue') }"
                  @ionInput="invalidFields = invalidFields.filter(field => field !== 'defaultPriceValue')"
              >
                <ion-select value="GOLDEN" v-model="defaultPriceCoinType" slot="start" aria-label="Coin"
                            interface="action-sheet"
                            :class="{ 'invalid-field': invalidFields.includes('defaultPriceCoinType') }"
                            @ionChange="invalidFields = invalidFields.filter(field => field !== 'defaultPriceCoinType')"
                >
                  <ion-select-option value="GOLDEN">🪙</ion-select-option>
                  <ion-select-option value="SILVER">⚪</ion-select-option>
                  <ion-select-option value="COPPER">🟠</ion-select-option>
                </ion-select>
              </ion-input>
            </div>
          </div>
          <div class="stat-section rarity">
            <div class="stat-section-name">Редкость</div>
            <ion-select
                v-model="itemRarity"
                interface="action-sheet"
                :class="[`rarity-${itemRarity.toLowerCase()}`, { 'invalid-field': invalidFields.includes('itemRarity') }]"
            >
              <ion-select-option value="COMMON">Обычный</ion-select-option>
              <ion-select-option value="UNCOMMON">Необычный</ion-select-option>
              <ion-select-option value="RARE">Редкий</ion-select-option>
              <ion-select-option value="VERY_RARE">Очень редкий</ion-select-option>
              <ion-select-option value="LEGENDARY">Легендарный</ion-select-option>
            </ion-select>
          </div>
          <div class="stat-section description">
            <div class="stat-section-name">{{ HEADERS.description.rus }}</div>
            <div class="section">
              <ion-textarea
                  type="text"
                  fill="outline"
                  color="primary"
                  :clear-input="true"
                  v-model="createInventoryItemStore.item.description"
                  class="input-block"
                  :rows="15"
              ></ion-textarea>
            </div>
          </div>
        </div>
        <div class="stats-section weapon" v-else-if="viewType==='WEAPON'">
          <div class="stat-section name">
            <div class="stat-section-name">{{ TEXTS.rus_weapon_name.rus }}</div>
            <ion-input
                type="text"
                fill="outline"
                color="primary"
                v-model="createInventoryItemStore.item.name.rus"
                label-placement="floating"
                class="input-block"
                shape=""
                :class="{ 'invalid-field': invalidFields.includes('nameRus') }"
                @ionInput="invalidFields = invalidFields.filter(field => field !== 'nameRus')"
            />
          </div>
          <div class="stat-section name">
            <div class="stat-section-name">{{ TEXTS.eng_weapon_name.rus }}</div>
            <ion-input
                type="text"
                fill="outline"
                color="primary"
                v-model="createInventoryItemStore.item.name.eng"
                label-placement="floating"
                class="input-block"
                shape=""
                :class="{ 'invalid-field': invalidFields.includes('nameEng') }"
                @ionInput="invalidFields = invalidFields.filter(field => field !== 'nameEng')"
            />
          </div>
          <div class="stat-section damage">
            <div class="stat-section-name">{{ HEADERS.damage.rus }}</div>
            <ion-input
                type="text"
                fill="outline"
                color="primary"
                v-model="damageValue"
                label-placement="floating"
                class="input-block"
                placeholder="1d6 + 1"
                shape=""
                :class="{ 'invalid-field': invalidFields.includes('damageValue') }"
                @ionInput="invalidFields = invalidFields.filter(field => field !== 'damageValue')"
            />
          </div>
          <div class="stat-section damage-type">
            <div class="stat-section-name">{{ HEADERS.damageType.rus }}</div>
            <ion-select
                fill="outline"
                value="CRUSHING"
                v-model="damageType"
                slot="start"
                aria-label="Damage type"
                interface="action-sheet"
                :class="{ 'invalid-field': invalidFields.includes('damageType') }"
                @ionChange="invalidFields = invalidFields.filter(field => field !== 'damageType')"
            >
              <ion-select-option value="CRUSHING">Дробящий</ion-select-option>
              <ion-select-option value="STABBING">Колющий</ion-select-option>
              <ion-select-option value="CHOPPING">Рубящий</ion-select-option>
            </ion-select>
          </div>
          <div class="stat-section customization">
            <div class="stat-section-name">{{ HEADERS.need_customization.rus }}</div>
            <ion-toggle :checked="createInventoryItemStore.item?.customization" v-model="customization"></ion-toggle>
          </div>
          <div class="stat-section tags">
            <div class="stat-section-name">{{ HEADERS.tags.rus }}</div>
            <div class="tags-value">
              <ion-chip
                  v-for="(tag, idx) in createInventoryItemStore.item.stats.tags"
                  :key="idx"
                  @click="removeTag(tag)"
                  class="tag-chip"
              >
                {{ tag }}
                <ion-icon color="dark" :icon="close" class="tag-close-icon"></ion-icon>
              </ion-chip>
              <div class="tag-input-container">
                <ion-input
                    type="text"
                    v-model="newTag"
                    :placeholder="TEXTS.enterTag.rus"
                    class="tag-input"
                    @keydown.enter.prevent="addTag"
                    fill="outline"
                />
                <ion-button size="small" shape="round" @click="addTag">
                  <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
                </ion-button>
              </div>
            </div>
          </div>
          <div class="stat-section price">
            <div class="stat-section-name">{{ HEADERS.default_price.rus }}</div>
            <div class="price-value">
              <ion-input
                  type="number" inputmode="numeric"
                  fill="outline"
                  color="primary"
                  v-model="defaultPriceValue"
                  label-placement="floating"
                  class="input-block"
                  shape=""
                  :class="{ 'invalid-field': invalidFields.includes('defaultPriceValue') }"
                  @ionInput="invalidFields = invalidFields.filter(field => field !== 'defaultPriceValue')"
              >
                <ion-select
                    value="GOLDEN"
                    v-model="defaultPriceCoinType"
                    slot="start"
                    aria-label="Coin"
                    interface="action-sheet"
                    :class="{ 'invalid-field': invalidFields.includes('defaultPriceCoinType') }"
                    @ionChange="invalidFields = invalidFields.filter(field => field !== 'defaultPriceCoinType')"
                >
                  <ion-select-option value="GOLDEN">🪙</ion-select-option>
                  <ion-select-option value="SILVER">⚪</ion-select-option>
                  <ion-select-option value="COPPER">🟠</ion-select-option>
                </ion-select>
              </ion-input>
            </div>
          </div>
          <div class="stat-section rarity">
            <div class="stat-section-name">Редкость</div>
            <ion-select
                v-model="itemRarity"
                interface="action-sheet"
                :class="[`rarity-${itemRarity.toLowerCase()}`, { 'invalid-field': invalidFields.includes('itemRarity') }]"
            >
              <ion-select-option value="COMMON">Обычный</ion-select-option>
              <ion-select-option value="UNCOMMON">Необычный</ion-select-option>
              <ion-select-option value="RARE">Редкий</ion-select-option>
              <ion-select-option value="VERY_RARE">Очень редкий</ion-select-option>
              <ion-select-option value="LEGENDARY">Легендарный</ion-select-option>
            </ion-select>
          </div>
          <div class="stat-section description">
            <div class="stat-section-name">{{ HEADERS.description.rus }}</div>
            <div class="section">
              <ion-textarea
                  type="text"
                  fill="outline"
                  color="primary"
                  :clear-input="true"
                  v-model="createInventoryItemStore.item.description"
                  class="input-block"
                  :rows="15"
              ></ion-textarea>
            </div>
          </div>
        </div>
        <div class="stats-section other" v-else>
          <div class="stat-section name">
            <div class="stat-section-name">{{ TEXTS.rus_other_name.rus }}</div>
            <ion-input
                type="text"
                fill="outline"
                color="primary"
                v-model="createInventoryItemStore.item.name.rus"
                label-placement="floating"
                class="input-block"
                shape=""
                :class="{ 'invalid-field': invalidFields.includes('nameRus') }"
                @ionInput="invalidFields = invalidFields.filter(field => field !== 'nameRus')"
            />
          </div>
          <div class="stat-section name">
            <div class="stat-section-name">{{ TEXTS.eng_other_name.rus }}</div>
            <ion-input
                type="text"
                fill="outline"
                color="primary"
                v-model="createInventoryItemStore.item.name.eng"
                label-placement="floating"
                class="input-block"
                shape=""
                :class="{ 'invalid-field': invalidFields.includes('nameEng') }"
                @ionInput="invalidFields = invalidFields.filter(field => field !== 'nameEng')"
            />
          </div>
          <div class="stat-section customization">
            <div class="stat-section-name">{{ HEADERS.need_customization.rus }}</div>
            <ion-toggle :checked="createInventoryItemStore.item?.customization" v-model="customization"></ion-toggle>
          </div>
          <div class="stat-section tags">
            <div class="stat-section-name">{{ HEADERS.tags.rus }}</div>
            <div class="tags-value">
              <ion-chip
                  v-for="(tag, idx) in createInventoryItemStore.item.stats.tags"
                  :key="idx"
                  @click="removeTag(tag)"
                  class="tag-chip"
              >
                {{ tag }}
                <ion-icon color="dark" :icon="close" class="tag-close-icon"></ion-icon>
              </ion-chip>
              <div class="tag-input-container">
                <ion-input
                    type="text"
                    v-model="newTag"
                    :placeholder="TEXTS.enterTag.rus"
                    class="tag-input"
                    @keydown.enter.prevent="addTag"
                    fill="outline"
                />
                <ion-button size="small" shape="round" @click="addTag">
                  <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
                </ion-button>
              </div>
            </div>
          </div>
          <div class="stat-section price">
            <div class="stat-section-name">{{ HEADERS.default_price.rus }}</div>
            <div class="price-value">
              <ion-input
                  type="number" inputmode="numeric"
                  fill="outline"
                  color="primary"
                  v-model="defaultPriceValue"
                  label-placement="floating"
                  class="input-block"
                  shape=""
                  :class="{ 'invalid-field': invalidFields.includes('defaultPriceValue') }"
                  @ionInput="invalidFields = invalidFields.filter(field => field !== 'defaultPriceValue')"
              >
                <ion-select
                    value="GOLDEN"
                    v-model="defaultPriceCoinType"
                    slot="start"
                    aria-label="Coin"
                    interface="action-sheet"
                    :class="{ 'invalid-field': invalidFields.includes('defaultPriceCoinType') }"
                    @ionChange="invalidFields = invalidFields.filter(field => field !== 'defaultPriceCoinType')"
                >
                  <ion-select-option value="GOLDEN">🪙</ion-select-option>
                  <ion-select-option value="SILVER">⚪</ion-select-option>
                  <ion-select-option value="COPPER">🟠</ion-select-option>
                </ion-select>
              </ion-input>
            </div>
          </div>
          <div class="stat-section rarity">
            <div class="stat-section-name">Редкость</div>
            <ion-select
                v-model="itemRarity"
                interface="action-sheet"
                :class="[`rarity-${itemRarity.toLowerCase()}`, { 'invalid-field': invalidFields.includes('itemRarity') }]"
            >
              <ion-select-option value="COMMON">Обычный</ion-select-option>
              <ion-select-option value="UNCOMMON">Необычный</ion-select-option>
              <ion-select-option value="RARE">Редкий</ion-select-option>
              <ion-select-option value="VERY_RARE">Очень редкий</ion-select-option>
              <ion-select-option value="LEGENDARY">Легендарный</ion-select-option>
            </ion-select>
          </div>
          <div class="stat-section description">
            <div class="stat-section-name">{{ HEADERS.description.rus }}</div>
            <div class="section">
              <ion-textarea
                  type="text"
                  fill="outline"
                  color="primary"
                  :clear-input="true"
                  v-model="createInventoryItemStore.item.description"
                  class="input-block"
                  :rows="15"
              ></ion-textarea>
            </div>
          </div>
        </div>
      </div>
      <div class="settings">
        <div class="settings-gm-access">
          <div class="settings-section-name">{{ HEADERS.gm_access.rus }}</div>
          <ion-toggle class="settings-section-value" v-model="visibleForPlayers" :checked="true"></ion-toggle>
        </div>
      </div>
      <ion-buttons class="buttons-block">
        <ion-button color="primary" fill="solid" shape="round">
          <ion-icon slot="start" :icon="closeCircleOutline"></ion-icon>
          Отменить
        </ion-button>
        <ion-button color="primary" fill="solid" shape="round" @click="saveItem()">
          <ion-icon slot="start" :icon="saveOutline"></ion-icon>
          Сохранить
        </ion-button>
      </ion-buttons>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.container {
  background: var(--ion-color-dark);
}

.header {
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: start;
  gap: 20px;
}

.avatar {
  border-radius: 25px;
  overflow: hidden;
  border-width: 2px;
  border-style: solid;
}

.avatar-img {
  width: 180px;
  height: 180px;
  border-radius: 25px;
  align-content: center;
  justify-content: center;
  display: flex;
}

.placeholder-icon {
  align-self: center;
  justify-self: center;
  font-size: 48px;
  color: white;
}

.stats {
  border-radius: 25px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  background-color: var(--ion-color-medium);
  width: 180px;
  height: 180px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--ion-color-secondary-opacity-40);
  margin-bottom: 3%;
  height: 23%;
  border-radius: 15px;
  padding-left: 5%;
  padding-right: 5%;
  margin-right: 5%;
  margin-left: 5%;
  font-weight: bold;
  font-size: 10pt;
}

.stat-value {
  display: flex;
  background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-radius: 50%;
  height: 30px;
  width: 30px;
  align-items: center;
  justify-content: center;
  font-size: 10pt;
}

.stat-section {
  margin-top: 12px;
  font-size: 16px;
}

.customization {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.tags-value {
  display: flex;
  justify-content: start;
  align-items: center;
}

.tags-value {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tag-chip {
  cursor: pointer;
  background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  padding: 4px 8px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tag-close-icon {
  font-size: 14px;
}

.tag-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-input {
  max-width: 150px;
  --padding-start: 8px;
  --padding-end: 8px;
}

.section {
  overflow: hidden;
  transition: max-height 4s ease;
}

.buttons-block {
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.rarity-common {
  border: 2px solid gray;
}

.rarity-uncommon {
  border: 2px solid green;
}

.rarity-rare {
  border: 2px solid blue;
}

.rarity-very_rare {
  border: 2px solid purple;
}

.rarity-legendary {
  border: 2px solid orange;
}

.stat-section.rarity ion-select {
  width: 100%;
  --border-radius: 8px;
  --padding-start: 12px;
  --padding-end: 12px;
}

.settings {
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  justify-content: end;
}

.settings-gm-access {
  display: flex;
  flex-direction: column;
  justify-content: end;
}

.settings-section-value {
  margin-top: 10px;
  justify-items: end;
}

.invalid-field {
  --border-color: red !important;
  --border-width: 2px !important;
}

.stat-value.invalid-field {
  border: 2px solid red;
}
</style>