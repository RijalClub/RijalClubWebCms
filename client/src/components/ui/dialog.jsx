import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'
import { X } from 'lucide-react'

function DialogOverlay({ className, onClick, ...props }) {
  return (
    <div
      className={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0', className)}
      onClick={onClick}
      {...props}
    />
  )
}

function DialogContent({ className, children, onClose, title, description, ...props }) {
  const ref = useRef(null)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <DialogOverlay onClick={onClose} />
      <div
        ref={ref}
        className={cn(
          'relative z-50 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg animate-in fade-in-0 zoom-in-95',
          className,
        )}
        {...props}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
            {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function DialogFooter({ className, ...props }) {
  return <div className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
}

export { DialogContent, DialogOverlay, DialogFooter }
