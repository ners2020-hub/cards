const meanings = {
 Frozen:'Cannot attack.', Paralyzed:'Cannot attack.', Bound:'Cannot attack or use activated abilities.',
 Silenced:'Printed traits, passive effects and activated abilities are disabled.',
 'Passive disabled':'Printed traits and passive effects are disabled. Activated abilities remain available.',
 'Double attack':'Can attack twice this turn, subject to normal attack restrictions.',
 'No healing':'Cannot regain health from healing effects.',
 'Nature blade':'Draw a card when this card destroys a creature in combat.',
 Surreal:'After this card deals combat damage, its controller may play an Electric artifact from hand for free.',
 'Light Bind':'Marks this card for Light Spirit’s stat-copy effect. The separate Bound effect prevents attacks and activated abilities.',
 'Lightning chains':'Attack is reduced by the number of Electric allies controlled by the source’s owner. Volt-Howler deals double combat damage to this card.',
};
const traits = {
 haste:'Can attack on the turn it is summoned; the turn 1–2 attack restriction still applies.',
 stealth:'An attacking creature may bypass shields and other creatures to attack a controller. Other target immunities still apply.',
 guardian:'Enemies must attack this shield creature before other creatures or controllers, unless their attacking creature has Stealth.',
 cannotAttack:'Cannot attack.', cannotDefend:'Does not enforce shield priority. It still protects its controllers while on the field.',
 freezeImmune:'Cannot receive new Frozen effects.', spellImmune:'Immune to spell damage and spell destruction, and cannot be selected by enemy spells.',
 spellUntargetable:'Cannot be selected as a target by enemy spells.', invulnerable:'Cannot be attacked and prevents damage; direct health loss still applies.',
 untargetable:'Cannot be selected by enemy targeting effects.', noRecoil:'Takes no retaliation damage when attacking.',
};
export function describeStatus(name, status = {}) {
 const parts=[];
 if(meanings[name])parts.push(meanings[name]);
 if(status.ap)parts.push(`${status.ap>0?'+':''}${status.ap} attack (AP). Attack cannot fall below 0.`);
 if(status.ch)parts.push(`${status.ch>0?'+':''}${status.ch} maximum health (CH).`);
 if(status.trait)parts.push(traits[status.trait]||`Grants the ${status.trait} trait.`);
 if(status.dot)parts.push(`Loses ${status.dot} health at each of its controller’s later end phases while this effect remains.`);
 if(status.destroy)parts.push('Destroyed when this effect expires.');
 if(status.explode)parts.push(`When this effect expires, deal ${status.explode} damage to all other creatures.`);
 if(!parts.length)parts.push('An active card effect. Check the source card’s rules for its specific interaction.');
 const duration=status.source?'Lasts while the source card remains on the field.':status.end!==undefined?'Expires at the end of the turn in which it was applied.':status.remaining!==undefined?`${status.remaining} of this card’s controller’s later end phase${status.remaining===1?'':'s'} remaining; the application turn does not count.`:'No timed expiry; lasts until removed or the card leaves play.';
 return {name,description:parts.join(' '),duration};
}
