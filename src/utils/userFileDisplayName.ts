/** Length of `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` */
const UUID_LEN = 36;

const UUID_AT_START = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Human-readable filename for stored user-file object names from MinIO/DB.
 * Handles:
 * - `uuid_original name.pdf` (no separator between uuid and name)
 * - `uuid_original_name.pdf`
 * - legacy arbitrary prefix before first `_`
 */
export function displayStoredUserFilename(storedFilename: string): string {
  const raw = storedFilename.trim();
  if (!raw) return raw;

  if (raw.length >= UUID_LEN) {
    const head = raw.slice(0, UUID_LEN);
    if (UUID_AT_START.test(head)) {
      let rest = raw.slice(UUID_LEN);
      if (rest.startsWith("_")) {
        rest = rest.slice(1);
      }
      const out = rest.trim();
      if (out.length > 0) return out;
      return raw;
    }
  }

  const underscoreIndex = raw.indexOf("_");
  if (underscoreIndex !== -1) {
    const rest = raw.slice(underscoreIndex + 1).trim();
    if (rest.length > 0) return rest;
  }

  return raw;
}
