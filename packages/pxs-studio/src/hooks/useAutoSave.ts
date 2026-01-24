'use client';

import { useEffect, useState, useCallback } from 'react';
import autoSaveManager, { type AutoSaveConfig } from '../store/auto-save';

export function useAutoSave() {
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const [timeSinceLastSave, setTimeSinceLastSave] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auto-save on mount (async)
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await autoSaveManager.init();
        if (mounted) {
          setIsInitialized(true);
          setLastSaveTime(autoSaveManager.getLastSaveTimestamp());
        }
      } catch (e) {
        console.warn('Auto-save initialization failed:', e);
        if (mounted) {
          setIsInitialized(true); // Still mark as initialized even if failed
        }
      }
    };

    initialize();

    // Subscribe to save events
    const unsubscribe = autoSaveManager.subscribe((timestamp) => {
      if (mounted) {
        setLastSaveTime(timestamp);
      }
    });

    // Update time since last save every second
    const interval = setInterval(() => {
      if (mounted) {
        setTimeSinceLastSave(autoSaveManager.getTimeSinceLastSave());
      }
    }, 1000);

    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Save now (async)
  const saveNow = useCallback(async () => {
    return autoSaveManager.saveNow();
  }, []);

  // Get backups
  const getBackups = useCallback(() => {
    return autoSaveManager.getBackups();
  }, []);

  // Load backup
  const loadBackup = useCallback((index: number) => {
    return autoSaveManager.loadBackup(index);
  }, []);

  // Export project
  const exportProject = useCallback(() => {
    return autoSaveManager.exportProject();
  }, []);

  // Import project
  const importProject = useCallback((json: string) => {
    return autoSaveManager.importProject(json);
  }, []);

  // Get/set config
  const getConfig = useCallback(() => {
    return autoSaveManager.getConfig();
  }, []);

  const setConfig = useCallback((config: Partial<AutoSaveConfig>) => {
    autoSaveManager.setConfig(config);
  }, []);

  // Format time since last save
  const formatTimeSinceLastSave = useCallback(() => {
    if (timeSinceLastSave === 0) return 'Not saved yet';
    if (timeSinceLastSave < 60) return `${timeSinceLastSave}s ago`;
    if (timeSinceLastSave < 3600) return `${Math.floor(timeSinceLastSave / 60)}m ago`;
    return `${Math.floor(timeSinceLastSave / 3600)}h ago`;
  }, [timeSinceLastSave]);

  return {
    isInitialized,
    lastSaveTime,
    timeSinceLastSave,
    formatTimeSinceLastSave,
    
    // Actions
    saveNow,
    getBackups,
    loadBackup,
    exportProject,
    importProject,
    getConfig,
    setConfig,
    
    // Control
    start: () => autoSaveManager.start(),
    stop: () => autoSaveManager.stop(),
    clearAll: () => autoSaveManager.clearAll(),
  };
}

export default useAutoSave;
