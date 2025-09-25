#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'fs';
import { join, extname, dirname } from 'path';

console.log('🏗️  Building TypeScript files...');

// Function to recursively find all .ts files
function findTsFiles(dir) {
  const files = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (extname(item) === '.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

// Function to create a temporary copy with fixed imports
function preprocessTsFiles() {
  console.log('🔧 Preprocessing TypeScript files...');

  // Create temp directory
  mkdirSync('./temp', { recursive: true });

  // Copy and fix source files
  const sourceFiles = [
    ...findTsFiles('./src'),
    ...findTsFiles('./api'),
    './schemas.ts'
  ].filter(file => !file.includes('node_modules'));

  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf8');

    // Replace .ts extensions with .js in import statements
    const fixedContent = content.replace(
      /from ['"]([^'"]*?)\.ts['"];/g,
      'from "$1.js";'
    );

    // Create temp file path
    const tempFile = file.replace('./', './temp/');
    const tempDir = dirname(tempFile);
    mkdirSync(tempDir, { recursive: true });

    writeFileSync(tempFile, fixedContent, 'utf8');
  }

  console.log(`📝 Preprocessed ${sourceFiles.length} files`);
}

// Preprocess files
preprocessTsFiles();

// Update tsconfig to use temp files
const tempTsConfig = {
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "outDir": "./dist",
    "rootDir": "./temp",
    "baseUrl": "./temp"
  },
  "include": ["temp/**/*.ts"],
  "exclude": ["node_modules", "dist"]
};

writeFileSync('./tsconfig.temp.json', JSON.stringify(tempTsConfig, null, 2));

// First, compile TypeScript using temp config
try {
  execSync('tsc -p tsconfig.temp.json', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation complete');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}

// Function to recursively find all .js files in dist directory
function findJsFiles(dir) {
  const files = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findJsFiles(fullPath));
    } else if (extname(item) === '.js') {
      files.push(fullPath);
    }
  }

  return files;
}

// Function to fix import paths in a file
function fixImportPaths(filePath) {
  const content = readFileSync(filePath, 'utf8');

  // Replace .ts extensions with .js in import statements
  const fixedContent = content.replace(
    /from ['"]([^'"]*?)\.ts['"];/g,
    'from "$1.js";'
  );

  // Also fix dynamic imports
  const finalContent = fixedContent.replace(
    /import\(['"]([^'"]*?)\.ts['"]\)/g,
    'import("$1.js")'
  );

  if (content !== finalContent) {
    writeFileSync(filePath, finalContent, 'utf8');
    console.log(`📝 Fixed imports in ${filePath}`);
  }
}

console.log('🔧 Fixing import paths...');

// Find and fix all .js files in dist directory
try {
  const jsFiles = findJsFiles('./dist');

  for (const file of jsFiles) {
    fixImportPaths(file);
  }

  console.log(`✅ Fixed import paths in ${jsFiles.length} files`);

  // Cleanup temp files
  console.log('🧹 Cleaning up...');
  execSync('rm -rf temp tsconfig.temp.json', { stdio: 'inherit' });

  console.log('🎉 Build complete!');
} catch (error) {
  console.error('❌ Error fixing import paths:', error);

  // Cleanup on error
  try {
    execSync('rm -rf temp tsconfig.temp.json', { stdio: 'inherit' });
  } catch {}

  process.exit(1);
}