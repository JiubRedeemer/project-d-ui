import { computed, nextTick, onUnmounted, ref, watch, type Ref } from "vue";

const MIN_PX = 10;
const MAX_PX = 16;
const LINE_HEIGHT = 1.2;
const MAX_LINES = 2;

/**
 * Подбирает font-size так, чтобы имя влезало в ширину контейнера и не более MAX_LINES строк.
 *
 * Важно: во время перебора нужно выставлять и fontSize, и maxHeight под текущий fs.
 * Иначе :style с maxHeight от *предыдущего* fontSizePx обрезает текст по высоте, измерения
 * scrollWidth/scrollHeight ломаются и остаётся слишком крупный шрифт → горизонтальный клип.
 */
export function useFittedNameFont(
  nameElRef: Ref<HTMLElement | null>,
  headerContentRef: Ref<HTMLElement | null>,
  getName: () => string | undefined
) {
  const fontSizePx = ref(MAX_PX);

  const maxHeightPx = computed(() => fontSizePx.value * LINE_HEIGHT * MAX_LINES);

  let ro: ResizeObserver | null = null;

  function fit() {
    const el = nameElRef.value;
    const wrap = headerContentRef.value;
    if (!el || !wrap) return;

    void el.offsetWidth;
    const maxW = Math.min(wrap.clientWidth, el.clientWidth || wrap.clientWidth);
    if (maxW < 8) return;

    let chosen = MIN_PX;
    for (let fs = MAX_PX; fs >= MIN_PX; fs -= 0.5) {
      const maxH = fs * LINE_HEIGHT * MAX_LINES;
      /* Перебиваем то, что могло остаться от Vue :style от прошлого кадра */
      el.style.setProperty("font-size", `${fs}px`, "important");
      el.style.setProperty("max-height", `${maxH}px`, "important");
      el.style.setProperty("overflow", "visible", "important");
      void el.offsetHeight;

      const okW = el.scrollWidth <= maxW + 1;
      const okH = el.scrollHeight <= maxH + 1;
      if (okW && okH) {
        chosen = fs;
        break;
      }
    }

    fontSizePx.value = chosen;
    el.style.removeProperty("font-size");
    el.style.removeProperty("max-height");
    el.style.removeProperty("overflow");
  }

  function scheduleFit() {
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => fit());
      });
    });
  }

  watch(getName, scheduleFit);

  watch(
    () => headerContentRef.value,
    (el) => {
      ro?.disconnect();
      ro = null;
      if (!el) return;
      ro = new ResizeObserver(() => scheduleFit());
      ro.observe(el);
      scheduleFit();
    },
    { immediate: true }
  );

  onUnmounted(() => {
    ro?.disconnect();
    ro = null;
  });

  return { fontSizePx, maxHeightPx, scheduleFit };
}
