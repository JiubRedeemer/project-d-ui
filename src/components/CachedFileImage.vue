<script setup lang="ts">
import { useAttrs } from "vue";
import { useRevalidatedFileImageSrc } from "@/composables/useRevalidatedFileImageSrc";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  src: string;
}>();

const attrs = useAttrs();
const { displaySrc } = useRevalidatedFileImageSrc(() => props.src);
</script>

<template>
  <img v-bind="attrs" :src="displaySrc" />
</template>
