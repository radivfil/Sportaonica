import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page is rendered on demand (live seat counts), so no incremental cache is needed.
export default defineCloudflareConfig({});
