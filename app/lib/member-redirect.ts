const DEFAULT_MEMBER_REDIRECT = "/member/profil";

export function safeMemberRedirect(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return DEFAULT_MEMBER_REDIRECT;
  }
  return value;
}