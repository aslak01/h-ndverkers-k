import { readFile as rf } from "fs/promises";

export async function readFile(filePath: string): Promise<string> {
  try {
    return await rf(filePath, "utf-8");
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

