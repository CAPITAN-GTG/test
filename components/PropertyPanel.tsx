'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Box } from '@/types';
import { useFileUpload } from '@/hooks/use-file-upload';
import { type DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from '@/components/ui/shadcn-io/color-picker';
import {
  DollarSign,
  Euro,
  PoundSterling,
  JapaneseYen,
  IndianRupee,
  Bitcoin,
  Car,
  Plane,
  Train,
  Ship,
  Bike,
  Bus,
  Truck,
  Navigation,
  TrendingUp,
  TrendingDown,
  CarFront,
  Calendar as CalendarIcon,
  X,
  Trash2,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';

interface PropertyPanelProps {
  box: Box | null;
  onUpdate: (id: string, updates: Partial<Box>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}


const CURRENCIES = [
  { code: 'USD', symbol: '$', icon: DollarSign, name: 'US Dollar' },
  { code: 'EUR', symbol: '€', icon: Euro, name: 'Euro' },
  { code: 'GBP', symbol: '£', icon: PoundSterling, name: 'British Pound' },
  { code: 'JPY', symbol: '¥', icon: JapaneseYen, name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', icon: IndianRupee, name: 'Indian Rupee' },
  { code: 'BTC', symbol: '₿', icon: Bitcoin, name: 'Bitcoin' },
];

const TRANSPORT_ICONS = [
  { name: 'Car', icon: Car },
  { name: 'Plane', icon: Plane },
  { name: 'Train', icon: Train },
  { name: 'Ship', icon: Ship },
  { name: 'Bike', icon: Bike },
  { name: 'Bus', icon: Bus },
  { name: 'Truck', icon: Truck },
  { name: 'Taxi', icon: CarFront },
  { name: 'Navigation', icon: Navigation },
];

interface TransportSliderProps {
  icons: typeof TRANSPORT_ICONS;
  selectedIcon: string;
  onSelect: (iconName: string) => void;
}

function TransportSlider({ icons, selectedIcon, onSelect }: TransportSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={sliderRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`flex gap-2 overflow-x-scroll pb-2 cursor-grab active:cursor-grabbing scrollbar-hide bg-card/60 rounded-xl p-2 border-2 border-border/40 ${
        isDragging ? 'select-none' : ''
      }`}
    >
      {icons.map((transport) => {
        const Icon = transport.icon;
        const isSelected = selectedIcon === transport.name;
        return (
          <button
            key={transport.name}
            onClick={(e) => {
              if (!isDragging) {
                onSelect(transport.name);
              }
            }}
            onMouseDown={(e) => {
              if (e.detail > 1) e.preventDefault();
            }}
            className={`p-2.5 rounded-lg border-2 transition-all duration-300 flex items-center justify-center min-w-[3rem] flex-shrink-0 ${
              isSelected
                ? 'bg-primary/30 border-primary/60 text-primary-foreground shadow-md'
                : 'bg-card/80 border-border/50 text-muted-foreground hover:bg-card hover:text-foreground hover:border-primary/40'
            }`}
            title={transport.name}
          >
            <Icon className="size-5" />
          </button>
        );
      })}
    </div>
  );
}

function PropertyPanelComponent({ box, onUpdate, onClose, onDelete }: PropertyPanelProps) {
  if (!box) {
    return (
      <div className="w-80 border-l border-border bg-background p-6">
        <div className="text-sm text-muted-foreground font-medium">
          Select a box to edit its properties
        </div>
      </div>
    );
  }

  // Get currency and amount from properties
  const currency = (box.properties.currency as string) || 'USD';
  const amount = (box.properties.amount as number) || 0;
  const costType = (box.properties.costType as 'cost' | 'earn' | 'none') || 'none';
  const transportIcon = (box.properties.transportIcon as string) || 'none';
  const backgroundImage = (box.properties.backgroundImage as string) || undefined;
  
  // Date/DateRange state
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Get date or dateRange from properties
  const date = box.properties.date ? new Date(box.properties.date as Date) : undefined;
  const dateRange = box.properties.dateRange 
    ? (typeof box.properties.dateRange === 'object' && 'from' in box.properties.dateRange
      ? {
          from: box.properties.dateRange.from ? new Date(box.properties.dateRange.from) : undefined,
          to: box.properties.dateRange.to ? new Date(box.properties.dateRange.to) : undefined,
        }
      : undefined)
    : undefined;
  
  // Initialize mode based on existing data
  useEffect(() => {
    if (dateRange) {
      setDateMode('range');
    } else if (date) {
      setDateMode('single');
    }
  }, []);

  // Initialize file upload hook for image
  const [uploadState, uploadActions] = useFileUpload({
    accept: 'image/*',
    multiple: false,
  });

  // Keys for ColorPicker remounting when dropdowns open
  const [bgColorPickerKey, setBgColorPickerKey] = useState(0);
  const [textColorPickerKey, setTextColorPickerKey] = useState(0);
  const [dateBgColorPickerKey, setDateBgColorPickerKey] = useState(0);
  const [dateTextColorPickerKey, setDateTextColorPickerKey] = useState(0);
  const [transportBgColorPickerKey, setTransportBgColorPickerKey] = useState(0);
  const [transportIconColorPickerKey, setTransportIconColorPickerKey] = useState(0);

  // Sync uploaded files to box properties
  useEffect(() => {
    if (uploadState.files.length > 0 && uploadState.files[0].preview) {
      const imageUrl = uploadState.files[0].preview;
      if (imageUrl !== backgroundImage) {
        const newProperties: any = {
          ...box.properties,
          backgroundImage: imageUrl,
        };
        // Clear backgroundColor when image is set
        delete newProperties.backgroundColor;
        onUpdate(box.id, { properties: newProperties });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState.files, box.id, onUpdate, backgroundImage]);

  return (
    <div className="w-96 border-l-2 border-border/60 bg-card flex flex-col h-full shadow-2xl">
      <div className="px-5 py-3 border-b-2 border-border/60 flex justify-between items-center bg-secondary/30 backdrop-blur-md">
        <h2 className="text-lg font-bold text-foreground tracking-tight">
          Properties
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (box) {
                onDelete(box.id);
                onClose();
              }
            }}
            className="text-destructive hover:text-destructive hover:bg-destructive/15 rounded-xl p-2 transition-all duration-300 flex items-center justify-center border-2 border-transparent hover:border-destructive/30"
            title="Delete box"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-primary/20 rounded-xl p-2 transition-all duration-300 text-2xl leading-none flex items-center justify-center w-9 h-9 border-2 border-transparent hover:border-primary/30"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-card/50">
        {/* Label (always present) */}
        <div className="bg-secondary/20 rounded-xl p-3 border-2 border-border/40">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Label
          </label>
          <input
            type="text"
            value={box.label}
            onChange={(e) => onUpdate(box.id, { label: e.target.value })}
            className="w-full px-3 py-2 border-2 border-border/50 rounded-lg bg-card/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 hover:bg-card hover:border-primary/50 transition-all duration-300 text-sm"
          />
        </div>

        {/* Description */}
        <div className="bg-secondary/20 rounded-xl p-3 border-2 border-border/40">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Description
          </label>
          <textarea
            value={box.description || ''}
            onChange={(e) => onUpdate(box.id, { description: e.target.value })}
            placeholder="Add a description..."
            rows={2}
            className="w-full px-3 py-2 border-2 border-border/50 rounded-lg bg-card/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 hover:bg-card hover:border-primary/50 transition-all duration-300 resize-none text-sm"
          />
        </div>

        {/* Background */}
        <div className="bg-secondary/20 rounded-xl p-3 border-2 border-border/40">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-foreground">
              Background
            </label>
            <div className="flex items-center gap-1.5">
              <DropdownMenu onOpenChange={(open) => { if (open) setBgColorPickerKey(prev => prev + 1); }}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-7 h-7 rounded-lg border-2 border-border/50 shadow-md hover:shadow-lg hover:border-primary/60 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
                    style={{
                      backgroundColor: (box.properties.backgroundColor as string) || '#000000',
                    }}
                    title="Background color"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  className="p-4 min-w-[280px]"
                  transition={{ duration: 0.05 }}
                >
                  <ColorPicker
                    key={bgColorPickerKey}
                    value={(box.properties.backgroundColor as string) || '#000000'}
                    onChange={((rgba: [number, number, number, number]) => {
                      const r = Math.round(rgba[0]);
                      const g = Math.round(rgba[1]);
                      const b = Math.round(rgba[2]);
                      const a = rgba[3];
                      const rgbaString = `rgba(${r}, ${g}, ${b}, ${a})`;
                      const newProperties: any = {
                        ...box.properties,
                        backgroundColor: rgbaString,
                      };
                      // Clear backgroundImage when color is selected
                      delete newProperties.backgroundImage;
                      // Clear file upload state
                      uploadActions.clearFiles();
                      onUpdate(box.id, { properties: newProperties });
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
              <DropdownMenu onOpenChange={(open) => { if (open) setTextColorPickerKey(prev => prev + 1); }}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-7 h-7 rounded-lg border-2 border-border/50 shadow-md hover:shadow-lg hover:border-primary/60 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
                    style={{
                      backgroundColor: (box.properties.textColor as string) || '#ffffff',
                    }}
                    title="Text color"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  className="p-4 min-w-[280px]"
                  transition={{ duration: 0.05 }}
                >
                  <ColorPicker
                    key={textColorPickerKey}
                    value={(box.properties.textColor as string) || '#ffffff'}
                    onChange={((rgba: [number, number, number, number]) => {
                      const r = Math.round(rgba[0]);
                      const g = Math.round(rgba[1]);
                      const b = Math.round(rgba[2]);
                      const a = rgba[3];
                      const rgbaString = `rgba(${r}, ${g}, ${b}, ${a})`;
                      const newProperties = {
                        ...box.properties,
                        textColor: rgbaString,
                      };
                      onUpdate(box.id, { properties: newProperties });
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
          </div>
          {backgroundImage ? (
            <div className="flex items-center gap-3">
              {/* Thumbnail on the left */}
              <div className="relative rounded-lg overflow-hidden border border-border bg-muted/50 flex-shrink-0" style={{ width: '80px', height: '80px' }}>
                <img
                  src={backgroundImage}
                  alt="Background preview"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Buttons and file name on the right */}
              <div className="flex-1 flex flex-col gap-2">
                {/* File name */}
                {uploadState.files.length > 0 && uploadState.files[0].file instanceof File && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="size-4" />
                    <span className="truncate">{uploadState.files[0].file.name}</span>
                  </div>
                )}
                {/* Buttons in a column */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={uploadActions.openFileDialog}
                    className="w-full px-3 py-2 border-2 border-border/50 rounded-lg bg-card/80 text-foreground hover:bg-card hover:border-primary/50 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm hover:shadow-md"
                  >
                    <Upload className="size-4" />
                    Change
                  </button>
                  <button
                    onClick={() => {
                      uploadActions.clearFiles();
                      const newProperties: any = { ...box.properties };
                      delete newProperties.backgroundImage;
                      onUpdate(box.id, { properties: newProperties });
                    }}
                    className="w-full px-3 py-2 border-2 border-border/50 rounded-lg bg-card/80 text-destructive hover:bg-destructive/15 hover:border-destructive/40 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm hover:shadow-md"
                  >
                    <X className="size-4" />
                    Remove
                  </button>
                </div>
              </div>
              {/* Hidden file input */}
              <input
                {...uploadActions.getInputProps()}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={uploadActions.openFileDialog}
                className="w-full px-3 py-2 border-2 border-border/50 rounded-lg bg-card/80 text-foreground hover:bg-card hover:border-primary/50 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm hover:shadow-md"
              >
                <Upload className="size-4" />
                Upload Image
              </button>
              {/* Hidden file input */}
              <input
                {...uploadActions.getInputProps()}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Date */}
        <div className="bg-secondary/20 rounded-xl p-3 border-2 border-border/40">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarIcon className="size-4 text-foreground" />
              Date
            </label>
            <div className="flex items-center gap-1.5">
              <DropdownMenu onOpenChange={(open) => { if (open) setDateBgColorPickerKey(prev => prev + 1); }}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-7 h-7 rounded-lg border-2 border-border/50 shadow-md hover:shadow-lg hover:border-primary/60 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
                    style={{
                      backgroundColor: (box.properties.dateBgColor as string) || '#D4A574',
                    }}
                    title="Date background color"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  className="p-4 min-w-[280px]"
                  transition={{ duration: 0.05 }}
                >
                  <ColorPicker
                    key={dateBgColorPickerKey}
                    value={(box.properties.dateBgColor as string) || '#D4A574'}
                    onChange={((rgba: [number, number, number, number]) => {
                      const r = Math.round(rgba[0]);
                      const g = Math.round(rgba[1]);
                      const b = Math.round(rgba[2]);
                      const a = rgba[3];
                      const rgbaString = `rgba(${r}, ${g}, ${b}, ${a})`;
                      const newProperties = {
                        ...box.properties,
                        dateBgColor: rgbaString,
                      };
                      onUpdate(box.id, { properties: newProperties });
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
              <DropdownMenu onOpenChange={(open) => { if (open) setDateTextColorPickerKey(prev => prev + 1); }}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-7 h-7 rounded-lg border-2 border-border/50 shadow-md hover:shadow-lg hover:border-primary/60 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
                    style={{
                      backgroundColor: (box.properties.dateTextColor as string) || '#ffffff',
                    }}
                    title="Date text color"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  className="p-4 min-w-[280px]"
                  transition={{ duration: 0.05 }}
                >
                  <ColorPicker
                    key={dateTextColorPickerKey}
                    value={(box.properties.dateTextColor as string) || '#ffffff'}
                    onChange={((rgba: [number, number, number, number]) => {
                      const r = Math.round(rgba[0]);
                      const g = Math.round(rgba[1]);
                      const b = Math.round(rgba[2]);
                      const a = rgba[3];
                      const rgbaString = `rgba(${r}, ${g}, ${b}, ${a})`;
                      const newProperties = {
                        ...box.properties,
                        dateTextColor: rgbaString,
                      };
                      onUpdate(box.id, { properties: newProperties });
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
          </div>
          <div className="flex flex-col gap-2">
            {/* Mode toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setDateMode('single');
                  // Clear range when switching to single
                  if (dateRange) {
                    const newProperties: any = { ...box.properties };
                    delete newProperties.dateRange;
                    if (dateRange.from) {
                      newProperties.date = dateRange.from;
                    }
                    onUpdate(box.id, { properties: newProperties });
                  }
                }}
                className={`flex-1 px-3 py-1.5 text-xs rounded-lg border-2 transition-all duration-300 font-semibold ${
                  dateMode === 'single'
                    ? 'bg-primary/30 border-primary/60 text-primary-foreground shadow-md'
                    : 'bg-card/80 border-border/50 text-muted-foreground hover:bg-card hover:border-primary/40 hover:text-foreground'
                }`}
              >
                Single
              </button>
              <button
                onClick={() => {
                  setDateMode('range');
                  // Convert single date to range start when switching
                  if (date && !dateRange) {
                    const newProperties: any = {
                      ...box.properties,
                      dateRange: { from: date, to: undefined },
                    };
                    delete newProperties.date;
                    onUpdate(box.id, { properties: newProperties });
                  }
                }}
                className={`flex-1 px-3 py-1.5 text-xs rounded-lg border-2 transition-all duration-300 font-semibold ${
                  dateMode === 'range'
                    ? 'bg-primary/30 border-primary/60 text-primary-foreground shadow-md'
                    : 'bg-card/80 border-border/50 text-muted-foreground hover:bg-card hover:border-primary/40 hover:text-foreground'
                }`}
              >
                Range
              </button>
            </div>
            
            {/* Calendar popover */}
            <DropdownMenu open={calendarOpen} onOpenChange={setCalendarOpen}>
              <DropdownMenuTrigger asChild>
                <button className="w-full px-3 py-2 border-2 border-border/50 rounded-lg bg-card/80 text-foreground text-left text-sm hover:bg-card hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md font-medium">
                  {dateMode === 'single' ? (
                    date ? (
                      format(date, 'MMM d, yyyy')
                    ) : (
                      'Select date'
                    )
                  ) : (
                    dateRange?.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                      ) : (
                        `${format(dateRange.from, 'MMM d, yyyy')} - ...`
                      )
                    ) : (
                      'Select date range'
                    )
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="start"
                className="p-0 w-auto relative"
                onCloseAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={(e) => {
                  // Allow closing on outside click
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCalendarOpen(false);
                  }}
                  className="absolute top-1 right-1 z-10 p-0.5 rounded hover:bg-accent/50 transition-colors"
                  aria-label="Close calendar"
                >
                  <X className="size-3 text-foreground" />
                </button>
                <Calendar
                  {...({
                    mode: dateMode,
                    selected: dateMode === 'single' ? date : dateRange,
                    onSelect: (selected: any) => {
                    if (dateMode === 'single') {
                      const newProperties: any = {
                        ...box.properties,
                        date: selected as Date,
                      };
                      delete newProperties.dateRange;
                      onUpdate(box.id, { properties: newProperties });
                      // Don't close automatically - user can click outside or X button
                    } else {
                      const range = selected as DateRange | undefined;
                      if (range?.from && range?.to) {
                        const newProperties: any = {
                          ...box.properties,
                          dateRange: { from: range.from, to: range.to },
                        };
                        delete newProperties.date;
                        onUpdate(box.id, { properties: newProperties });
                        // Don't close automatically - user can click outside or X button
                      } else if (range?.from) {
                        const newProperties: any = {
                          ...box.properties,
                          dateRange: { from: range.from, to: undefined },
                        };
                        delete newProperties.date;
                        onUpdate(box.id, { properties: newProperties });
                      }
                    }
                    },
                    className: "rounded-md border-0 shadow-none",
                    captionLayout: "dropdown"
                  } as any)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Cost/Earn Slider */}
        <div className="bg-secondary/20 rounded-xl p-3 border-2 border-border/40">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Cost/Earn
          </label>
          {/* Tabs */}
          <div className="flex -space-x-px mb-2">
            {(['none', 'cost', 'earn'] as const).map((type, index) => {
              const isSelected = costType === type;
              const isFirst = index === 0;
              const isLast = index === 2;
              const isCost = type === 'cost';
              return (
                <button
                  key={type}
                  onClick={() => {
                    const newProperties = {
                      ...box.properties,
                      costType: type,
                    };
                    onUpdate(box.id, { properties: newProperties });
                  }}
                  className={`flex-1 px-3 py-2 transition-all duration-300 text-sm font-semibold border-2 ${
                    isFirst ? 'rounded-l-lg' : ''
                  } ${isLast ? 'rounded-r-lg' : ''} ${
                    isCost && !isFirst && !isLast ? 'border-l-0 border-r-0' : ''
                  } ${
                    isSelected
                      ? type === 'cost'
                        ? 'bg-destructive/25 border-destructive/60 text-destructive z-10 shadow-md'
                        : type === 'earn'
                        ? 'bg-primary/30 border-primary/60 text-primary-foreground z-10 shadow-md'
                        : 'bg-card/80 border-border/50 text-foreground z-10'
                      : 'bg-card/60 border-border/50 text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-primary/40'
                  }`}
                >
                  {type === 'cost' ? (
                    <TrendingDown className="size-4 mx-auto" />
                  ) : type === 'earn' ? (
                    <TrendingUp className="size-4 mx-auto" />
                  ) : (
                    <span className="text-xs">None</span>
                  )}
                </button>
              );
            })}
          </div>
          {costType !== 'none' && (
            <div className="flex gap-0">
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  const newProperties = {
                    ...box.properties,
                    amount: parseFloat(e.target.value) || 0,
                  };
                  onUpdate(box.id, { properties: newProperties });
                }}
                placeholder="0.00"
                className="w-28 px-2.5 py-2 border-2 border-border/50 rounded-l-lg bg-card/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 hover:bg-card hover:border-primary/50 transition-all duration-300 text-sm"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-2.5 py-2 border-2 border-l-0 border-border/50 rounded-r-lg bg-card/80 text-foreground hover:bg-card hover:border-primary/50 transition-all duration-300 flex items-center justify-center shadow-sm hover:shadow-md">
                    {(() => {
                      const curr = CURRENCIES.find((c) => c.code === currency);
                      const Icon = curr?.icon || DollarSign;
                      return <Icon className="size-4" />;
                    })()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  side="bottom" 
                  align="end" 
                  className="w-48"
                  transition={{ duration: 0.05 }}
                >
                  {CURRENCIES.map((curr) => {
                    const Icon = curr.icon;
                    return (
                      <DropdownMenuItem
                        key={curr.code}
                        onClick={() => {
                          const newProperties = { ...box.properties, currency: curr.code };
                          onUpdate(box.id, { properties: newProperties });
                        }}
                      >
                        <Icon className="size-4" />
                        <span>{curr.name} ({curr.code})</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Transport Slider */}
        <div className="bg-secondary/20 rounded-xl p-3 border-2 border-border/40">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-foreground">
              Transport
            </label>
            <div className="flex items-center gap-1.5">
              <DropdownMenu onOpenChange={(open) => { if (open) setTransportBgColorPickerKey(prev => prev + 1); }}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-7 h-7 rounded-lg border-2 border-border/50 shadow-md hover:shadow-lg hover:border-primary/60 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
                    style={{
                      backgroundColor: (box.properties.transportBgColor as string) || '#E8A87C',
                    }}
                    title="Transport background color"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  className="p-4 min-w-[280px]"
                  transition={{ duration: 0.05 }}
                >
                  <ColorPicker
                    key={transportBgColorPickerKey}
                    value={(box.properties.transportBgColor as string) || '#E8A87C'}
                    onChange={((rgba: [number, number, number, number]) => {
                      const r = Math.round(rgba[0]);
                      const g = Math.round(rgba[1]);
                      const b = Math.round(rgba[2]);
                      const a = rgba[3];
                      const rgbaString = `rgba(${r}, ${g}, ${b}, ${a})`;
                      const newProperties = {
                        ...box.properties,
                        transportBgColor: rgbaString,
                      };
                      onUpdate(box.id, { properties: newProperties });
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
              <DropdownMenu onOpenChange={(open) => { if (open) setTransportIconColorPickerKey(prev => prev + 1); }}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-7 h-7 rounded-lg border-2 border-border/50 shadow-md hover:shadow-lg hover:border-primary/60 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
                    style={{
                      backgroundColor: (box.properties.transportIconColor as string) || '#ffffff',
                    }}
                    title="Transport icon color"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  className="p-4 min-w-[280px]"
                  transition={{ duration: 0.05 }}
                >
                  <ColorPicker
                    key={transportIconColorPickerKey}
                    value={(box.properties.transportIconColor as string) || '#ffffff'}
                    onChange={((rgba: [number, number, number, number]) => {
                      const r = Math.round(rgba[0]);
                      const g = Math.round(rgba[1]);
                      const b = Math.round(rgba[2]);
                      const a = rgba[3];
                      const rgbaString = `rgba(${r}, ${g}, ${b}, ${a})`;
                      const newProperties = {
                        ...box.properties,
                        transportIconColor: rgbaString,
                      };
                      onUpdate(box.id, { properties: newProperties });
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
          </div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => {
                const newProperties = { ...box.properties, transportIcon: 'none' };
                onUpdate(box.id, { properties: newProperties });
              }}
              className={`px-3 py-1.5 rounded-lg border-2 transition-all duration-300 text-sm font-semibold ${
                transportIcon === 'none'
                  ? 'bg-primary/30 border-primary/60 text-primary-foreground shadow-md'
                  : 'bg-card/80 border-border/50 text-muted-foreground hover:bg-card hover:text-foreground hover:border-primary/40'
              }`}
            >
              None
            </button>
          </div>
          <TransportSlider
            icons={TRANSPORT_ICONS}
            selectedIcon={transportIcon}
            onSelect={(iconName) => {
              const newProperties = { ...box.properties, transportIcon: iconName };
              onUpdate(box.id, { properties: newProperties });
            }}
          />
        </div>
      </div>
    </div>
  );
}

export const PropertyPanel = React.memo(PropertyPanelComponent);