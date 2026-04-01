import { FILES_RUNTIME_CACHE_NAME } from "@/config/fileCache";
import { onUnmounted, ref, watch, type MaybeRefOrGetter, toValue } from "vue";

/**
 * URL файлового хранилища (`/files/.../download/...`), для которых нужен cache-first + подмена при обновлении с сервера.
 */
export function isFileStorageDownloadUrl(url: string): boolean {
  if (!url || url.startsWith("data:")) return false;
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/files/") && u.pathname.includes("/download/");
  } catch {
    return false;
  }
}

async function blobsEqual(a: Blob, b: Blob): Promise<boolean> {
  if (a.size !== b.size) return false;
  const ab = await a.arrayBuffer();
  const bb = await b.arrayBuffer();
  if (ab.byteLength !== bb.byteLength) return false;
  const u8a = new Uint8Array(ab);
  const u8b = new Uint8Array(bb);
  for (let i = 0; i < u8a.length; i++) {
    if (u8a[i] !== u8b[i]) return false;
  }
  return true;
}

function bustUrl(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}__swrb=${Date.now()}`;
}

/**
 * Сначала показываем ответ из Cache API (тот же `files-cache`, что и у Workbox), затем
 * запрашиваем сеть с cache-bust (отдельный ключ кэша SW — получаем «свежее» тело для сравнения).
 * Если тело отличается — подменяем изображение и обновляем запись в кэше по каноническому URL.
 */
export function useRevalidatedFileImageSrc(src: MaybeRefOrGetter<string | undefined | null>) {
  const displaySrc = ref("");
  let revoke: (() => void) | undefined;
  let seq = 0;

  function clearRevoke() {
    revoke?.();
    revoke = undefined;
  }

  watch(
    () => toValue(src),
    (raw) => {
      const u = raw?.trim() ?? "";
      const my = ++seq;

      clearRevoke();

      if (!u) {
        displaySrc.value = "";
        return;
      }

      if (typeof caches === "undefined" || !isFileStorageDownloadUrl(u)) {
        displaySrc.value = u;
        return;
      }

      (async () => {
        try {
          const cache = await caches.open(FILES_RUNTIME_CACHE_NAME);
          const cached = await cache.match(u);
          if (my !== seq) return;

          if (cached?.ok) {
            const blob = await cached.blob();
            const blobUrl = URL.createObjectURL(blob);
            revoke = () => URL.revokeObjectURL(blobUrl);
            displaySrc.value = blobUrl;
          } else {
            displaySrc.value = u;
          }

          const bust = bustUrl(u);
          const netResp = await fetch(bust);
          if (my !== seq) return;
          if (!netResp.ok || netResp.type === "opaque") return;

          const netBlob = await netResp.clone().blob();

          try {
            await cache.delete(new Request(bust));
          } catch {
            /* ignore */
          }

          const cachedAgain = await cache.match(u);
          const oldBlob = cachedAgain?.ok ? await cachedAgain.blob() : null;

          if (!oldBlob) {
            await cache.put(
              u,
              new Response(netBlob, {
                headers: netResp.headers,
              })
            );
            return;
          }

          if (await blobsEqual(oldBlob, netBlob)) {
            return;
          }

          const nextUrl = URL.createObjectURL(netBlob);
          clearRevoke();
          revoke = () => URL.revokeObjectURL(nextUrl);
          displaySrc.value = nextUrl;

          await cache.put(
            u,
            new Response(netBlob, {
              headers: netResp.headers,
            })
          );
        } catch {
          if (my !== seq) return;
          displaySrc.value = u;
        }
      })();
    },
    { immediate: true }
  );

  onUnmounted(() => {
    clearRevoke();
  });

  return { displaySrc };
}
