// What the code says once its comments are gone: factory's runtime names and texts, which names.test.ts keeps clear of
// "cubefarm" and "floor". esbuild parses the source (JSX text and regexes included) and drops the comments.
import { transformSync, type Loader } from 'esbuild';

const LOADERS: Record<string, Loader> = { '.ts': 'ts', '.tsx': 'tsx', '.js': 'js', '.mjs': 'js', '.cjs': 'js' };

/** Whether `file` is code names.test.ts reads. */
export const isCode = (file: string) => Object.keys(LOADERS).some((ext) => file.endsWith(ext)) && !/\.test\.tsx?$/.test(file) && !file.endsWith('.d.mts');

/**
 * The lines of `file`'s code, comments aside, that match `word`. JSX stays JSX, so the page copy counts too. esbuild
 * keeps a comment inside an expression on a line of its own, so those lines are dropped here.
 */
export function codeLines(file: string, src: string, word: RegExp): string[] {
  const loader = LOADERS[Object.keys(LOADERS).find((ext) => file.endsWith(ext)) ?? '.ts'];
  const { code } = transformSync(src, { loader, jsx: 'preserve', legalComments: 'none', target: 'esnext', format: 'esm' });
  return code
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !/^(\/\/|\/\*|\*)/.test(l) && word.test(l));
}
