// Résout les imports sans extension (convention du bundler) pour pouvoir exécuter
// le vrai code source sous Node, sans le recopier ni l'adapter.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[mc]?[jt]sx?$/.test(specifier)) {
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      if (existsSync(base + ext)) return next(pathToFileURL(base + ext).href, context);
    }
  }
  return next(specifier, context);
}
