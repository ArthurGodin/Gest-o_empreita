export function shouldBypassAuthRefresh(pathname: string) {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}
