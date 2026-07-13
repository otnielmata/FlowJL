import type { AppUser, PageConfig } from "@/types/flow";

export function userCanAccessPage(user: AppUser, page: PageConfig) {
  return page.allowedRoles.includes(user.role);
}
