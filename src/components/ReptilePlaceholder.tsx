// Shown in place of a reptile photo when none is set. The logo is transparent, so its
// negative-space pattern takes on whatever background the container has.
export function ReptilePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full h-full flex items-center justify-center select-none ${className}`}>
      <img src="/logo-512-v20260927.png" alt="" draggable={false} className="w-3/5 h-3/5 object-contain" />
    </div>
  )
}
