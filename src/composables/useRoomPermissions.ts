import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRoomPermissionsStore } from "@/stores/RoomPermissionsStore";

export function useRoomPermissions(roomId: string) {
  const store = useRoomPermissionsStore();
  const { loadingByRoom } = storeToRefs(store);

  const roles = computed(() => store.getRoles(roomId));
  const permissions = computed(() => store.getPermissions(roomId));
  const isLoading = computed(() => Boolean(loadingByRoom.value[roomId]));

  return {
    roles,
    permissions,
    isLoading,
    loadRoles: (force = false) => store.fetchRoles(roomId, force),
  };
}
