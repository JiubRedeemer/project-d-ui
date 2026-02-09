import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useIonRouter } from '@ionic/vue';

const DESKTOP_PREFIX = '/desktop';

/**
 * Composable for navigation that respects desktop vs mobile context.
 * When on a /desktop route, navigate/replace paths are prefixed with /desktop.
 */
export function useAppRouter() {
  const route = useRoute();
  const ionRouter = useIonRouter();

  const isDesktop = computed(() => route.path.startsWith(DESKTOP_PREFIX));

  /**
   * Returns the path with /desktop prefix when in desktop context.
   * @param path - Path without leading slash or with leading slash (e.g. 'rooms' or '/rooms')
   */
  function appPath(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return isDesktop.value ? `${DESKTOP_PREFIX}${normalized}` : normalized;
  }

  function navigate(path: string, direction?: 'forward' | 'back', animation?: 'push' | 'replace') {
    ionRouter.navigate(appPath(path), direction, animation);
  }

  function replace(path: string) {
    ionRouter.replace(appPath(path));
  }

  return { navigate, replace, appPath, isDesktop, ionRouter };
}
