export function isAdminToken(token: string | undefined, adminToken: string): boolean {
  return Boolean(adminToken && token && token === adminToken)
}