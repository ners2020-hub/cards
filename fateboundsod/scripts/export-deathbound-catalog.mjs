import { writeFileSync } from 'node:fs';
import { deathboundCards } from '../src/practice/deathbound.js';
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const rows = Object.values(deathboundCards).filter(c => !c.token).map(c => `(${[c.id,c.name,c.element,c.card_type].map(quote).join(',')})`);
writeFileSync('supabase/deathbound-catalog.sql', `-- Add the 20 collectible Deathbound designs; Risen is effect-only.\n-- Existing catalog entries, rarities, balances and owned cards are preserved.\ninsert into public.store_catalog(id,name,element,card_type) values\n${rows.join(',\n')}\non conflict(id) do nothing;\n`);
