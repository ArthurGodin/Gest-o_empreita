export function buildCspReportOnly({ development = false } = {}) {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    ...(development ? ["'unsafe-eval'"] : []),
    "https://connect.facebook.net",
    "https://va.vercel-scripts.com",
  ];
  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://vitals.vercel-insights.com",
    "https://va.vercel-scripts.com",
    "https://connect.facebook.net",
    "https://www.facebook.com",
  ];

  if (development) {
    connectSources.push("http://localhost:*", "ws://localhost:*");
  }

  const directives = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "script-src": scriptSources,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://*.supabase.co",
      "https://www.facebook.com",
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": connectSources,
    "frame-src": ["'none'"],
    "media-src": ["'self'", "blob:", "https://*.supabase.co"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
  };

  return Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");
}
