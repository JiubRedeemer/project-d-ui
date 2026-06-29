import { ref } from 'vue';
import axios from 'axios';
import {
    countMutations,
    enqueueMutation,
    getAllMutations,
    removeMutation,
} from '@/utils/offlineQueue';

export const pendingMutationCount = ref(0);
export const isOnline = ref(navigator.onLine);

// Emitted after the queue is flushed so active views can re-fetch stale data.
export const QUEUE_FLUSHED_EVENT = 'projectd:queue-flushed';

let initialized = false;

async function refreshCount(): Promise<void> {
    pendingMutationCount.value = await countMutations();
}

async function flushQueue(): Promise<void> {
    const items = await getAllMutations();
    if (items.length === 0) {
        // Счётчик мог разойтись с реальностью — синхронизируем
        pendingMutationCount.value = 0;
        return;
    }

    let flushedAny = false;
    for (const item of items) {
        try {
            await axios.request({
                method: item.method,
                url: item.url,
                data: item.data,
                headers: item.headers,
                // Запросы из флаша не должны попадать обратно в очередь
                _offlineQueued: true,
            } as Parameters<typeof axios.request>[0] & { _offlineQueued: boolean });
            await removeMutation(item.id);
            pendingMutationCount.value = Math.max(0, pendingMutationCount.value - 1);
            flushedAny = true;
        } catch (e: unknown) {
            const err = e as { response?: { status?: number } };
            if (!err.response) {
                // Всё ещё нет сети — останавливаемся, не трогаем очередь
                break;
            }
            // 4xx/5xx — сервер не принял, дропаем чтобы не повторять бесконечно
            console.warn('[OfflineQueue] Dropping failed mutation:', item.url, err.response?.status);
            await removeMutation(item.id);
            pendingMutationCount.value = Math.max(0, pendingMutationCount.value - 1);
            flushedAny = true;
        }
    }

    // Синхронизируем счётчик с реальным состоянием IndexedDB
    pendingMutationCount.value = await countMutations();

    if (flushedAny) {
        window.dispatchEvent(new CustomEvent(QUEUE_FLUSHED_EVENT));
    }
}

/**
 * Call once in main.ts. Sets up global online/offline listeners and the axios
 * response interceptor that queues failed mutations.
 */
export async function initOfflineSync(): Promise<void> {
    if (initialized) return;
    initialized = true;

    isOnline.value = navigator.onLine;
    await refreshCount();

    // Если при старте приложения есть очередь и есть сеть — сразу флашим
    if (navigator.onLine && pendingMutationCount.value > 0) {
        flushQueue();
    }

    window.addEventListener('online', async () => {
        isOnline.value = true;
        await flushQueue();
    });

    window.addEventListener('offline', () => {
        isOnline.value = false;
        // Синхронизируем счётчик — не даём показывать "Синхронизация" вместо "Нет сети"
        refreshCount();
    });

    // Intercept failed non-GET requests and queue them for later retry.
    axios.interceptors.response.use(
        (response) => response,
        async (error: unknown) => {
            const err = error as {
                response?: unknown;
                config?: {
                    method?: string;
                    url?: string;
                    data?: string;
                    headers?: Record<string, string>;
                    _offlineQueued?: boolean;
                };
            };
            const config = err.config;

            if (
                !err.response &&
                config &&
                config.method &&
                config.method.toUpperCase() !== 'GET' &&
                !config._offlineQueued
            ) {
                config._offlineQueued = true;
                try {
                    await enqueueMutation({
                        method: config.method.toUpperCase(),
                        url: config.url ?? '',
                        data: config.data ? JSON.parse(config.data) : undefined,
                        headers: {
                            Authorization: config.headers?.['Authorization'] ?? '',
                            'Content-Type': config.headers?.['Content-Type'] ?? 'application/json',
                        },
                    });
                    pendingMutationCount.value++;
                } catch (queueErr) {
                    console.error('[OfflineQueue] Failed to enqueue mutation:', queueErr);
                }
            }

            return Promise.reject(error);
        }
    );
}
