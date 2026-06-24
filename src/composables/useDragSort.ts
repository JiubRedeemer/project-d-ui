import { computed, ref, reactive } from 'vue';

let instanceCounter = 0;

export interface DragSortInstance<T> {
  listId: string;
  ordered: T[];
  dragFromIndex: number;
  dragOverIndex: number;
  onHandlePointerDown(e: PointerEvent, index: number): void;
  onHandlePointerMove(e: PointerEvent): void;
  onHandlePointerUp(e: PointerEvent): void;
  onHandlePointerCancel(e: PointerEvent): void;
  onCardPointerDown(e: PointerEvent, index: number): void;
  onCardPointerMove(e: PointerEvent): void;
  onCardPointerUp(e: PointerEvent): void;
  onCardPointerCancel(e: PointerEvent): void;
}

export function useDragSort<T>(config: {
  key: string;
  source: () => T[];
  getKey: (item: T) => string;
  onCommit?: (ordered: T[]) => void;
}): DragSortInstance<T> {
  const listId = `dl-${++instanceCounter}`;
  const orderVersion = ref(0);

  function loadOrder(): string[] {
    try { return JSON.parse(localStorage.getItem(config.key) ?? '[]'); }
    catch { return []; }
  }

  function saveOrder(keys: string[]) {
    localStorage.setItem(config.key, JSON.stringify(keys));
    orderVersion.value++;
  }

  const ordered = computed<T[]>(() => {
    void orderVersion.value;
    const items = config.source();
    if (!items?.length) return [];
    const saved = loadOrder();
    if (!saved.length) return items;
    const map = new Map(items.map(t => [config.getKey(t), t]));
    const out: T[] = [];
    for (const k of saved) { const t = map.get(k); if (t) { out.push(t); map.delete(k); } }
    for (const t of map.values()) out.push(t);
    return out;
  });

  function commitReorder(from: number, to: number) {
    if (from === to) return;
    const list = [...ordered.value];
    list.splice(to, 0, list.splice(from, 1)[0]);
    saveOrder(list.map(t => config.getKey(t)));
    config.onCommit?.(list);
  }

  // ── Drag internals ────────────────────────────────────────────────────────

  const dragFromIndex = ref(-1);
  const dragOverIndex = ref(-1);
  let isDragging = false;
  let ghostEl: HTMLElement | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let activePointerId = -1;
  let ghostOffsetY = 0;
  let startX = 0;
  let startY = 0;
  let moveCancelled = false;
  let pendingCard: HTMLElement | null = null;
  let pendingPointerId = -1;

  function createGhost(card: HTMLElement, clientY: number) {
    const rect = card.getBoundingClientRect();
    ghostOffsetY = clientY - rect.top;
    ghostEl = card.cloneNode(true) as HTMLElement;
    ghostEl.style.cssText = `
      position:fixed;left:${rect.left}px;top:${clientY - ghostOffsetY}px;
      width:${rect.width}px;z-index:9999;pointer-events:none;
      border-radius:16px;box-shadow:0 24px 48px rgba(0,0,0,.55);
      opacity:.92;transform:scale(1.03);transition:none;`;
    document.body.appendChild(ghostEl);
  }

  function moveGhost(clientY: number) {
    if (ghostEl) ghostEl.style.top = `${clientY - ghostOffsetY}px`;
  }

  function removeGhost() {
    ghostEl?.remove();
    ghostEl = null;
  }

  function findCardAtPoint(x: number, y: number): number {
    if (ghostEl) ghostEl.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    if (ghostEl) ghostEl.style.display = '';
    const card = el?.closest(`[data-drag-list="${listId}"]`) as HTMLElement | null;
    if (!card) return dragOverIndex.value;
    return Number(card.dataset.dragIndex);
  }

  function beginDrag(index: number, card: HTMLElement, clientY: number) {
    isDragging = true;
    dragFromIndex.value = index;
    dragOverIndex.value = index;
    // Pointer is already captured (either by handle or card path); clear pending refs
    // so releasePendingCapture in up/cancel doesn't interfere with the active drag.
    pendingCard = null;
    pendingPointerId = -1;
    createGhost(card, clientY);
    navigator.vibrate?.(40);
  }

  function cancelTimer() {
    if (longPressTimer !== null) { clearTimeout(longPressTimer); longPressTimer = null; }
  }

  function endDrag() {
    if (isDragging && dragFromIndex.value !== dragOverIndex.value) {
      commitReorder(dragFromIndex.value, dragOverIndex.value);
    }
    isDragging = false;
    dragFromIndex.value = -1;
    dragOverIndex.value = -1;
    activePointerId = -1;
    moveCancelled = false;
    removeGhost();
  }

  function abortDrag() {
    isDragging = false;
    dragFromIndex.value = -1;
    dragOverIndex.value = -1;
    activePointerId = -1;
    moveCancelled = false;
    removeGhost();
  }

  // ── Handle-mode handlers (attach to ≡ icon element) ──────────────────────

  function onHandlePointerDown(e: PointerEvent, index: number) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const handle = e.currentTarget as HTMLElement;
    const card = (handle.closest(`[data-drag-list="${listId}"]`) ?? handle) as HTMLElement;
    const delay = e.pointerType === 'touch' ? 350 : 0;
    cancelTimer();
    longPressTimer = setTimeout(() => {
      activePointerId = e.pointerId;
      try { handle.setPointerCapture(e.pointerId); } catch {}
      beginDrag(index, card, e.clientY);
    }, delay);
  }

  function onHandlePointerMove(e: PointerEvent) {
    if (!isDragging || e.pointerId !== activePointerId) return;
    e.preventDefault();
    moveGhost(e.clientY);
    const idx = findCardAtPoint(e.clientX, e.clientY);
    if (idx >= 0) dragOverIndex.value = idx;
  }

  function onHandlePointerUp(e: PointerEvent) {
    cancelTimer();
    if (!isDragging || e.pointerId !== activePointerId) return;
    endDrag();
  }

  function onHandlePointerCancel(e: PointerEvent) {
    cancelTimer();
    if (e.pointerId !== activePointerId) return;
    abortDrag();
  }

  // ── Card-mode handlers (long press on whole card, no handle icon) ─────────

  function releasePendingCapture() {
    if (pendingCard && pendingPointerId >= 0) {
      try { pendingCard.releasePointerCapture(pendingPointerId); } catch {}
      pendingCard.style.touchAction = '';
    }
    pendingCard = null;
    pendingPointerId = -1;
  }

  function onCardPointerDown(e: PointerEvent, index: number) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('button, ion-button, input, select, a, [role="button"]')) return;
    startX = e.clientX;
    startY = e.clientY;
    moveCancelled = false;
    const card = e.currentTarget as HTMLElement;
    cancelTimer();

    // Capture pointer and block native scroll immediately so the browser
    // doesn't steal the gesture before the long-press timer fires.
    pendingCard = card;
    pendingPointerId = e.pointerId;
    card.style.touchAction = 'none';
    try { card.setPointerCapture(e.pointerId); } catch {}

    longPressTimer = setTimeout(() => {
      if (moveCancelled) return;
      activePointerId = e.pointerId;
      beginDrag(index, card, e.clientY);
    }, e.pointerType === 'touch' ? 70 : 40);
  }

  function onCardPointerMove(e: PointerEvent) {
    if (!isDragging) {
      if (longPressTimer !== null) {
        if (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) {
          cancelTimer();
          moveCancelled = true;
          // Release capture so the browser can resume normal scroll.
          releasePendingCapture();
        }
      }
      return;
    }
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();
    moveGhost(e.clientY);
    const idx = findCardAtPoint(e.clientX, e.clientY);
    if (idx >= 0) dragOverIndex.value = idx;
  }

  function onCardPointerUp(e: PointerEvent) {
    cancelTimer();
    releasePendingCapture();
    moveCancelled = false;
    if (!isDragging || e.pointerId !== activePointerId) return;
    endDrag();
  }

  function onCardPointerCancel(e: PointerEvent) {
    cancelTimer();
    releasePendingCapture();
    moveCancelled = false;
    if (e.pointerId !== activePointerId) return;
    abortDrag();
  }

  return reactive({
    listId,
    ordered,
    dragFromIndex,
    dragOverIndex,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
    onHandlePointerCancel,
    onCardPointerDown,
    onCardPointerMove,
    onCardPointerUp,
    onCardPointerCancel,
  }) as unknown as DragSortInstance<T>;
}
