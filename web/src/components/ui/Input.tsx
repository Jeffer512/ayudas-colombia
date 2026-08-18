import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'

const controlBase =
  'h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle transition duration-fast focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlBase} ${className}`.trim()} {...props} />
}

export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${controlBase} ${className}`.trim()} {...props}>
      {children}
    </select>
  )
}

export default Input