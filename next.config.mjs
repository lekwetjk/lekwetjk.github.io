function resolveBasePath() {
  const explicitBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH;
  if (explicitBasePath === undefined) {
    return "";
  }

  return explicitBasePath.replace(/\/$/, "");
}

const basePath = resolveBasePath();

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;