"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'> {
  onValueChange?: (value: number[]) => void
  defaultValue?: number[]
  value?: number[]
  min?: number
  max?: number
  step?: number
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, onValueChange, defaultValue, value, min = 0, max = 100, step = 1, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value?.[0] ?? defaultValue?.[0] ?? 0)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value)
      setInternalValue(newValue)
      if (onValueChange) {
        onValueChange([newValue])
      }
    }

    // Calculate percentage for the track background
    const percentage = ((internalValue - min) / (max - min)) * 100

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center py-4", className)}>
        <input
          type="range"
          ref={ref}
          min={min}
          max={max}
          step={step}
          value={value?.[0] ?? internalValue}
          onChange={handleChange}
          className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          style={{
            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${percentage}%, var(--color-secondary) ${percentage}%, var(--color-secondary) 100%)`
          }}
          {...props}
        />
        <style jsx>{`
          input[type='range']::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            background: white;
            border: 2px solid var(--color-primary);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            transition: transform 0.1s ease;
          }
          input[type='range']::-webkit-slider-thumb:hover {
            transform: scale(1.1);
          }
          input[type='range']::-moz-range-thumb {
            width: 18px;
            height: 18px;
            background: white;
            border: 2px solid var(--color-primary);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
        `}</style>
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
