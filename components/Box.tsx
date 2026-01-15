'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Box as BoxType } from '@/types';
import {
  Car,
  Plane,
  Train,
  Ship,
  Bike,
  Bus,
  Truck,
  Navigation,
  CarFront,
  GripVertical,
  X,
  Trash2,
} from 'lucide-react';

const TRANSPORT_ICONS: Record<string, typeof Car> = {
  Car,
  Plane,
  Train,
  Ship,
  Bike,
  Bus,
  Truck,
  Taxi: CarFront,
  Navigation,
};

// Box size constraints
const MIN_BOX_WIDTH = 100;
const MIN_BOX_HEIGHT = 60;
const MAX_BOX_WIDTH = 500;
const MAX_BOX_HEIGHT = 400;

interface BoxProps {
  box: BoxType;
  isSelected: boolean;
  onSelect: (id: string, toggle?: boolean) => void;
  onUpdate: (id: string, updates: Partial<BoxType>) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  canvasPanX: number;
  canvasPanY: number;
  canvasZoom: number;
  canvasContainerRef?: React.RefObject<HTMLDivElement | null>;
  selectedBoxIds?: string[];
  allBoxes?: BoxType[];
}

function BoxComponent({
  box,
  isSelected,
  onSelect,
  onUpdate,
  onDrag,
  onDelete,
  canvasPanX,
  canvasPanY,
  canvasZoom,
  canvasContainerRef,
  selectedBoxIds = [],
  allBoxes = [],
}: BoxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(box.label);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [amountAnimation, setAmountAnimation] = useState<'up' | 'down' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousAmountRef = useRef<number>((box.properties.amount as number) || 0);
  // Track if this is a drag vs click
  const isDragRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const mouseDownTimeRef = useRef<number | null>(null);
  const pendingSelectionRef = useRef<{ id: string; toggle: boolean } | null>(null);
  
  // Calculate minimum box size based on content and badges
  const minBoxSize = useMemo(() => {
    const BADGE_HEIGHT = 28; // Approximate badge height
    const PADDING = 16; // px-4 = 16px on each side
    const GAP = 4; // gap-1 = 4px
    
    // Base content height
    let contentHeight = 20; // Label text height
    if (box.description) {
      contentHeight += 16 + GAP; // Description text height + gap
    }
    
    // Check which badges exist
    const transportIcon = (box.properties.transportIcon as string) || 'none';
    const date = box.properties.date ? new Date(box.properties.date as Date) : null;
    const dateRange = box.properties.dateRange 
      ? (typeof box.properties.dateRange === 'object' && 'from' in box.properties.dateRange
        ? box.properties.dateRange.from ? new Date(box.properties.dateRange.from) : null
        : null)
      : null;
    const costType = (box.properties.costType as 'cost' | 'earn' | 'none') || 'none';
    const amount = (box.properties.amount as number) || 0;
    const hasCostEarn = costType !== 'none' && amount > 0;
    
    // Calculate required height to avoid collisions
    // Top badges: transport icon (top-left)
    // Bottom badges: date/dateRange (bottom-left), cost/earn (bottom-right)
    const topBadgeHeight = (transportIcon && transportIcon !== 'none') ? BADGE_HEIGHT + 4 : 0; // +4 for top-1 offset
    const bottomBadgeHeight = (date || dateRange || hasCostEarn) ? BADGE_HEIGHT + 4 : 0; // +4 for bottom-1 offset
    
    // Required height = content + top badge space + bottom badge space + padding
    const requiredHeight = Math.max(
      MIN_BOX_HEIGHT,
      contentHeight + topBadgeHeight + bottomBadgeHeight + PADDING * 2
    );
    
    // Required width = content width + side badges + padding
    // Cost/Earn badges can be wide, so ensure enough width
    const requiredWidth = Math.max(MIN_BOX_WIDTH, 120); // Minimum based on content
    
    return { width: requiredWidth, height: requiredHeight };
  }, [box.description, box.properties]);
  
  // Auto-resize box when properties change (only grow, never shrink automatically)
  useEffect(() => {
    const newWidth = Math.max(box.width, minBoxSize.width);
    const newHeight = Math.max(box.height, minBoxSize.height);
    
    if (newWidth !== box.width || newHeight !== box.height) {
      onUpdate(box.id, {
        width: Math.min(MAX_BOX_WIDTH, newWidth),
        height: Math.min(MAX_BOX_HEIGHT, newHeight),
      });
    }
  }, [minBoxSize, box.width, box.height, box.id, onUpdate]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Track amount changes for animation
  useEffect(() => {
    const currentAmount = (box.properties.amount as number) || 0;
    const previousAmount = previousAmountRef.current;
    
    if (previousAmount !== currentAmount) {
      setAmountAnimation(currentAmount > previousAmount ? 'down' : 'up');
      setTimeout(() => setAmountAnimation(null), 300);
    }
    
    previousAmountRef.current = currentAmount;
  }, [box.properties.amount]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(box.label);
  };

  const handleBlur = () => {
    if (editValue.trim() !== box.label) {
      onUpdate(box.id, { label: editValue.trim() || 'New Box' });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(box.label);
      setIsEditing(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    
    // If shift is pressed, ignore the box and allow click to pass through for panning
    if (e.shiftKey) {
      // Don't select or drag, let the click pass through to canvas
      // We don't call stopPropagation, so the event will bubble up
      return;
    }
    
    e.stopPropagation();
    
    // Store mouse down position and time to detect drag vs click
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    mouseDownTimeRef.current = Date.now();
    isDragRef.current = false;
    
    const toggle = e.ctrlKey || e.metaKey;
    
    // If NOT holding Ctrl, immediately clear other selections and select only this box
    if (!toggle) {
      // Clear all and select only this box (both for clicks and drags)
      onSelect(box.id, false);
    } else {
      // With Ctrl, store pending selection (will apply on mouse up if it's a click)
      pendingSelectionRef.current = { id: box.id, toggle: true };
    }
    
    // Start dragging - calculate offset from mouse to box top-left corner in canvas coordinates
    if (!canvasContainerRef?.current) return;
    
    setIsDragging(true);
    const rect = canvasContainerRef.current.getBoundingClientRect();
    // Convert mouse position to canvas coordinates
    const mouseCanvasX = (e.clientX - rect.left - canvasPanX) / canvasZoom;
    const mouseCanvasY = (e.clientY - rect.top - canvasPanY) / canvasZoom;
    // Calculate offset from mouse to box position
    setDragStart({
      x: mouseCanvasX - box.x,
      y: mouseCanvasY - box.y,
    });
  };

  // Handle dragging
  useEffect(() => {
    if (!isDragging || !canvasContainerRef?.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Check if mouse has moved significantly (threshold: 5px) - if so, it's a drag
      if (mouseDownPosRef.current) {
        const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
        const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // If moved more than 5 pixels, it's a drag
        if (distance > 5) {
          isDragRef.current = true;
        }
      }
      
      // Also check if enough time has passed (200ms) - if so, it's likely a drag
      if (mouseDownTimeRef.current && Date.now() - mouseDownTimeRef.current > 200) {
        isDragRef.current = true;
      }
      
      const rect = canvasContainerRef.current!.getBoundingClientRect();
      // Convert mouse position to canvas coordinates
      const mouseCanvasX = (e.clientX - rect.left - canvasPanX) / canvasZoom;
      const mouseCanvasY = (e.clientY - rect.top - canvasPanY) / canvasZoom;
      // Set box position accounting for the drag offset
      onDrag(box.id, mouseCanvasX - dragStart.x, mouseCanvasY - dragStart.y);
    };

    const handleMouseUp = () => {
      // Only toggle selection if it was a click (not a drag)
      if (!isDragRef.current && pendingSelectionRef.current) {
        onSelect(pendingSelectionRef.current.id, pendingSelectionRef.current.toggle);
      }
      
      // Clean up
      setIsDragging(false);
      isDragRef.current = false;
      mouseDownPosRef.current = null;
      mouseDownTimeRef.current = null;
      pendingSelectionRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, canvasPanX, canvasPanY, canvasZoom, box.id, onDrag, onSelect, canvasContainerRef]);

  // Handle resizing
  useEffect(() => {
    if (!isResizing || !canvasContainerRef?.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasContainerRef.current!.getBoundingClientRect();
      // Convert mouse position to canvas coordinates
      const mouseCanvasX = (e.clientX - rect.left - canvasPanX) / canvasZoom;
      const mouseCanvasY = (e.clientY - rect.top - canvasPanY) / canvasZoom;
      
      // Calculate new size (resize from bottom-right corner)
      // Use the stored initial bottom-right position
      const deltaX = mouseCanvasX - resizeStart.x;
      const deltaY = mouseCanvasY - resizeStart.y;
      
      // Calculate new size with min/max constraints
      const newWidth = Math.max(
        minBoxSize.width,
        Math.min(MAX_BOX_WIDTH, resizeStart.width + deltaX)
      );
      const newHeight = Math.max(
        minBoxSize.height,
        Math.min(MAX_BOX_HEIGHT, resizeStart.height + deltaY)
      );
      
      onUpdate(box.id, { width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, canvasPanX, canvasPanY, canvasZoom, box.id, minBoxSize, onUpdate, canvasContainerRef]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvasContainerRef?.current) return;
    
    setIsResizing(true);
    const rect = canvasContainerRef.current.getBoundingClientRect();
    // Get mouse position in canvas coordinates
    const mouseCanvasX = (e.clientX - rect.left - canvasPanX) / canvasZoom;
    const mouseCanvasY = (e.clientY - rect.top - canvasPanY) / canvasZoom;
    
    // Store the initial box bottom-right corner position
    setResizeStart({
      x: box.x + box.width, // Initial right edge
      y: box.y + box.height, // Initial bottom edge
      width: box.width,
      height: box.height,
    });
  };

  // Box is now inside unified transform container, so no transform needed
  // Position is in canvas coordinates, which will be transformed by parent
  const backgroundColor = useMemo(() => (box.properties.backgroundColor as string) || undefined, [box.properties.backgroundColor]);
  const backgroundImage = useMemo(() => (box.properties.backgroundImage as string) || undefined, [box.properties.backgroundImage]);
  const textColor = useMemo(() => (box.properties.textColor as string) || undefined, [box.properties.textColor]);
  const dateBgColor = useMemo(() => (box.properties.dateBgColor as string) || undefined, [box.properties.dateBgColor]);
  const dateTextColor = useMemo(() => (box.properties.dateTextColor as string) || undefined, [box.properties.dateTextColor]);
  const transportBgColor = useMemo(() => (box.properties.transportBgColor as string) || undefined, [box.properties.transportBgColor]);
  const transportIconColor = useMemo(() => (box.properties.transportIconColor as string) || undefined, [box.properties.transportIconColor]);
  
  const style: React.CSSProperties = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      color: textColor || '#ffffff',
    };
    
    // If backgroundImage exists, use it and override backgroundColor
    if (backgroundImage) {
      baseStyle.backgroundImage = `url(${backgroundImage})`;
      baseStyle.backgroundSize = 'cover';
      baseStyle.backgroundPosition = 'center';
      baseStyle.backgroundRepeat = 'no-repeat';
    } else {
      baseStyle.backgroundColor = backgroundColor || undefined;
    }
    
    return baseStyle;
  }, [box.x, box.y, box.width, box.height, backgroundColor, backgroundImage, textColor]);

  return (
    <div
      style={style}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={`
        border-2 rounded-2xl cursor-move select-none group relative shadow-lg
        ${!backgroundImage && !backgroundColor && 'bg-card'}
        ${isSelected ? 'border-primary/70 ring-4 ring-primary/20 shadow-2xl' : 'border-border/60'}
        hover:border-primary/60 hover:shadow-xl
        transition-[border-color,box-shadow,ring] duration-150
      `}
    >
      {/* Corner badges - absolute positioned */}
      {(() => {
        const transportIcon = (box.properties.transportIcon as string) || null;
        const date = box.properties.date ? new Date(box.properties.date as Date) : null;
        const dateRange = box.properties.dateRange 
          ? (typeof box.properties.dateRange === 'object' && 'from' in box.properties.dateRange
            ? {
                from: box.properties.dateRange.from ? new Date(box.properties.dateRange.from) : null,
                to: box.properties.dateRange.to ? new Date(box.properties.dateRange.to) : null,
              }
            : null)
          : null;
        const costType = (box.properties.costType as 'cost' | 'earn' | 'none') || 'none';
        const amount = (box.properties.amount as number) || 0;
        const currency = (box.properties.currency as string) || 'USD';
        
        const hasCostEarn = costType !== 'none' && amount > 0;
        const currencySymbol = currency === 'USD' ? '$' : 
                              currency === 'EUR' ? '€' :
                              currency === 'GBP' ? '£' :
                              currency === 'JPY' ? '¥' :
                              currency === 'INR' ? '₹' :
                              currency === 'BTC' ? '₿' : currency;
        // Format number with commas every 3 digits on the left side of decimal
        const formattedAmount = amount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const displayAmount = `${currencySymbol}${formattedAmount}`;
        const isCost = costType === 'cost';
        
        return (
          <>
            {/* Top-left: Transport Icon */}
            {transportIcon && transportIcon !== 'none' && TRANSPORT_ICONS[transportIcon] && (() => {
              const Icon = TRANSPORT_ICONS[transportIcon];
              const bgColor = transportBgColor || 'rgba(232, 168, 124, 0.8)';
              // Extract rgba values and apply opacity
              const rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
              const bgStyle = rgbaMatch
                ? `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, 0.8)`
                : bgColor;
              const borderStyle = rgbaMatch
                ? `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, 0.5)`
                : bgColor;
              const iconColor = transportIconColor || '#ffffff';
              return (
                <div 
                  className="absolute top-2 left-2 p-2 rounded-xl border-2 shadow-md"
                  style={{
                    backgroundColor: bgStyle,
                    borderColor: borderStyle,
                  }}
                >
                  <Icon 
                    className="size-5" 
                    style={{
                      color: iconColor,
                    }}
                  />
                </div>
              );
            })()}
            
            {/* Top-right: Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(box.id);
              }}
              className="absolute top-2 right-2 p-2 rounded-xl bg-destructive/80 hover:bg-destructive text-white transition-all duration-300 opacity-0 group-hover:opacity-100 z-20 shadow-lg border-2 border-destructive/50"
              title="Delete box"
            >
              <Trash2 className="size-4" />
            </button>
            
            {/* Bottom-left: Date or Date Range */}
            {(date || dateRange?.from) && (
              <div 
                className="absolute bottom-2 left-2 px-3 py-2 rounded-xl h-8 flex items-center border-2 border-primary/30 shadow-md"
                style={{
                  backgroundColor: dateBgColor || 'rgba(212, 165, 116, 1)',
                }}
              >
                <span 
                  className="text-sm font-bold"
                  style={{
                    color: dateTextColor || '#ffffff',
                  }}
                >
                  {date
                    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : dateRange?.from
                    ? dateRange.to
                      ? `${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : `${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ...`
                    : ''}
                </span>
              </div>
            )}
            
            {/* Bottom-right: Cost/Earn */}
            {hasCostEarn && (
              <div className="absolute bottom-2 right-2 flex items-center gap-0">
                <span className={`px-3 py-2 rounded-l-xl text-sm font-bold h-8 flex items-center border-2 ${
                  isCost 
                    ? 'bg-destructive/25 text-destructive border-destructive/50 shadow-md' 
                    : 'bg-primary/30 text-primary-foreground border-primary/50 shadow-md'
                }`}>
                  {isCost ? 'Cost' : 'Earn'}
                </span>
                <span className={`px-3 py-2 rounded-r-xl text-sm font-bold h-8 flex items-center border-2 border-l-0 ${
                  amountAnimation === 'up' ? 'number-up' : amountAnimation === 'down' ? 'number-down' : ''
                } ${
                  isCost 
                    ? 'bg-destructive/25 text-destructive border-destructive/50 shadow-md' 
                    : 'bg-primary/30 text-primary-foreground border-primary/50 shadow-md'
                }`}>
                  {displayAmount}
                </span>
              </div>
            )}
          </>
        );
      })()}
      
      <div 
        ref={contentRef}
        className="flex flex-col items-center justify-center h-full px-5 py-4 overflow-hidden gap-2 relative z-0"
        style={{
          paddingTop: (() => {
            const transportIcon = (box.properties.transportIcon as string) || 'none';
            return (transportIcon && transportIcon !== 'none') ? '40px' : '16px'; // Extra padding if top badge exists
          })(),
          paddingBottom: (() => {
            const date = box.properties.date ? new Date(box.properties.date as Date) : null;
            const dateRange = box.properties.dateRange 
              ? (typeof box.properties.dateRange === 'object' && 'from' in box.properties.dateRange
                ? box.properties.dateRange.from ? new Date(box.properties.dateRange.from) : null
                : null)
              : null;
            const costType = (box.properties.costType as 'cost' | 'earn' | 'none') || 'none';
            const amount = (box.properties.amount as number) || 0;
            const hasCostEarn = costType !== 'none' && amount > 0;
            return (date || dateRange || hasCostEarn) ? '40px' : '16px'; // Extra padding if bottom badges exist
          })(),
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full text-center bg-transparent border-none outline-none focus:outline-none font-semibold text-base slide-up-in"
            style={{ color: textColor || '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div 
              className="text-center text-base font-semibold break-words"
              style={{ color: textColor || '#ffffff' }}
            >
              {box.label}
            </div>
            {box.description && (
              <div 
                className="text-center text-sm break-words opacity-90"
                style={{ color: textColor || '#ffffff' }}
              >
                {box.description}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Resize handle - only show when exactly one box is selected */}
      {isSelected && selectedBoxIds.length === 1 && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center bg-primary/70 hover:bg-primary/90 border-2 border-primary/60 rounded-tl-2xl transition-all duration-300 shadow-lg"
          style={{ transform: 'translate(3px, 3px)' }}
        >
          <GripVertical className="size-4 text-primary-foreground rotate-90" />
        </div>
      )}
    </div>
  );
}

export const Box = React.memo(BoxComponent);
