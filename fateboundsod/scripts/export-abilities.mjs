import { writeFile } from 'node:fs/promises';
import { cards, DEFAULT_RULES } from '../src/practice/catalog.js';
import { definitions, interpretations } from '../src/practice/cardAbilities.js';
import { BALANCE_VERSION } from '../src/practice/balancePatch.js';
let md = '# Fatebound card abilities\n\n187 cards: 84 creatures, 27 controllers, 52 spells, and 24 artifacts.\n\nPrinted text comes from the supplied card database. Executable rules are in `src/practice/cardAbilities.js`, with shared mechanics in `rulesEngine.js`. This inventory is also searchable through **Card library** in the app.\n\n## Rule defaults\n\nThe user approved zero-shard unpriced activated abilities usable once per turn, Nature = Earth, Charge = Haste, and rounding fractional damage up. Other timing interpretations below are provisional and can be adjusted to the canonical rulebook.\n\n';
md = md.replace('Printed text comes from the supplied card database.', `Playtest balance version ${BALANCE_VERSION}. Printed text comes from the supplied database with the balance patch applied.`);
md += DEFAULT_RULES.map(r => '- '+r).join('\n')+'\n\n## Known interpretation limits\n\n';
md += Object.entries(interpretations).map(([name,note])=>`- **${name}:** ${note}`).join('\n');
md += '\n\nThese are executable solo-preview rules, not a claim that every pairwise card interaction has been exhaustively verified. Online matches still use the original database-driven engine.\n';
for(const element of [...new Set(cards.map(c=>c.element))]) {
 md += `\n## ${element[0].toUpperCase()+element.slice(1)}\n\n`;
 for(const card of cards.filter(c=>c.element===element)) {
  const rules = definitions[card.name] || {};
  md += `### ${card.name}\n\n- Code: ${card.id}\n- Type: ${card.card_type}; cost: ${card.cost} shards${card.ap!==undefined?`; AP: ${card.ap}; CH: ${card.ch}`:''}\n`;
  if(card.keywords?.length) md += `- Printed keywords: ${card.keywords.join(', ')}\n`;
  if(rules.persistent) md += '- Solo implementation: persistent spell; remains in a spell slot.\n';
  if(rules.equip) md += `- Equipment target in solo play: ${rules.equip === true ? 'allied creature or controller' : rules.equip}.\n`;
  if(card.card_type === 'artifact' && !rules.equip) md += '- Solo implementation: field artifact; no equipment target required.\n';
  md += `\n**Printed effect**\n\n${card.description}\n`;
  if(rules.active?.length) {
   md += '\n**Activated abilities in the current game**\n\n';
   for(const ability of rules.active) md += `- **${ability.label}:** ${ability.cost || 0} shards${ability.ch ? ` + ${ability.ch} controller CH` : ''}; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.\n`;
  }
  if(interpretations[card.name]) md += `\n**Preview interpretation:** ${interpretations[card.name]}\n`;
 }
}
await writeFile(new URL('../CARD_ABILITIES.md',import.meta.url),md);
console.log('Wrote CARD_ABILITIES.md with all 187 cards.');
