export type CmsSafetyEnvironment = {
  CMS_READ_ONLY?: string;
  CMS_TRASH_ENABLED?: string;
  CMS_HISTORY_ENABLED?: string;
  CMS_MEDIA_ENABLED?: string;
  CMS_DRAFTS_ENABLED?: string;
  CMS_ARCHIVE_ENABLED?: string;
};

export function cmsFlag(value: string | undefined) {
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  throw new Error("Nieprawidłowa flaga CMS: wymagane true albo false.");
}

export function cmsWriteBlocked(request: Request, environment: CmsSafetyEnvironment) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  const { pathname } = new URL(request.url);
  const protectedPaths = ["/api/admin", "/api/wstawienia", "/admin"];
  return protectedPaths.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
    && cmsFlag(environment.CMS_READ_ONLY);
}
