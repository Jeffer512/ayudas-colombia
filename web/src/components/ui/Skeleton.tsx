interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`.trim()} />
}

export function SkeletonText({ lines = 2, className = '' }: { lines?: number; className?: string }) {
  return (
    <span className={`block space-y-2 ${className}`.trim()}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </span>
  )
}