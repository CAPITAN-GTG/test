'use client';

import Color from 'color';
import { PipetteIcon } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import React, {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ColorPickerContextValue {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  mode: string;
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setLightness: (lightness: number) => void;
  setAlpha: (alpha: number) => void;
  setMode: (mode: string) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
  undefined
);

export const useColorPicker = () => {
  const context = useContext(ColorPickerContext);

  if (!context) {
    throw new Error('useColorPicker must be used within a ColorPickerProvider');
  }

  return context;
};

export type ColorPickerProps = HTMLAttributes<HTMLDivElement> & {
  value?: Parameters<typeof Color>[0];
  defaultValue?: Parameters<typeof Color>[0];
  onChange?: (value: Parameters<typeof Color.rgb>[0]) => void;
};

export const ColorPicker = ({
  value,
  defaultValue = '#000000',
  onChange,
  className,
  ...props
}: ColorPickerProps) => {
  const getInitialColor = () => {
    try {
      return value ? Color(value) : Color(defaultValue);
    } catch {
      return Color(defaultValue);
    }
  };

  const initialColor = getInitialColor();
  const defaultColor = Color(defaultValue);

  const [hue, setHue] = useState(() => {
    const h = initialColor.hue();
    return !isNaN(h) ? h : defaultColor.hue() || 0;
  });
  const [saturation, setSaturation] = useState(() => {
    const s = initialColor.saturationl();
    return !isNaN(s) ? s : defaultColor.saturationl() || 100;
  });
  const [lightness, setLightness] = useState(() => {
    const l = initialColor.lightness();
    return !isNaN(l) ? l : defaultColor.lightness() || 50;
  });
  const [alpha, setAlpha] = useState(() => {
    const a = initialColor.alpha();
    return !isNaN(a) ? a * 100 : defaultColor.alpha() * 100;
  });
  const [mode, setMode] = useState('hex');
  const isUpdatingFromValueRef = useRef(false);
  const lastReportedHexRef = useRef<string | null>(null);
  const lastReportedAlphaRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);
  const onChangeRef = useRef(onChange);
  
  // Keep onChange ref in sync
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Update color when controlled value changes
  useEffect(() => {
    if (value !== undefined) {
      try {
        const incomingColor = Color(value);
        const incomingHex = incomingColor.hex();
        
        // Only update if this is a genuinely new color value
        const incomingAlpha = incomingColor.alpha() || 1;
        if (incomingHex !== lastReportedHexRef.current || incomingAlpha !== lastReportedAlphaRef.current || isInitialMount.current) {
          const hsl = incomingColor.hsl().array();
          const newHue = hsl[0] || 0;
          const newSaturation = hsl[1] || 0;
          const newLightness = hsl[2] || 50;
          const newAlpha = incomingAlpha * 100;
          
          // Mark that we're updating from value prop BEFORE setting state
          isUpdatingFromValueRef.current = true;
          lastReportedHexRef.current = incomingHex;
          lastReportedAlphaRef.current = incomingAlpha;
          
          setHue(newHue);
          setSaturation(newSaturation);
          setLightness(newLightness);
          setAlpha(newAlpha);
          
          // Reset flag after all state updates have been queued
          // Use double requestAnimationFrame to ensure state updates complete
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              isUpdatingFromValueRef.current = false;
            });
          });
        }
      } catch {
        // Invalid color, keep current values
        isUpdatingFromValueRef.current = false;
      }
    }
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [value]);

  // Notify parent of changes (skip if updating from value prop)
  useEffect(() => {
    // Skip if we're updating from value prop or during initial mount
    if (!isUpdatingFromValueRef.current && !isInitialMount.current && onChangeRef.current) {
      const color = Color.hsl(hue, saturation, lightness).alpha(alpha / 100);
      const rgba = color.rgb().array();
      const currentHex = color.hex();
      const currentAlpha = alpha / 100;
      
      // Call onChange if hex changed OR alpha changed
      if (currentHex !== lastReportedHexRef.current || currentAlpha !== lastReportedAlphaRef.current) {
        lastReportedHexRef.current = currentHex;
        lastReportedAlphaRef.current = currentAlpha;
        onChangeRef.current([rgba[0], rgba[1], rgba[2], currentAlpha]);
      }
    }
  }, [hue, saturation, lightness, alpha]);

  return (
    <ColorPickerContext.Provider
      value={{
        hue,
        saturation,
        lightness,
        alpha,
        mode,
        setHue,
        setSaturation,
        setLightness,
        setAlpha,
        setMode,
      }}
    >
      <div
        className={cn('flex size-full flex-col gap-4', className)}
        {...(props as any)}
      />
    </ColorPickerContext.Provider>
  );
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(
  ({ className, ...props }: ColorPickerSelectionProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [positionX, setPositionX] = useState(0);
    const [positionY, setPositionY] = useState(0);
    const { hue, saturation, lightness, setSaturation, setLightness } = useColorPicker();

    const backgroundGradient = useMemo(() => {
      return `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
            linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
            hsl(${hue}, 100%, 50%)`;
    }, [hue]);

    // Calculate position from saturation and lightness
    useEffect(() => {
      if (!isDragging) {
        // Calculate x from saturation: x = saturation / 100
        const x = saturation / 100;
        
        // Calculate y from lightness
        // Reverse the formula: lightness = topLightness * (1 - y)
        // where topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x)
        const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x);
        const y = topLightness > 0 ? 1 - (lightness / topLightness) : 0;
        
        setPositionX(Math.max(0, Math.min(1, x)));
        setPositionY(Math.max(0, Math.min(1, y)));
      }
    }, [saturation, lightness, isDragging]);

    const handlePointerMove = useCallback(
      (event: PointerEvent) => {
        if (!(isDragging && containerRef.current)) {
          return;
        }
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(1, (event.clientX - rect.left) / rect.width)
        );
        const y = Math.max(
          0,
          Math.min(1, (event.clientY - rect.top) / rect.height)
        );
        setPositionX(x);
        setPositionY(y);
        setSaturation(x * 100);
        const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x);
        const lightness = topLightness * (1 - y);

        setLightness(lightness);
      },
      [isDragging, setSaturation, setLightness]
    );

    useEffect(() => {
      const handlePointerUp = () => setIsDragging(false);

      if (isDragging) {
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
      }

      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }, [isDragging, handlePointerMove]);

    return (
      <div
        className={cn('relative size-full cursor-crosshair rounded', className)}
        onPointerDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
          handlePointerMove(e.nativeEvent);
        }}
        ref={containerRef}
        style={{
          background: backgroundGradient,
        }}
        {...(props as any)}
      >
        <div
          className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white"
          style={{
            left: `${positionX * 100}%`,
            top: `${positionY * 100}%`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
          }}
        />
      </div>
    );
  }
);

ColorPickerSelection.displayName = 'ColorPickerSelection';

export type ColorPickerHueProps = React.ComponentPropsWithoutRef<typeof Slider.Root>;

export const ColorPickerHue = ({
  className,
  ...props
}: ColorPickerHueProps) => {
  const { hue, setHue } = useColorPicker();

  return (
    <Slider.Root
      className={cn('relative flex h-4 w-full touch-none', className)}
      max={360}
      onValueChange={([hue]) => setHue(hue)}
      step={1}
      value={[hue]}
      {...(props as any)}
    >
      <Slider.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
        <Slider.Range className="absolute h-full" />
      </Slider.Track>
      <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </Slider.Root>
  );
};

export type ColorPickerAlphaProps = React.ComponentPropsWithoutRef<typeof Slider.Root>;

export const ColorPickerAlpha = ({
  className,
  ...props
}: ColorPickerAlphaProps) => {
  const { alpha, setAlpha } = useColorPicker();

  return (
    <Slider.Root
      className={cn('relative flex h-4 w-full touch-none', className)}
      max={100}
      onValueChange={([alpha]) => setAlpha(alpha)}
      step={1}
      value={[alpha]}
      {...(props as any)}
    >
      <Slider.Track
        className="relative my-0.5 h-3 w-full grow rounded-full"
        style={{
          background:
            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
        }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent to-black/50" />
        <Slider.Range className="absolute h-full rounded-full bg-transparent" />
      </Slider.Track>
      <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </Slider.Root>
  );
};

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({
  className,
  ...props
}: ColorPickerEyeDropperProps) => {
  const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker();

  const handleEyeDropper = async () => {
    try {
      // @ts-expect-error - EyeDropper API is experimental
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const color = Color(result.sRGBHex);
      const [h, s, l] = color.hsl().array();

      setHue(h);
      setSaturation(s);
      setLightness(l);
      setAlpha(100);
    } catch (error) {
      console.error('EyeDropper failed:', error);
    }
  };

  return (
    <Button
      className={cn('shrink-0 text-muted-foreground', className)}
      onClick={handleEyeDropper}
      size="icon"
      variant="outline"
      type="button"
      {...(props as any)}
    >
      <PipetteIcon size={16} />
    </Button>
  );
};

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

const formats = ['hex', 'rgb', 'css', 'hsl'];

export const ColorPickerOutput = ({
  className,
  ...props
}: ColorPickerOutputProps) => {
  const { mode, setMode } = useColorPicker();

  return (
    <Select onValueChange={setMode} value={mode}>
      <SelectTrigger className="h-8 w-20 shrink-0 text-xs" {...(props as any)}>
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem className="text-xs" key={format} value={format}>
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

type PercentageInputProps = ComponentProps<typeof Input>;

const PercentageInput = ({ className, ...props }: PercentageInputProps) => {
  return (
    <div className="relative">
      <Input
        readOnly
        type="text"
        {...(props as any)}
        className={cn(
          'h-8 w-[3.25rem] rounded-l-none bg-secondary px-2 text-xs shadow-none',
          className
        )}
      />
      <span className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground text-xs">
        %
      </span>
    </div>
  );
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerFormat = memo(({
  className,
  ...props
}: ColorPickerFormatProps) => {
  const { hue, saturation, lightness, alpha, mode, setHue, setSaturation, setLightness, setAlpha } = useColorPicker();
  
  // Memoize color and computed arrays
  const color = useMemo(() => Color.hsl(hue, saturation, lightness, alpha / 100), [hue, saturation, lightness, alpha]);
  const rgb = useMemo(() => color.rgb().array().map((value) => Math.round(value)), [color]);
  const hsl = useMemo(() => color.hsl().array().map((value) => Math.round(value)), [color]);
  const hex = useMemo(() => color.hex(), [color]);

  // Shared function to update color from any color string (hex, css, etc.)
  const updateColorFromString = useCallback((value: string) => {
    try {
      const newColor = Color(value);
      const newHsl = newColor.hsl().array();
      setHue(newHsl[0] || 0);
      setSaturation(newHsl[1] || 0);
      setLightness(newHsl[2] || 50);
      const newAlpha = newColor.alpha();
      if (newAlpha !== undefined && !isNaN(newAlpha)) {
        setAlpha(newAlpha * 100);
      }
    } catch {
      // Invalid color string, ignore
    }
  }, [setHue, setSaturation, setLightness, setAlpha]);

  // Memoized handlers
  const handleHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateColorFromString(e.target.value);
  }, [updateColorFromString]);

  const handleCssChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateColorFromString(e.target.value);
  }, [updateColorFromString]);

  const handleRgbChange = useCallback((index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseInt(e.target.value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > 255) return;
    
    try {
      const newRgb = [...rgb];
      newRgb[index] = numValue;
      const newColor = Color.rgb(newRgb[0], newRgb[1], newRgb[2], alpha / 100);
      const newHsl = newColor.hsl().array();
      setHue(newHsl[0] || 0);
      setSaturation(newHsl[1] || 0);
      setLightness(newHsl[2] || 50);
    } catch {
      // Invalid RGB, ignore
    }
  }, [rgb, alpha, setHue, setSaturation, setLightness]);

  const handleHslChange = useCallback((index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseFloat(e.target.value);
    if (isNaN(numValue)) return;
    
    const ranges = [
      [0, 360],   // Hue
      [0, 100],   // Saturation
      [0, 100],   // Lightness
    ];
    const [min, max] = ranges[index] || [0, 100];
    
    if (numValue >= min && numValue <= max) {
      if (index === 0) setHue(numValue);
      else if (index === 1) setSaturation(numValue);
      else if (index === 2) setLightness(numValue);
    }
  }, [setHue, setSaturation, setLightness]);

  // CSS format string
  const cssValue = useMemo(() => `rgba(${rgb.join(', ')}, ${alpha}%)`, [rgb, alpha]);

  if (mode === 'hex') {
    return (
      <div
        className={cn(
          '-space-x-px relative flex w-full items-center rounded-md shadow-sm',
          className
        )}
        {...(props as any)}
      >
        <Input
          className="h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none"
          type="text"
          value={hex}
          onChange={handleHexChange}
        />
        <PercentageInput value={alpha} />
      </div>
    );
  }

  if (mode === 'rgb') {
    return (
      <div
        className={cn(
          '-space-x-px flex items-center rounded-md shadow-sm',
          className
        )}
        {...(props as any)}
      >
        {rgb.map((value, index) => (
          <Input
            className={cn(
              'h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none',
              index && 'rounded-l-none',
              className
            )}
            key={index}
            type="text"
            value={value}
            onChange={handleRgbChange(index)}
          />
        ))}
        <PercentageInput value={alpha} />
      </div>
    );
  }

  if (mode === 'css') {
    return (
      <div className={cn('w-full rounded-md shadow-sm', className)} {...(props as any)}>
        <Input
          className="h-8 w-full bg-secondary px-2 text-xs shadow-none"
          type="text"
          value={cssValue}
          onChange={handleCssChange}
          {...(props as any)}
        />
      </div>
    );
  }

  if (mode === 'hsl') {
    return (
      <div
        className={cn(
          '-space-x-px flex items-center rounded-md shadow-sm',
          className
        )}
        {...(props as any)}
      >
        {hsl.map((value, index) => (
          <Input
            className={cn(
              'h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none',
              index && 'rounded-l-none',
              className
            )}
            key={index}
            type="text"
            value={value}
            onChange={handleHslChange(index)}
          />
        ))}
        <PercentageInput value={alpha} />
      </div>
    );
  }

  return null;
});

ColorPickerFormat.displayName = 'ColorPickerFormat';
