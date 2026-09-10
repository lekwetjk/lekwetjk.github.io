import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json" with { type: "json" };
import { sites } from "./build/sites-vite-plugin.ts";

const SITE_CREATOR_DATABASE_NAME =
  process.env.CLOUDFLARE_D1_DATABASE?.trim() || "site-creator-d1";

const { d1 = "DB", r2 } = hostingConfig as { d1?: string; r2?: string };

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export function getD1DatabaseConfig(
  databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID,
  binding = d1,
) {
  const normalizedDatabaseId = databaseId?.trim();

  if (!binding || !normalizedDatabaseId) {
    return [];
  }

  return [
    {
      binding,
      database_name: SITE_CREATOR_DATABASE_NAME,
      database_id: normalizedDatabaseId,
    },
  ];
}

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: getD1DatabaseConfig(),
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

// Keep Wrangler and Miniflare state project-local. These are non-secret tool
// settings; application environment belongs in ignored `.env*` files.
process.env.WRANGLER_WRITE_LOGS ??= "false";
process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

// Wrangler snapshots its log path while the Cloudflare plugin is imported.
const { cloudflare } = await import("@cloudflare/vite-plugin");

export default defineConfig(({ command }) => {
  const isDevelopment = command === "serve";

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    build: {
      rollupOptions: {
        onwarn(warning: any, defaultHandler: (warning: any) => void) {
          if (warning?.code === "INEFFECTIVE_DYNAMIC_IMPORT") {
            return;
          }
          defaultHandler(warning);
        },
      },
    },
    plugins: [
      vinext(),
      sites(),
      ...(isDevelopment
        ? []
        : [
            cloudflare({
              viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
              config: localBindingConfig,
            }),
          ]),
    ],
  };
});
