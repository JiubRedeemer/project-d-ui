<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import RulebookBundleRaceEditorView from "@/views/profile/bundleEditors/RulebookBundleRaceEditorView.vue";
import RulebookBundleClassEditorView from "@/views/profile/bundleEditors/RulebookBundleClassEditorView.vue";
import RulebookBundleBackgroundEditorView from "@/views/profile/bundleEditors/RulebookBundleBackgroundEditorView.vue";

const route = useRoute();
const category = computed(() => String(route.params.category));
</script>

<template>
  <RulebookBundleClassEditorView v-if="category === 'CLAZZ'" :key="`clazz-${route.fullPath}`" />
  <RulebookBundleBackgroundEditorView v-else-if="category === 'BACKGROUND'" :key="`bg-${route.fullPath}`" />
  <RulebookBundleRaceEditorView v-else :key="`race-${route.fullPath}`" />
</template>
