// Deletes the local JSON demo store; it is re-seeded on the next request.
import { rmSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(process.env.DATA_DIR || ".data");
rmSync(path.join(dir, "db.json"), { force: true });
rmSync(path.join(dir, "db.lock"), { force: true });
console.log(`Demo data reset (${dir}). Restart is not required.`);
