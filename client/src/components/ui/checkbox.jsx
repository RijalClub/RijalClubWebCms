import { forwardRef } from 'react'
import { cn } from '../../lib/utils'
import { Check } from 'lucide-react'

const Checkbox = forwardRef(({ className, checked, onChange, disabled, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="checkbox"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange?.(!checked)}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-input shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
      checked && 'bg-primary border-primary text-primary-foreground',
      className,
    )}
    {...props}
  >
    {checked && <Check className="h-3 w-3 mx-auto" />}
  </button>
))
Checkbox.displayName = 'Checkbox'

export { Checkbox }
