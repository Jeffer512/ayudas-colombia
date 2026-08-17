export function isValidPhone(value: string): boolean {
  const v = value.trim()
  if (v === '') return true
  if (!/^[0-9+()\-. ]+$/.test(v)) return false
  const digits = (v.match(/\d/g) ?? []).length
  return digits >= 7 && digits <= 15
}
