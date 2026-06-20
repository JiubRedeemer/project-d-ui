import { onUnmounted, ref } from 'vue';
import { Motion, type PluginListenerHandle } from '@capacitor/motion';

const MAX_TILT = 32;
const SMOOTHING = 0.14;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function needsMotionPermission(): boolean {
  return typeof DeviceMotionEvent !== 'undefined'
    && typeof (DeviceMotionEvent as DeviceMotionEvent & { requestPermission?: () => Promise<string> }).requestPermission === 'function';
}

async function requestMotionPermission(): Promise<boolean> {
  if (!needsMotionPermission()) {
    return true;
  }

  const result = await (DeviceMotionEvent as DeviceMotionEvent & { requestPermission: () => Promise<string> }).requestPermission();
  return result === 'granted';
}

export function useDeviceTilt() {
  const tiltX = ref(0);
  const tiltY = ref(0);
  const isActive = ref(false);

  let handles: PluginListenerHandle[] = [];
  let rafId = 0;
  let targetX = 0;
  let targetY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let started = false;

  const tick = () => {
    smoothX += (targetX - smoothX) * SMOOTHING;
    smoothY += (targetY - smoothY) * SMOOTHING;
    tiltX.value = smoothX;
    tiltY.value = smoothY;
    rafId = requestAnimationFrame(tick);
  };

  const stop = async () => {
    cancelAnimationFrame(rafId);
    await Promise.all(handles.map((handle) => handle.remove()));
    handles = [];
    started = false;
    isActive.value = false;
    targetX = 0;
    targetY = 0;
    smoothX = 0;
    smoothY = 0;
    tiltX.value = 0;
    tiltY.value = 0;
  };

  const start = async (): Promise<boolean> => {
    if (started) {
      return isActive.value;
    }

    started = true;

    const granted = await requestMotionPermission();
    if (!granted) {
      started = false;
      return false;
    }

    const accelHandle = await Motion.addListener('accel', (event) => {
      const gravity = event.accelerationIncludingGravity;
      if (!gravity) {
        return;
      }

      targetX = clamp(Math.atan2(gravity.x, gravity.z) * (180 / Math.PI), -MAX_TILT, MAX_TILT);
      targetY = clamp(Math.atan2(gravity.y, gravity.z) * (180 / Math.PI), -MAX_TILT, MAX_TILT);
    });

    handles.push(accelHandle);
    isActive.value = true;
    rafId = requestAnimationFrame(tick);
    return true;
  };

  onUnmounted(() => {
    void stop();
  });

  return {
    tiltX,
    tiltY,
    isActive,
    start,
    stop,
  };
}
