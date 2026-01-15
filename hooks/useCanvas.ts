'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Box, Connection, CanvasState } from '@/types';
import { clampBoxPosition, CANVAS_MIN_X, CANVAS_MAX_X, CANVAS_MIN_Y, CANVAS_MAX_Y } from '@/lib/canvas-constants';
import { DEFAULT_BOX_WIDTH, DEFAULT_BOX_HEIGHT, DEFAULT_ZOOM } from '@/lib/canvas-defaults';

const STORAGE_KEY = 'visual-canvas-state';
const STORAGE_DEBOUNCE_MS = 500;

export function useCanvas() {
  // Start with default state to ensure server/client match
  const [state, setState] = useState<CanvasState>({
    boxes: [],
    connections: [],
    panX: 0,
    panY: 0,
    zoom: DEFAULT_ZOOM,
  });

  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Convert date strings back to Date objects for properties
          parsed.boxes = parsed.boxes.map((box: Box) => ({
            ...box,
            properties: Object.fromEntries(
              Object.entries(box.properties).map(([key, value]) => [
                key,
                typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)
                  ? new Date(value)
                  : value,
              ])
            ),
          }));
          // Ensure zoom is valid
          if (typeof parsed.zoom !== 'number' || parsed.zoom < 0.1 || parsed.zoom > 3) {
            parsed.zoom = DEFAULT_ZOOM;
          }
          // If pan/zoom are at defaults, reset them so Canvas can center on mount
          if (parsed.panX === 0 && parsed.panY === 0 && parsed.zoom === DEFAULT_ZOOM) {
            parsed.panX = 0;
            parsed.panY = 0;
            parsed.zoom = DEFAULT_ZOOM;
          }
          setState(parsed);
        } catch (e) {
          console.error('Failed to load canvas state:', e);
        }
      }
    }
  }, []); // Run once on mount

  // Debounce localStorage saves
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Save to localStorage whenever state changes (debounced, skip initial empty state load)
  useEffect(() => {
    // Skip initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    if (typeof window !== 'undefined') {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Only save if there's meaningful state
      if (state.boxes.length > 0 || state.connections.length > 0 || state.panX !== 0 || state.panY !== 0 || state.zoom !== DEFAULT_ZOOM) {
        // Set new timeout for debounced save
        saveTimeoutRef.current = setTimeout(() => {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          } catch (e) {
            console.error('Failed to save canvas state:', e);
          }
        }, STORAGE_DEBOUNCE_MS);
      }
    }

    // Cleanup timeout on unmount or state change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state]);

  const addBox = useCallback((x: number, y: number) => {
    // Clamp position to canvas bounds
    const clamped = clampBoxPosition(x, y, DEFAULT_BOX_WIDTH, DEFAULT_BOX_HEIGHT);
    const newBox: Box = {
      id: `box-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      x: clamped.x,
      y: clamped.y,
      width: DEFAULT_BOX_WIDTH,
      height: DEFAULT_BOX_HEIGHT,
      label: 'New Box',
      properties: {},
    };
    setState((prev) => ({
      ...prev,
      boxes: [...prev.boxes, newBox],
    }));
    return newBox.id;
  }, []);

  const updateBox = useCallback((id: string, updates: Partial<Box>) => {
    setState((prev) => ({
      ...prev,
      boxes: prev.boxes.map((box) => {
        if (box.id !== id) return box;
        
        // If position is being updated, clamp to canvas bounds
        if (updates.x !== undefined || updates.y !== undefined) {
          const newX = updates.x !== undefined ? updates.x : box.x;
          const newY = updates.y !== undefined ? updates.y : box.y;
          const clamped = clampBoxPosition(newX, newY, box.width, box.height);
          return { ...box, ...updates, x: clamped.x, y: clamped.y };
        }
        
        return { ...box, ...updates };
      }),
    }));
  }, []);

  const deleteBox = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      boxes: prev.boxes.filter((box) => box.id !== id),
      connections: prev.connections.filter(
        (conn) => conn.fromBoxId !== id && conn.toBoxId !== id
      ),
    }));
  }, []);

  const addConnection = useCallback((fromBoxId: string, toBoxId: string) => {
    // Don't allow self-connections or duplicate connections
    if (fromBoxId === toBoxId) return;
    
    setState((prev) => {
      const exists = prev.connections.some(
        (conn) => conn.fromBoxId === fromBoxId && conn.toBoxId === toBoxId
      );
      if (exists) return prev;

      const newConnection: Connection = {
        id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        fromBoxId,
        toBoxId,
      };
      return {
        ...prev,
        connections: [...prev.connections, newConnection],
      };
    });
  }, []);

  const deleteConnection = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      connections: prev.connections.filter((conn) => conn.id !== id),
    }));
  }, []);

  const setPan = useCallback((panX: number, panY: number) => {
    // Pan limits will be enforced in the Canvas component based on viewport size
    setState((prev) => ({ ...prev, panX, panY }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.1, Math.min(3, zoom)) }));
  }, []);

  const resetCanvas = useCallback(() => {
    setState({
      boxes: [],
      connections: [],
      panX: 0,
      panY: 0,
      zoom: DEFAULT_ZOOM,
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const duplicateBox = useCallback((id: string, offsetX: number = 20, offsetY: number = 20) => {
    const prevBox = state.boxes.find((b) => b.id === id);
    if (!prevBox) return null;

    const newBox: Box = {
      id: `box-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      x: prevBox.x + offsetX,
      y: prevBox.y + offsetY,
      width: prevBox.width,
      height: prevBox.height,
      label: `${prevBox.label} (Copy)`,
      description: prevBox.description,
      properties: { ...prevBox.properties },
    };

    // Clamp position to canvas bounds
    const clamped = clampBoxPosition(newBox.x, newBox.y, newBox.width, newBox.height);
    newBox.x = clamped.x;
    newBox.y = clamped.y;

    setState((prev) => ({
      ...prev,
      boxes: [...prev.boxes, newBox],
    }));
    
    return newBox.id;
  }, [state.boxes]);

  const pasteBox = useCallback((boxData: Omit<Box, 'id'>, x: number, y: number) => {
    const newBox: Box = {
      id: `box-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      x,
      y,
      width: boxData.width,
      height: boxData.height,
      label: boxData.label,
      description: boxData.description,
      properties: { ...boxData.properties },
    };

    // Clamp position to canvas bounds
    const clamped = clampBoxPosition(newBox.x, newBox.y, newBox.width, newBox.height);
    newBox.x = clamped.x;
    newBox.y = clamped.y;

    setState((prev) => ({
      ...prev,
      boxes: [...prev.boxes, newBox],
    }));

    return newBox.id;
  }, []);

  return {
    state,
    addBox,
    updateBox,
    deleteBox,
    addConnection,
    deleteConnection,
    setPan,
    setZoom,
    resetCanvas,
    duplicateBox,
    pasteBox,
  };
}

