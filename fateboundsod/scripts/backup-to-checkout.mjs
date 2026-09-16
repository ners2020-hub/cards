// Back up source into the named existing checkout, preserving its Git history.
// This script never deletes source files or copies credentials/generated folders.
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const source=process.cwd(),target=resolve(source,'../cards-github/fateboundsod');
const excluded=new Set(['.git','node_modules','dist','dist-ssr','outputs','.vscode','.temp','_shared']);
const manifest=[],skipped=[];
async function copy(relative=''){
 for(const entry of await readdir(join(source,relative),{withFileTypes:true})){
  const rel=join(relative,entry.name);
  if(excluded.has(entry.name)||entry.name === '.npmrc'||entry.name.startsWith('.env')||/\.(zip|key|pem|log)$/i.test(entry.name))continue;
  if(entry.isDirectory()){await copy(rel);continue;}
  try{const bytes=await readFile(join(source,rel));await mkdir(resolve(target,relative),{recursive:true});await writeFile(join(target,rel),bytes);manifest.push({path:rel.replaceAll('\\','/'),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});}
  catch(e){skipped.push({path:rel,error:e.code});}
 }
}
await copy();await mkdir('outputs',{recursive:true});await writeFile('outputs/github-backup-manifest.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify({copied:manifest.length,bytes:manifest.reduce((n,f)=>n+f.bytes,0),skipped},null,2));
