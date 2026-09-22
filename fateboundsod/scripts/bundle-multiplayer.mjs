import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
const modules = ['multiplayer', 'rulesEngine', 'catalog', 'cardDatabase', 'cardAbilities', 'balancePatch', 'aiStrategy', 'soloRewards', 'deathbound'];
await mkdir('supabase/functions/_shared/rules', { recursive: true });
for (const name of modules) await copyFile(`src/practice/${name}.js`, `supabase/functions/_shared/rules/${name}.js`);
if (process.argv.includes('--json')) {
  await mkdir('outputs', { recursive: true });
  const files = await Promise.all(modules.map(async name => ({ name: `_shared/rules/${name}.js`, content: await readFile(`src/practice/${name}.js`, 'utf8') })));
  files.push({ name: 'multiplayer/index.ts', content: await readFile('supabase/functions/multiplayer/index.ts', 'utf8') });
  await writeFile('outputs/multiplayer-deploy.json', JSON.stringify(files));
  files[files.length - 1] = { name: 'rewards/index.ts', content: await readFile('supabase/functions/rewards/index.ts', 'utf8') };
  await writeFile('outputs/rewards-deploy.json', JSON.stringify(files));
}
console.log('Bundled canonical local rules for Supabase.');
