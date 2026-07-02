export const PETHUB_ADMIN_EMAIL = 'hentzefranz92@gmail.com';

export function isPetHubAdminUser(email?: string | null): boolean {
  return email?.toLowerCase() === PETHUB_ADMIN_EMAIL.toLowerCase();
}
