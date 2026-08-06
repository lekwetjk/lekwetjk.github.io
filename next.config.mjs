const isProduction = process.env.NODE_ENV === "production";

function resolveBasePath() {
  const explicitBasePath =
    process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH;
  if (explicitBasePath !== undefined) {
    return explicitBasePath.replace(/\/$/, "");
  }

  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
  const owner = process.env.GITHUB_REPOSITORY?.split("/")[0] ?? "";
  const isUserSiteRepo = repository.toLowerCase() === `${owner.toLowerCase()}.github.io`;

  if (!isProduction || !repository || isUserSiteRepo) {
    return "";
  }

  return `/${repository}`;
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