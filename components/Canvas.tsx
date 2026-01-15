'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Box } from './Box';
import { ConnectionLayer } from './ConnectionLayer';
import { GridLayer } from './GridLayer';
import { RadialMenu } from './animate-ui/components/community/radial-menu';
import { Plus, Link2 } from 'lucide-react';
import type { Box as BoxType } from '@/types';
import { CANVAS_MIN_X, CANVAS_MAX_X, CANVAS_MIN_Y, CANVAS_MAX_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/canvas-constants';
import { calculatePanBounds } from '@/lib/canvas-utils';

interface CanvasProps {
  boxes: BoxType[];
  connections: Array<{ id: string; fromBoxId: string; toBoxId: string }>;
  panX: number;
  panY: number;
  zoom: number;
  selectedBoxIds: string[];
  connectionSourceId: string | null;
  gridColor?: string;
  canvasBackgroundColor?: string;
  onBoxSelect: (id: string | null, toggle?: boolean, preserveConnection?: boolean) => void;
  onBoxUpdate: (id: string, updates: Partial<BoxType>) => void;
  onBoxDrag: (id: string, x: number, y: number) => void;
  onBoxDelete: (id: string) => void;
  onBoxAdd: (x: number, y: number) => void;
  onBoxCopy: (boxes: BoxType[]) => void;
  onBoxPaste: (x: number, y: number) => void;
  onBoxDuplicate: (ids: string[]) => void;
  onConnectionCreate: (fromBoxId: string, toBoxId: string) => void;
  onConnectionDelete: (id: string) => void;
  onPanChange: (panX: number, panY: number) => void;
  onZoomChange: (zoom: number) => void;
  onStartConnection: () => void;
}

export function Canvas({
  boxes,
  connections,
  panX,
  panY,
  zoom,
  selectedBoxIds,
  connectionSourceId,
  gridColor,
  canvasBackgroundColor,
  onBoxSelect,
  onBoxUpdate,
  onBoxDrag,
  onBoxDelete,
  onBoxAdd,
  onBoxCopy,
  onBoxPaste,
  onBoxDuplicate,
  onConnectionCreate,
  onConnectionDelete,
  onPanChange,
  onZoomChange,
  onStartConnection,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  // Flag to prevent deselection when menu closes after starting connection
  const preventDeselectionRef = useRef(false);

  // Convert screen coordinates to canvas coordinates
  // With unified transform container: screen position = canvasCoord * zoom + panX
  // So: canvasCoord = (screenPosition - panX) / zoom
  const screenToCanvas = (screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    // Account for unified transform: translate(panX, panY) scale(zoom)
    const x = (screenX - rect.left - panX) / zoom;
    const y = (screenY - rect.top - panY) / zoom;
    return { x, y };
  };

  // Handle canvas background click (remove box creation on click - now use radial menu)
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Don't handle clicks if they're from the radial menu closing
    if ((e.target as HTMLElement).closest('[data-radix-context-menu-content]')) {
      return;
    }
    // Don't deselect if we just started a connection (menu is closing)
    if (preventDeselectionRef.current) {
      return;
    }
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      if (connectionSourceId) {
        // Cancel connection mode - click on background cancels
        onBoxSelect(null, false);
      } else {
        // Just deselect on click - box creation is now via radial menu
        onBoxSelect(null, false);
      }
    }
  };

  // Track mouse position for connection guide line
  const handleMouseMove = (e: React.MouseEvent) => {
    if (connectionSourceId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - panX) / zoom;
      const canvasY = (e.clientY - rect.top - panY) / zoom;
      setMousePos({ x: canvasX, y: canvasY });
    }
  };

  // Track last right-click position for box creation
  const lastRightClickPos = useRef<{ x: number; y: number } | null>(null);

  // Build menu items based on selection
  const menuItems = [];
  if (selectedBoxIds.length === 1) {
    menuItems.push({ id: 1, label: 'Connect', icon: Link2 });
  }
  menuItems.push({ id: 2, label: 'Create Box', icon: Plus });

  const handleMenuSelect = (item: { id: number; label: string; icon: any }) => {
    if (item.label === 'Connect' && selectedBoxIds.length === 1) {
      // Set flag to prevent deselection when menu closes
      preventDeselectionRef.current = true;
      onStartConnection();
      // Reset mouse position when starting connection
      setMousePos(null);
      // Clear flag after menu has time to close
      setTimeout(() => {
        preventDeselectionRef.current = false;
      }, 150);
    } else if (item.label === 'Create Box' && lastRightClickPos.current) {
      // Convert screen position to canvas coordinates
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const canvasX = (lastRightClickPos.current.x - rect.left - panX) / zoom;
        const canvasY = (lastRightClickPos.current.y - rect.top - panY) / zoom;
        onBoxAdd(canvasX, canvasY);
      }
    }
    lastRightClickPos.current = null;
  };

  // Track right-click position (Radix UI ContextMenu will handle the menu)
  const handleRightClick = (e: React.MouseEvent) => {
    // Always track right-click position for box creation
    lastRightClickPos.current = { x: e.clientX, y: e.clientY };
  };

  // Handle panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow panning on canvas background, or if shift is pressed (to ignore boxes)
    const isCanvasBackground = e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background');
    if (isCanvasBackground || e.shiftKey) {
      if (e.button === 0 && !connectionSourceId) {
        // Left mouse button, not in connection mode
        setIsPanning(true);
        setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
        e.preventDefault();
      }
    }
  };

  // Helper function to calculate pan bounds
  const getPanBounds = useCallback(() => {
    if (!canvasRef.current) return { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
    const rect = canvasRef.current.getBoundingClientRect();
    return calculatePanBounds(rect.width, rect.height, zoom);
  }, [zoom]);

  // Clamp pan when zoom changes (if zoom changed externally, not from wheel)
  // Only clamp after a short delay to ensure viewport is ready
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Use a small timeout to ensure viewport is measured
    const timeoutId = setTimeout(() => {
      if (!canvasRef.current) return;
      const bounds = getPanBounds();
      
      // Only clamp if bounds are valid (not locked)
      if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) return;
      
      const clampedPanX = Math.max(bounds.minX, Math.min(bounds.maxX, panX));
      const clampedPanY = Math.max(bounds.minY, Math.min(bounds.maxY, panY));
      
      // Only update if clamping changed the values
      if (clampedPanX !== panX || clampedPanY !== panY) {
        onPanChange(clampedPanX, clampedPanY);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]); // Re-clamp when zoom changes (panX/panY checked inside, getPanBounds updates with zoom)

  useEffect(() => {
    if (!isPanning || !canvasRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newPanX = e.clientX - panStart.x;
      let newPanY = e.clientY - panStart.y;
      
      // Clamp pan to prevent viewing outside canvas bounds
      const bounds = getPanBounds();
      newPanX = Math.max(bounds.minX, Math.min(bounds.maxX, newPanX));
      newPanY = Math.max(bounds.minY, Math.min(bounds.maxY, newPanY));
      
      onPanChange(newPanX, newPanY);
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panStart, zoom, getPanBounds, onPanChange]);

  // Handle zoom - zoom towards viewport center
  // Scroll wheel zooms in/out (Ctrl+Wheel still works, but regular wheel also zooms)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const viewportWidth = rect.width;
    const viewportHeight = rect.height;
    const viewportCenterX = viewportWidth / 2;
    const viewportCenterY = viewportHeight / 2;
    
    // Get the canvas point at viewport center before zoom
    const canvasX = (viewportCenterX - panX) / zoom;
    const canvasY = (viewportCenterY - panY) / zoom;
    
    // Calculate new zoom - increment by 0.05 (5%) to match slider step
    const zoomStep = 0.05;
    const zoomDelta = e.deltaY > 0 ? -zoomStep : zoomStep;
    const newZoom = Math.max(0.1, Math.min(3, zoom + zoomDelta));
    
    // Calculate new pan to keep the same canvas point at viewport center
    const newPanX = viewportCenterX - canvasX * newZoom;
    const newPanY = viewportCenterY - canvasY * newZoom;
    
    // Clamp pan to bounds (need to recalculate bounds with new zoom)
    // Temporarily calculate bounds with new zoom
    const canvasWidth = CANVAS_MAX_X - CANVAS_MIN_X;
    const canvasHeight = CANVAS_MAX_Y - CANVAS_MIN_Y;
    const scaledCanvasWidth = canvasWidth * newZoom;
    const scaledCanvasHeight = canvasHeight * newZoom;
    
    let clampedPanX = newPanX;
    let clampedPanY = newPanY;
    
    const widthFits = scaledCanvasWidth <= viewportWidth;
    const heightFits = scaledCanvasHeight <= viewportHeight;
    
    if (widthFits) {
      // Canvas width fits - allow centering
      const centerPanX = viewportWidth / 2;
      const minPanX = centerPanX - (viewportWidth - scaledCanvasWidth) / 2;
      const maxPanX = centerPanX + (viewportWidth - scaledCanvasWidth) / 2;
      clampedPanX = Math.max(minPanX, Math.min(maxPanX, newPanX));
    } else {
      // Canvas width doesn't fit - prevent viewing outside bounds
      const minPanX = viewportWidth - CANVAS_MAX_X * newZoom;
      const maxPanX = -CANVAS_MIN_X * newZoom;
      clampedPanX = Math.max(minPanX, Math.min(maxPanX, newPanX));
    }
    
    if (heightFits) {
      // Canvas height fits - allow centering
      const centerPanY = viewportHeight / 2;
      const minPanY = centerPanY - (viewportHeight - scaledCanvasHeight) / 2;
      const maxPanY = centerPanY + (viewportHeight - scaledCanvasHeight) / 2;
      clampedPanY = Math.max(minPanY, Math.min(maxPanY, newPanY));
    } else {
      // Canvas height doesn't fit - prevent viewing outside bounds
      const minPanY = viewportHeight - CANVAS_MAX_Y * newZoom;
      const maxPanY = -CANVAS_MIN_Y * newZoom;
      clampedPanY = Math.max(minPanY, Math.min(maxPanY, newPanY));
    }
    
    onZoomChange(newZoom);
    onPanChange(clampedPanX, clampedPanY);
  };

  // Handle box click for connections
  const handleBoxClick = (boxId: string) => {
    if (connectionSourceId) {
      // Complete connection
      if (connectionSourceId !== boxId) {
        onConnectionCreate(connectionSourceId, boxId);
      }
      onBoxSelect(null);
    } else {
      // Select box
      onBoxSelect(boxId);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only allow shortcuts if not typing in an input field
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (isTyping) {
        // Don't interfere with text input
        return;
      }

      // Copy (Ctrl+C or Cmd+C) - copy all selected boxes
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        if (selectedBoxIds.length > 0) {
          const boxesToCopy = selectedBoxIds.map((id) => boxes.find((b) => b.id === id)).filter((b) => b !== undefined) as BoxType[];
          if (boxesToCopy.length > 0) {
            onBoxCopy(boxesToCopy);
          }
        }
      }
      // Paste (Ctrl+V or Cmd+V)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        // Paste at viewport center if canvasRef exists
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const viewportCenterX = rect.width / 2;
          const viewportCenterY = rect.height / 2;
          const canvasX = (viewportCenterX - panX) / zoom;
          const canvasY = (viewportCenterY - panY) / zoom;
          // Trigger paste - the parent will handle clipboard data
          onBoxPaste(canvasX, canvasY);
        }
      }
      // Duplicate (Ctrl+D or Cmd+D) - duplicate all selected boxes
      else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedBoxIds.length > 0) {
          onBoxDuplicate(selectedBoxIds);
        }
      }
      // Delete key - support bulk delete
      else if (e.key === 'Delete') {
        if (selectedBoxIds.length > 0) {
          selectedBoxIds.forEach((id) => onBoxDelete(id));
          onBoxSelect(null);
        }
      }
      // Escape
      else if (e.key === 'Escape') {
        onBoxSelect(null, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBoxIds, boxes, panX, panY, zoom, onBoxDelete, onBoxSelect, onBoxCopy, onBoxPaste, onBoxDuplicate]);

  return (
    <RadialMenu
      menuItems={menuItems}
      onSelect={handleMenuSelect}
    >
      <div
        ref={canvasRef}
        className="canvas-background relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: canvasBackgroundColor || undefined }}
        onClick={handleCanvasClick}
        onContextMenu={handleRightClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
      >
        {/* Unified transform container - applies pan and zoom to all canvas elements */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          <GridLayer canvasZoom={zoom} gridColor={gridColor} />
          <ConnectionLayer
            boxes={boxes}
            connections={connections}
            canvasZoom={zoom}
            onConnectionClick={onConnectionDelete}
            connectionSourceId={connectionSourceId}
            connectionTargetPos={mousePos}
          />
          <div style={{ pointerEvents: 'auto' }}>
            {boxes.map((box) => (
              <Box
                key={box.id}
                box={box}
                isSelected={selectedBoxIds.includes(box.id)}
                onSelect={(id, toggle) => {
                  if (connectionSourceId && id !== connectionSourceId) {
                    // In connection mode - create connection
                    onConnectionCreate(connectionSourceId, id);
                    onBoxSelect(null, false); // Reset connection mode
                    setMousePos(null);
                  } else {
                    // Normal selection (with optional toggle)
                    onBoxSelect(id, toggle, false);
                  }
                }}
                onUpdate={onBoxUpdate}
                onDrag={onBoxDrag}
                onDelete={onBoxDelete}
                canvasContainerRef={canvasRef}
                canvasPanX={panX}
                canvasPanY={panY}
                canvasZoom={zoom}
                selectedBoxIds={selectedBoxIds}
                allBoxes={boxes}
              />
            ))}
          </div>
        </div>
      </div>
    </RadialMenu>
  );
}

