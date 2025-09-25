import { readFile as rf } from "fs/promises";
import { resolve } from "path";

export async function readFile(filePath: string): Promise<string> {
  try {
    // Handle different execution contexts (local vs serverless)
    let resolvedPath = filePath;

    if (filePath.startsWith("./public/")) {
      // For serverless functions, resolve relative to the project root
      const fileName = filePath.replace("./public/", "");
      resolvedPath = resolve(process.cwd(), "public", fileName);
    }

    return await rf(resolvedPath, "utf-8");
  } catch (error) {
    console.error(`Error reading file ${filePath}`, error);
    throw error;
  }
}
