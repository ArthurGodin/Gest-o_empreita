/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Link público — sem Referer pra impedir leak do share_token
        source: "/q/:token*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // PDF público — não armazena em caches compartilhados (contém PII)
        source: "/q/:token/pdf",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
