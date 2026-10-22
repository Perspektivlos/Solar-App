import { useState, useEffect, useCallback } from 'react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';
export type DeviceOverride = 'auto' | 'desktop' | 'tablet' | 'mobile';

export interface DeviceInfo {
  // Resolved active device type (considering override)
  deviceType: DeviceType;
  // Raw automatically detected device type
  detectedType: DeviceType;
  // Current override mode
  override: DeviceOverride;
  // Device specifics
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  isTouch: boolean;
  pointerType: 'fine' | 'coarse' | 'none';
  touchPoints: number;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
  isStandalone: boolean; // PWA installed or running as standalone app
  isBackground: boolean; // Document currently hidden or in background
  wakeLockActive: boolean;
  wakeLockSupported: boolean;
  userAgent: string;
  hardwareSummary: string;
}

export function useDeviceDetection() {
  const [override, setOverrideState] = useState<DeviceOverride>(() => {
    try {
      const saved = localStorage.getItem('solar_device_override');
      if (saved && ['auto', 'desktop', 'tablet', 'mobile'].includes(saved)) {
        return saved as DeviceOverride;
      }
    } catch {
      // ignore localStorage errors
    }
    return 'auto';
  });

  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSentinel, setWakeLockSentinel] = useState<any>(null);
  const [isBackground, setIsBackground] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  );

  // Helper to compute detection
  const computeDetection = useCallback((): Omit<DeviceInfo, 'deviceType' | 'isDesktop' | 'isTablet' | 'isMobile' | 'override' | 'wakeLockActive'> => {
    if (typeof window === 'undefined') {
      return {
        detectedType: 'desktop',
        isTouch: false,
        pointerType: 'fine',
        touchPoints: 0,
        screenWidth: 1920,
        screenHeight: 1080,
        pixelRatio: 1,
        orientation: 'landscape',
        isStandalone: false,
        isBackground: false,
        wakeLockSupported: false,
        userAgent: '',
        hardwareSummary: 'Desktop PC (Standard)'
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation: 'portrait' | 'landscape' = width >= height ? 'landscape' : 'portrait';
    const touchPoints = navigator.maxTouchPoints || 0;
    const isTouch = touchPoints > 0;
    const pixelRatio = window.devicePixelRatio || 1;

    // Pointer precision check
    let pointerType: 'fine' | 'coarse' | 'none' = 'fine';
    if (window.matchMedia('(pointer: coarse)').matches) {
      pointerType = 'coarse';
    } else if (window.matchMedia('(pointer: fine)').matches) {
      pointerType = 'fine';
    } else if (window.matchMedia('(pointer: none)').matches) {
      pointerType = 'none';
    }

    // PWA Standalone check
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    // User Agent checks
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua);
    const isTabletUA = /ipad|tablet|(android(?!.*mobile))/i.test(ua) || (ua.includes('macintosh') && touchPoints > 1);

    // Heuristics for Form Factor
    let detectedType: DeviceType = 'desktop';

    if (width < 768) {
      // Under 768px is smartphone / mobile layout
      detectedType = 'mobile';
    } else if (width <= 1024) {
      // 768px - 1024px is standard tablet range (iPad portrait/landscape, small tablets)
      detectedType = 'tablet';
    } else {
      // Over 1024px: could be large iPad Pro in landscape or touchscreen laptop
      if ((isTabletUA || (pointerType === 'coarse' && isTouch)) && width <= 1366) {
        detectedType = 'tablet';
      } else {
        detectedType = 'desktop';
      }
    }

    // Secondary UA override if screen is rotated or unusual aspect ratio
    if (isMobileUA && width < 900) {
      detectedType = 'mobile';
    }

    const wakeLockSupported = 'wakeLock' in navigator;

    // Hardware summary label
    let hardwareSummary = '';
    if (detectedType === 'mobile') {
      hardwareSummary = `Smartphone (${width}×${height} • Touch)`;
    } else if (detectedType === 'tablet') {
      hardwareSummary = `Tablet / Wanddisplay (${width}×${height} • ${orientation === 'landscape' ? 'Querformat' : 'Hochformat'})`;
    } else {
      hardwareSummary = `Desktop PC (${width}×${height} • Maus & Tastatur)`;
    }

    return {
      detectedType,
      isTouch,
      pointerType,
      touchPoints,
      screenWidth: width,
      screenHeight: height,
      pixelRatio,
      orientation,
      isStandalone,
      isBackground: document.visibilityState === 'hidden',
      wakeLockSupported,
      userAgent: navigator.userAgent,
      hardwareSummary
    };
  }, []);

  const [rawState, setRawState] = useState(computeDetection);

  // Resize and Orientation Listener
  useEffect(() => {
    const handleResize = () => {
      setRawState(computeDetection());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [computeDetection]);

  // Page Visibility Listener (Background Detection)
  useEffect(() => {
    const handleVisibility = () => {
      const hidden = document.visibilityState === 'hidden';
      setIsBackground(hidden);
      setRawState(prev => ({
        ...prev,
        isBackground: hidden
      }));
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Screen Wake Lock Toggle (Useful for Wall-mounted tablets)
  const toggleWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      alert('Screen WakeLock API wird von diesem Browser nicht unterstützt.');
      return;
    }

    if (wakeLockActive && wakeLockSentinel) {
      try {
        await wakeLockSentinel.release();
        setWakeLockSentinel(null);
        setWakeLockActive(false);
      } catch (err) {
        console.error('WakeLock release error:', err);
      }
    } else {
      try {
        const sentinel = await (navigator as any).wakeLock.request('screen');
        sentinel.addEventListener('release', () => {
          setWakeLockActive(false);
          setWakeLockSentinel(null);
        });
        setWakeLockSentinel(sentinel);
        setWakeLockActive(true);
      } catch (err) {
        console.error('WakeLock request error:', err);
        setWakeLockActive(false);
      }
    }
  };

  const setOverride = (newOverride: DeviceOverride) => {
    setOverrideState(newOverride);
    try {
      localStorage.setItem('solar_device_override', newOverride);
    } catch {
      // ignore
    }
  };

  // Determine effective device type
  const effectiveType: DeviceType = override === 'auto' ? rawState.detectedType : override;

  const deviceInfo: DeviceInfo = {
    ...rawState,
    deviceType: effectiveType,
    override,
    isDesktop: effectiveType === 'desktop',
    isTablet: effectiveType === 'tablet',
    isMobile: effectiveType === 'mobile',
    isBackground,
    wakeLockActive
  };

  return {
    ...deviceInfo,
    setOverride,
    toggleWakeLock
  };
}
