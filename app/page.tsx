'use client';

// Route segment config
export const dynamic = 'force-dynamic';

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { PropertyPanel } from '@/components/PropertyPanel';
import { useCanvas } from '@/hooks/useCanvas';
import type { Box } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from '@/components/ui/shadcn-io/color-picker';

export default function Home() {
  const {
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
  } = useCanvas();

  // Clipboard for copy/paste - stores array of boxes (without ids) and their relative positions
  const clipboardRef = useRef<Array<{ box: Omit<Box, 'id'>; relativeX: number; relativeY: number }>>([]);

  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>([]);
  const [showProperties, setShowProperties] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);
  // Ref to track if we just started a connection (to prevent immediate reset)
  const justStartedConnectionRef = useRef(false);
  // Refs to track multi-box dragging
  const dragInitialPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const isDraggingRef = useRef(false);
  
  // Canvas appearance state - coffee shop defaults
  const [gridColor, setGridColor] = useState<string>('rgba(120, 100, 85, 0.15)');
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState<string>('rgba(35, 28, 25, 0.3)');
  const [gridColorPickerKey, setGridColorPickerKey] = useState(0);
  const [canvasBgColorPickerKey, setCanvasBgColorPickerKey] = useState(0);

  const selectedBox = useMemo(() => {
    if (selectedBoxIds.length !== 1) return null;
    return state.boxes.find((box) => box.id === selectedBoxIds[0]) || null;
  }, [selectedBoxIds, state.boxes]);

  const handleBoxSelect = useCallback((id: string | null, toggle = false, preserveConnection = false) => {
    if (id === null) {
      // Deselect all
      setSelectedBoxIds([]);
      if (showProperties && !isClosing) {
        setIsClosing(true);
        setTimeout(() => {
          setShowProperties(false);
          setIsClosing(false);
        }, 300);
      }
    } else {
      setSelectedBoxIds((prev) => {
        if (toggle) {
          // Toggle selection (Ctrl+Click)
          const index = prev.indexOf(id);
          if (index >= 0) {
            // Deselect if already selected
            const newIds = prev.filter((boxId) => boxId !== id);
            if (newIds.length === 1) {
              // If exactly one box remains, show properties
              if (isClosing) setIsClosing(false);
              setShowProperties(true);
            } else if (newIds.length === 0) {
              // If no boxes selected, hide properties
              if (showProperties && !isClosing) {
                setIsClosing(true);
                setTimeout(() => {
                  setShowProperties(false);
                  setIsClosing(false);
                }, 300);
              }
            }
            return newIds;
          } else {
            // Select if not selected
            const newIds = [...prev, id];
            if (newIds.length === 1) {
              // If exactly one box selected, show properties
              if (isClosing) setIsClosing(false);
              setShowProperties(true);
            } else {
              // Multiple boxes selected, hide properties
              if (showProperties && !isClosing) {
                setIsClosing(true);
                setTimeout(() => {
                  setShowProperties(false);
                  setIsClosing(false);
                }, 300);
              }
            }
            return newIds;
          }
        } else {
          // Normal click/drag without Ctrl - clear all other selections and select only this box
          if (isClosing) setIsClosing(false);
          setShowProperties(true);
          return [id];
        }
      });
    }
    
    // Only reset connectionSourceId if we're explicitly deselecting AND not preserving connection
    // BUT: if we just started a connection, don't reset it
    setConnectionSourceId((prev) => {
      if (id === null && !preserveConnection) {
        if (justStartedConnectionRef.current) {
          return prev; // Keep the connection source
        }
        return null;
      } else {
        return prev; // Keep the current value
      }
    });
  }, [showProperties, isClosing]);

  const handleBoxAdd = (x: number, y: number) => {
    addBox(x, y);
  };

  const handleBoxUpdate = (id: string, updates: Partial<typeof state.boxes[0]>) => {
    updateBox(id, updates);
  };

  const handleBoxDrag = useCallback((id: string, x: number, y: number) => {
    // If this box is selected and there are other selected boxes, move all together
    if (selectedBoxIds.includes(id) && selectedBoxIds.length > 1) {
      // On first drag, store initial positions
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        dragInitialPositionsRef.current.clear();
        selectedBoxIds.forEach((boxId) => {
          const box = state.boxes.find((b) => b.id === boxId);
          if (box) {
            dragInitialPositionsRef.current.set(boxId, { x: box.x, y: box.y });
          }
        });
      }

      // Calculate offset for the dragged box
      const initialPos = dragInitialPositionsRef.current.get(id);
      if (initialPos) {
        const offsetX = x - initialPos.x;
        const offsetY = y - initialPos.y;

        // Apply the same offset to all selected boxes
        selectedBoxIds.forEach((boxId) => {
          const initialBoxPos = dragInitialPositionsRef.current.get(boxId);
          if (initialBoxPos) {
            updateBox(boxId, {
              x: initialBoxPos.x + offsetX,
              y: initialBoxPos.y + offsetY,
            });
          }
        });
      }
    } else {
      // Single box drag or box not selected - just update the dragged box
      updateBox(id, { x, y });
      // Reset drag state
      isDraggingRef.current = false;
      dragInitialPositionsRef.current.clear();
    }
  }, [selectedBoxIds, state.boxes, updateBox]);

  // Reset drag state when mouse up (handled by effect watching selectedBoxIds)
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        dragInitialPositionsRef.current.clear();
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleBoxDelete = (id: string) => {
    deleteBox(id);
    setSelectedBoxIds((prev) => {
      const newIds = prev.filter((boxId) => boxId !== id);
      if (newIds.length === 0) {
        setShowProperties(false);
      } else if (newIds.length === 1) {
        setShowProperties(true);
      }
      return newIds;
    });
  };

  const handleBulkDelete = useCallback(() => {
    selectedBoxIds.forEach((id) => deleteBox(id));
    setSelectedBoxIds([]);
    setShowProperties(false);
  }, [selectedBoxIds, deleteBox]);

  const handleConnectionCreate = (fromBoxId: string, toBoxId: string) => {
    addConnection(fromBoxId, toBoxId);
  };

  const handleStartConnection = () => {
    // Only allow connection from single selection
    if (selectedBoxIds.length === 1) {
      justStartedConnectionRef.current = true;
      setConnectionSourceId(selectedBoxIds[0]);
      // Clear the flag after a short delay to allow the menu to close
      setTimeout(() => {
        justStartedConnectionRef.current = false;
      }, 200);
    }
  };

  const handleCancelConnection = () => {
    setConnectionSourceId(null);
  };

  const handleBoxCopy = useCallback((boxesToCopy: Box[]) => {
    if (boxesToCopy.length === 0) return;
    
    // Calculate the center of all boxes to use as reference point
    const centerX = boxesToCopy.reduce((sum, box) => sum + box.x + box.width / 2, 0) / boxesToCopy.length;
    const centerY = boxesToCopy.reduce((sum, box) => sum + box.y + box.height / 2, 0) / boxesToCopy.length;
    
    // Store boxes with their relative positions to the center
    clipboardRef.current = boxesToCopy.map((box) => {
      const { id, ...boxData } = box;
      return {
        box: boxData,
        relativeX: box.x - centerX,
        relativeY: box.y - centerY,
      };
    });
  }, []);

  const handleBoxPaste = useCallback((x: number, y: number) => {
    // Only paste if clipboard data exists
    if (clipboardRef.current.length > 0) {
      const pastedIds: string[] = [];
      
      clipboardRef.current.forEach(({ box, relativeX, relativeY }) => {
        const newBoxId = pasteBox(box, x + relativeX, y + relativeY);
        pastedIds.push(newBoxId);
      });
      
      // Select all pasted boxes
      setSelectedBoxIds(pastedIds);
      if (pastedIds.length === 1) {
        setShowProperties(true);
      }
    }
  }, [pasteBox]);

  const handleBoxDuplicate = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    
    // Calculate offset based on box positions
    const boxesToDuplicate = ids.map((id) => state.boxes.find((b) => b.id === id)).filter((b) => b !== undefined) as Box[];
    if (boxesToDuplicate.length === 0) return;
    
    // Find the rightmost box to calculate offset
    const rightmostBox = boxesToDuplicate.reduce((rightmost, box) => 
      box.x + box.width > rightmost.x + rightmost.width ? box : rightmost
    );
    const offsetX = 20;
    const offsetY = 20;
    
    const duplicatedIds: string[] = [];
    boxesToDuplicate.forEach((box) => {
      const newBoxId = duplicateBox(box.id, offsetX, offsetY);
      if (newBoxId) {
        duplicatedIds.push(newBoxId);
      }
    });
    
    // Select all duplicated boxes
    setSelectedBoxIds(duplicatedIds);
    if (duplicatedIds.length === 1) {
      setShowProperties(true);
    }
  }, [duplicateBox, state.boxes]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex h-20 shrink-0 items-center gap-3 border-b-2 border-border/60 bg-card/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-3 px-6 w-full">
            {connectionSourceId && (
              <button
                onClick={handleCancelConnection}
                className="px-4 py-2.5 bg-secondary/60 hover:bg-primary/30 hover:text-primary-foreground active:scale-98 text-foreground rounded-xl transition-all duration-300 text-base font-medium shadow-md hover:shadow-lg border-2 border-border/50 hover:border-primary/50"
              >
                Cancel Connection
              </button>
            )}
            <div className="flex-1" />
            {/* Zoom Controls */}
            <div className="flex items-center gap-0 bg-secondary/40 rounded-2xl p-1 border-2 border-border/50 shadow-inner">
              {/* Color pickers on the left */}
              <div className="flex items-center gap-1">
                {/* Grid color picker */}
                <DropdownMenu onOpenChange={(open) => { if (open) setGridColorPickerKey(prev => prev + 1); }}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-8 h-10 rounded-xl border-2 border-border/50 shadow-md hover:shadow-lg hover:border-primary/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0 bg-card/80 hover:bg-primary/20"
                      style={{
                        backgroundColor: gridColor,
                      }}
                      title="Grid color"
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="bottom"
                    align="start"
                    className="p-4 min-w-[280px]"
                    transition={{ duration: 0.05 }}
                  >
                    <ColorPicker
                      key={gridColorPickerKey}
                      value={gridColor}
                      onChange={((rgba: [number, number, number, number]) => {
                        const r = Math.round(rgba[0]);
                        const g = Math.round(rgba[1]);
                        const b = Math.round(rgba[2]);
                        const a = rgba[3];
                        setGridColor(`rgba(${r}, ${g}, ${b}, ${a})`);
                      }) as any}
                      className="max-w-full"
                    >
                      <ColorPickerSelection className="h-32" />
                      <div className="flex items-center gap-4">
                        <ColorPickerEyeDropper />
                        <div className="grid w-full gap-1">
                          <ColorPickerHue />
                          <ColorPickerAlpha />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ColorPickerOutput />
                        <ColorPickerFormat />
                      </div>
                    </ColorPicker>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Canvas background color picker */}
                <DropdownMenu onOpenChange={(open) => { if (open) setCanvasBgColorPickerKey(prev => prev + 1); }}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-8 h-10 rounded-xl border-2 border-border/50 shadow-md hover:shadow-lg hover:border-primary/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0 bg-card/80 hover:bg-primary/20"
                      style={{
                        backgroundColor: canvasBackgroundColor,
                      }}
                      title="Canvas background color"
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="bottom"
                    align="start"
                    className="p-4 min-w-[280px]"
                    transition={{ duration: 0.05 }}
                  >
                    <ColorPicker
                      key={canvasBgColorPickerKey}
                      value={canvasBackgroundColor}
                      onChange={((rgba: [number, number, number, number]) => {
                        const r = Math.round(rgba[0]);
                        const g = Math.round(rgba[1]);
                        const b = Math.round(rgba[2]);
                        const a = rgba[3];
                        setCanvasBackgroundColor(`rgba(${r}, ${g}, ${b}, ${a})`);
                      }) as any}
                      className="max-w-full"
                    >
                      <ColorPickerSelection className="h-32" />
                      <div className="flex items-center gap-4">
                        <ColorPickerEyeDropper />
                        <div className="grid w-full gap-1">
                          <ColorPickerHue />
                          <ColorPickerAlpha />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ColorPickerOutput />
                        <ColorPickerFormat />
                      </div>
                    </ColorPicker>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Slider box in the middle */}
              <div className="flex items-center gap-3 bg-card/60 px-4 h-10 rounded-xl border-2 border-border/50 shadow-inner">
                <span className="text-base text-foreground min-w-[4rem] text-right font-semibold">
                  {Math.round(state.zoom * 100)}%
                </span>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={state.zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-36 h-2 bg-muted/50 rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/90 transition-all duration-300"
                  title="Zoom"
                />
                <button
                  onClick={() => setZoom(Math.max(0.1, state.zoom - 0.1))}
                  className="px-3 py-1.5 hover:bg-primary/30 hover:text-primary-foreground active:scale-98 text-foreground rounded-xl text-base font-semibold transition-all duration-300 shadow-sm hover:shadow-md"
                  title="Zoom Out"
                >
                  −
                </button>
                <button
                  onClick={() => setZoom(Math.min(3, state.zoom + 0.1))}
                  className="px-3 py-1.5 hover:bg-primary/30 hover:text-primary-foreground active:scale-98 text-foreground rounded-xl text-base font-semibold transition-all duration-300 shadow-sm hover:shadow-md"
                  title="Zoom In"
                >
                  +
                </button>
              </div>
              
              {/* Reset Zoom button on the right - separate connected box */}
              <button
                onClick={() => setZoom(1)}
                className="px-4 h-10 rounded-xl border-2 border-border/50 bg-card/80 hover:bg-primary/30 hover:border-primary/50 active:scale-98 text-foreground hover:text-primary-foreground text-base font-semibold transition-all duration-300 flex items-center shadow-md hover:shadow-lg"
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>
            <button
              onClick={resetCanvas}
              className="px-5 py-2.5 bg-destructive/15 hover:bg-destructive/25 hover:scale-102 active:scale-98 text-destructive rounded-xl transition-all duration-300 text-base font-semibold shadow-md hover:shadow-lg hover:border-destructive/50 border-2 border-destructive/30"
            >
              Clear Canvas
            </button>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative bg-secondary/20">
          <Canvas
            boxes={state.boxes}
            connections={state.connections}
            panX={state.panX}
            panY={state.panY}
            zoom={state.zoom}
            selectedBoxIds={selectedBoxIds}
            connectionSourceId={connectionSourceId}
            gridColor={gridColor}
            canvasBackgroundColor={canvasBackgroundColor}
            onBoxSelect={handleBoxSelect}
            onBoxUpdate={handleBoxUpdate}
            onBoxDrag={handleBoxDrag}
            onBoxDelete={handleBoxDelete}
            onBoxAdd={handleBoxAdd}
            onBoxCopy={handleBoxCopy}
            onBoxPaste={handleBoxPaste}
            onBoxDuplicate={handleBoxDuplicate}
            onConnectionCreate={handleConnectionCreate}
            onConnectionDelete={deleteConnection}
            onPanChange={setPan}
            onZoomChange={setZoom}
            onStartConnection={handleStartConnection}
          />
        </div>
      </div>

      {/* Properties Panel - only show when exactly one box is selected */}
      {selectedBoxIds.length === 1 && (showProperties || isClosing) && (
        <div className={isClosing ? 'sidebar-slide-out' : 'sidebar-slide-in'}>
          <PropertyPanel
            box={selectedBox}
            onUpdate={handleBoxUpdate}
            onDelete={handleBoxDelete}
            onClose={() => {
              setIsClosing(true);
              setTimeout(() => {
                setShowProperties(false);
                setIsClosing(false);
                setSelectedBoxIds([]);
              }, 300); // Match animation duration
            }}
          />
        </div>
      )}

      {/* Bulk Delete Button - show when multiple boxes are selected */}
      {selectedBoxIds.length > 1 && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={handleBulkDelete}
            className="px-6 py-4 bg-destructive hover:bg-destructive/90 text-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 text-base font-bold flex items-center gap-3 border-2 border-destructive/40"
          >
            <span>Delete {selectedBoxIds.length} boxes?</span>
          </button>
        </div>
      )}
    </div>
  );
}
