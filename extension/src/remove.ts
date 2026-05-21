import * as fs from "fs";
import * as path from "path";
import type { RemovableKind } from "./types";

export function removeInstalledItem(
  filePath: string,
  kind: RemovableKind
): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  if (kind === "skills") {
    const skillDir = path.dirname(filePath);
    fs.rmSync(skillDir, { recursive: true, force: true });
    return;
  }

  fs.unlinkSync(filePath);
}
