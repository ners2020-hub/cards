import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Save, Trash2, BookOpen, ArrowLeft, Flame, Heart, Wind, Sun, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import GameCard from '@/components/tcg/GameCard';
import { BLOOD_DECK, FIRE_DECK, WIND_DECK, LIGHT_DECK, SHADOW_DECK, ELECTRIC_DECK, CRYO_DECK, EARTH_DECK, WATER_DECK } from './TCG';

// Universal Cards
const UNIVERSAL_CARDS = [
  { id: 'UN0001', name: 'Elemental Convergence', card_type: 'spell', element: 'universal', cost: 6, description: 'The Great Alteration: Change all enemy card attributes to one chosen element until this card leaves play. When destroyed/removed, attributes revert immediately.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/c53fb0927_02xElementalConvergence.png' },
  { id: 'UN0002', name: 'Creature Recall', card_type: 'spell', element: 'universal', cost: 3, description: 'Return 1 Creature or Fallen Controller (as a creature) from discard pile to your hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/9c7f7633e_02xCreatureRecall.png' },
];

const OLD_BLOOD_DECK = [
  { id: 'ctrl_1', name: 'RenLarKu', card_type: 'controller', element: 'blood', cost: 0, ch: 12, ap: 1, description: 'Passive: Pay 1 CH to draw 1 card. Active: Target 1 Creature; it gains +1 AP until the End Phase.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a121bd872_RenLarKu.png' },
  { id: 'ctrl_2', name: 'Blood Weaver', card_type: 'controller', element: 'blood', cost: 4, ch: 12, ap: 1, description: 'Passive: Sacrifice 2 creatures to search Hand/Deck/Discard for a Controller and play it. Active: Pay 2 CH to prevent 1 enemy from attacking.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e05172934_Blood_Weaver.png' },
  { id: 'ctrl_3', name: 'Blood Lord', card_type: 'controller', element: 'blood', cost: 6, ch: 12, ap: 1, description: 'Passive: If field is empty, steal 1 CH from enemy Controller. Active: Deal 2 damage to all enemy creatures.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a6fcf6837_Blood_Lord.png' },
  { id: 'c_1', name: 'Blood General', card_type: 'creature', element: 'blood', cost: 5, ap: 5, ch: 8, description: 'All other Blood-type creatures you control gain +1 AP.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/fe595b3cc_Blood_General.png' },
  { id: 'c_2', name: 'Crimson Knight', card_type: 'creature', element: 'blood', cost: 4, ap: 4, ch: 5, description: 'This card cannot be sacrificed to satisfy the requirements of other Spells or Controller abilities.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/8b41c8647_Crimson_Knight.png' },
  { id: 'c_3', name: 'Blood Knight', card_type: 'creature', element: 'blood', cost: 3, ap: 3, ch: 6, description: 'Gains +2 CH as long as your active Controller has its maximum (12) CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/148c975f3_Blood_Knight.png' },
  { id: 'c_4', name: 'Redeemed Knight', card_type: 'creature', element: 'blood', cost: 3, ap: 2, ch: 8, description: 'On Death: Heal your active Controller for 3 CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5e6802ca5_Redeemed_Knight.png' },
  { id: 'c_5', name: 'Reaper', card_type: 'creature', element: 'blood', cost: 4, ap: 5, ch: 2, description: 'If this card destroys an enemy in combat, it does not Exhaust and can still block during the opponent\'s turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4f94166d0_Reaper.png' },
  { id: 'c_6', name: 'Blood Witch', card_type: 'creature', element: 'blood', cost: 2, ap: 2, ch: 3, description: 'On Play: Select 1 Blood Spell from your discard pile and add it to your hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6f8c17664_Blood_Witch.png' },
  { id: 'c_7', name: 'Blood Swarm', card_type: 'creature', element: 'blood', cost: 2, ap: 1, ch: 2, description: 'On Play: Pay 1 CH from Controller to summon 2 "Swarm Tokens" (1 AP / 1 CH).', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/32614f4cb_Blood_Swarm.png' },
  { id: 'c_8', name: 'Ren', card_type: 'creature', element: 'blood', cost: 2, ap: 2, ch: 4, description: 'If Katana of Fate is equipped, this gains the current AP of RenLarKu.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b1e91c6ff_Ren.png' },
  { id: 's_1', name: 'Blood Bond', card_type: 'spell', element: 'blood', cost: 3, description: 'Req: Blood Weaver as Controller. Take control of 1 enemy creature. It can be used for sacrifices.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/549687069_Blood_Bond.png' },
  { id: 's_2', name: 'Blood Ritual', card_type: 'spell', element: 'blood', cost: 0, description: 'Sacrifice 1 creature you control to gain 3 temporary Shards to use this turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/287298fe4_Blood_Ritual.png' },
  { id: 's_3', name: 'Blood Magic', card_type: 'spell', element: 'blood', cost: 1, description: 'Target creature gains +3 AP. At the End Phase, that creature is destroyed.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/48bf39802_Blood_Magic.png' },
  { id: 's_4', name: 'Soul Siphon', card_type: 'spell', element: 'blood', cost: 2, description: 'Deal 2 damage to a creature. If Controller is Blood-type, heal Controller for 2 CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/46768ea9e_Soul_Siphon.png' },
  { id: 's_5', name: 'Lifeblood', card_type: 'spell', element: 'blood', cost: 4, description: 'Sacrifice all creatures. Add their combined total CH to one of your Controllers as permanent Bonus Health.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d69624f7e_Lifeblood.png' },
  { id: 's_6', name: 'Mist of Fate', card_type: 'spell', element: 'blood', cost: 3, description: 'Destroy 1 enemy creature. If they have none, steal 2 CH. (Non-Blood: Flip a coin).', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/49780ed7f_Mist_of_Fate.png' },
  { id: 's_7', name: 'Creature Recall', card_type: 'spell', element: 'blood', cost: 3, description: 'Return 1 Creature or 1 Fallen Controller (as a creature) from discard pile to your hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/c45a227eb_Creature_Recall.png' },
  { id: 's_8', name: 'Zombie\'s Day', card_type: 'spell', element: 'blood', cost: 3, description: 'Grave March: This turn, any creature card that was Recalled from the battlefield to its owner\'s hand earlier in the game may be played from hand for 0 cost. Creatures played this way enter the battlefield Zombified.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/01171042a_Blood_Nova.png' },
  { id: 'a_1', name: 'Katana of Fate', card_type: 'artifact', element: 'blood', cost: 2, description: 'Attached card gains +1 AP (+2 if Blood). If on General or Ren, they gain RenLarKu\'s current AP.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/1cca5432b_Katana_of_Fate.png' },
  { id: 'a_2', name: 'The Generals Armor', card_type: 'artifact', element: 'blood', cost: 3, description: 'The equipped card cannot be destroyed by Spell effects. Only combat damage can destroy it.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/7a81e65da_The_Generals_Armor.png' },
  { id: 'a_3', name: 'Blood Pendant', card_type: 'artifact', element: 'blood', cost: 2, description: 'Whenever the equipped card deals damage, gain 1 extra Shard during your next Energy Phase.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/98f11f3d4_Blood_Pendant.png' },
  { id: 'a_4', name: 'Vampiric Destiny', card_type: 'artifact', element: 'blood', cost: 3, description: 'Blood Claim: When played, add 1 Swarm creature from deck/discard to hand. Life Imprint: When equipped, add equipped creature\'s base CH to a creature/Controller. Fate Severed: When equipped creature is destroyed/sacrificed, mark it. Undying Return: At start of next turn, return marked creature to battlefield or hand.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/01171042a_Blood_Nova.png' },
];

// Fire Deck
const OLD_FIRE_DECK = [
  { id: 'ctrl_1', name: 'Draco Alec', card_type: 'controller', element: 'fire', cost: 4, ch: 12, ap: 1, description: 'Passive: All Fire-type creatures gain +1 AP. Active: Target 1 Fire creature; it can attack twice this turn, but is destroyed at the End Phase.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/7039ec342_01xDracoAlec.png' },
  { id: 'ctrl_2', name: 'Flame Emperor', card_type: 'controller', element: 'fire', cost: 5, ch: 12, ap: 1, description: 'Passive: Spend 2 Shards to draw 1 card. Active: Deal 2 damage directly to an enemy Controller.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/8d033176d_01xFlameEmperor.png' },
  { id: 'ctrl_3', name: 'Supreme Fire Spirit', card_type: 'controller', element: 'fire', cost: 6, ch: 12, ap: 1, description: 'Passive: All Fire creatures gain +1 AP. Active: Pay 3 Shards to destroy 1 enemy creature with 4 CH or less.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/9332100b0_01xSupremeFireSpirit.png' },
  { id: 'c_1', name: 'Draco', card_type: 'creature', element: 'fire', cost: 3, ap: 4, ch: 6, description: 'Hero: While on field, Fire Spells cost 1 less Shard. Synergy: If Draco Alec is Controller, Draco gains +2 AP.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/98dca0339_02xDraco.png' },
  { id: 'c_2', name: 'Emperors Fire Dragon', card_type: 'creature', element: 'fire', cost: 6, ap: 7, ch: 9, description: 'Boss: If Flame Emperor is active, this can attack twice. Active: Pay 2 Shards to deal 3 damage to an enemy creature.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/0d654e705_02xEmperorsFireDragon.png' },
  { id: 'c_3', name: 'Flame Dragon', card_type: 'creature', element: 'fire', cost: 5, ap: 6, ch: 8, description: 'Flier: This card can bypass "Swarm" tokens and attack a Controller directly if tokens are the only shields.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/265723fe9_02xFlameDragon.png' },
  { id: 'c_4', name: 'Fire Paladin', card_type: 'creature', element: 'fire', cost: 3, ap: 4, ch: 7, description: 'Holy Fire: When this card destroys an enemy creature, heal your active Controller for 2 CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ef908e822_02xFirePaladin.png' },
  { id: 'c_5', name: 'Flame Samurai', card_type: 'creature', element: 'fire', cost: 4, ap: 5, ch: 3, description: 'First Strike: When attacking a creature with lower AP, this card takes no recoil damage to its CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f644502a4_02xFlameSamurai.png' },
  { id: 'c_6', name: 'Fire Knight', card_type: 'creature', element: 'fire', cost: 3, ap: 3, ch: 4, description: 'Charge: This card can attack on the same turn it is summoned.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a5931f629_02xFireKnight.png' },
  { id: 'c_7', name: 'Flaming Sword Bearer', card_type: 'creature', element: 'fire', cost: 3, ap: 3, ch: 5, description: 'On Death: Search Deck or Discard for "Cursed Flame Sword" or "Katana of Fate" and add to hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/9ac76e93a_02xFlamingSwordBearer.png' },
  { id: 'c_8', name: 'Flame Guardian', card_type: 'creature', element: 'fire', cost: 3, ap: 1, ch: 10, description: 'The Wall: High CH shield; cannot attack. Protects your Controllers from direct strikes.', keywords: ['Guardian'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/979df27ae_02xFlameGuardian.png' },
  { id: 'c_9', name: 'Flame Wolf', card_type: 'creature', element: 'fire', cost: 2, ap: 2, ch: 2, description: 'Pack: If you play 1 Flame Wolf, you may play a second one from your hand for 0 Shards.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/708a0116b_02xFlameWolf.png' },
  { id: 'c_10', name: 'Fire Witch', card_type: 'creature', element: 'fire', cost: 2, ap: 2, ch: 4, description: 'Sizzle: When this card is played to the field, deal 1 damage to an enemy Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/c29e0ac20_02xFireWitch.png' },
  { id: 'c_11', name: 'Flare Witch', card_type: 'creature', element: 'fire', cost: 2, ap: 2, ch: 4, description: 'Sizzle: When this card is played to the field, deal 1 damage to an enemy Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/0644286d1_02xFlareWitch.png' },
  { id: 'c_12', name: 'Flame Warlock', card_type: 'creature', element: 'fire', cost: 3, ap: 3, ch: 3, description: 'Action: Sacrifice 1 of your own creatures to deal 3 damage to any enemy creature on the field.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/0ef3990ab_02xFlameWarlock.png' },
  { id: 's_1', name: 'Dracos Inferno', card_type: 'spell', element: 'fire', cost: 1, description: 'Req: Draco or Draco Alec on field. Deal 3 damage to all non-controllers. Bonus: If BOTH are on field, deal 5 damage and 2 damage to enemy Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f5408643a_02xDracosInferno.png' },
  { id: 's_2', name: 'Dracos Curse', card_type: 'spell', element: 'fire', cost: 3, description: 'Req: Draco Alec is Controller. Take control of 1 enemy creature. Trigger: If it is sacrificed or destroyed, Draco (Creature) can attack twice next turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e32926627_02xDracosCurse.png' },
  { id: 's_3', name: 'Enflamed', card_type: 'spell', element: 'fire', cost: 4, description: 'Spirit Bonus: If Supreme Fire Spirit is active, targeted creature explodes after 1 turn; deal its CH to player who owns that creature to their Controller. Standard: Destroy 1 enemy creature. No damage to Enemy controller', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/954ad10ed_02xEnflamed.png' },
  { id: 's_4', name: 'Creature Recall', card_type: 'spell', element: 'fire', cost: 3, description: 'Return a Creature or Fallen Controller (as a creature) from discard to hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/1467978ba_02xCreatureRecall.png' },
  { id: 'a_1', name: 'Dracos Slayer', card_type: 'artifact', element: 'fire', cost: 3, description: 'Draco Equip: Draco gains +3 AP. Destroy card after 2 turns. Standard Spell: If used as a Spell, destroy 1 enemy creature with 6 AP or higher.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/bca7d6b09_02xDracosSlayer.png' },
  { id: 'a_2', name: 'Cursed Flame Sword', card_type: 'artifact', element: 'fire', cost: 2, description: 'The Curse: Every attack deals 1 damage to your Controller. +3 AP to Creature this is equipped to. Draco Buff: If used by Draco, ignore self-damage for the first 2 turns.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/349eea026_02xCursedFlameSword.png' },
  { id: 'a_3', name: 'Flame Orb', card_type: 'artifact', element: 'fire', cost: 2, description: 'Overload: Double 1 Fire creatures AP. Meltdown: Destroy that creature at End Phase; it deals 2 damage to all other creatures.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b5102c3fb_02xFlameOrb.png' },
];

// Light Deck
const OLD_LIGHT_DECK = [
  { id: 'ctrl_1', name: 'Cosmic Sunlight Goddess', card_type: 'controller', element: 'light', cost: 6, ch: 12, ap: 1, description: 'Passive: All Light creatures gain +1 AP. Active (4 Shards): Opponent cannot play Artifacts for 2 turns.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/bf55ccf40_01xCosmicSunlightGoddess.png' },
  { id: 'ctrl_2', name: 'Perfect Light Being', card_type: 'controller', element: 'light', cost: 5, ch: 12, ap: 1, description: 'Passive: Light Spells cost 1 less (Min 1). Active (3 Shards): Target cannot attack/use abilities for 2 turns.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/82e22652e_01xPerfectLightBeing.png' },
  { id: 'ctrl_3', name: 'Light Priest', card_type: 'controller', element: 'light', cost: 4, ch: 12, ap: 1, description: 'Passive: Heal 1 CH to all Light creatures at turn start. Active (2 Shards): Heal any target for 3 CH.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/957784922_01xLightPriest.png' },
  { id: 'c_1', name: 'Michael', card_type: 'creature', element: 'light', cost: 6, ap: 9, ch: 9, description: 'Divine Descent: Cannot be summoned unless Divine Light was played this turn. Holy Fire: Targets lose all abilities and cannot heal.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/2e0db0cff_02xMichael.png' },
  { id: 'c_2', name: 'Light Dragon', card_type: 'creature', element: 'light', cost: 5, ap: 6, ch: 7, description: 'Radiant Breath: When attacking, deal 2 damage to all other enemy creatures.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/66e3bfd6f_02xLightDragon.png' },
  { id: 'c_3', name: 'Sun Golem', card_type: 'creature', element: 'light', cost: 5, ap: 2, ch: 10, description: 'Solid Light: Cannot attack. Reflects 50% of damage taken back to the attacker.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ecaeef15a_02xSunGolem.png' },
  { id: 'c_4', name: 'Sun Guardian', card_type: 'creature', element: 'light', cost: 4, ap: 4, ch: 8, description: 'Shield of Light: While active, your Controllers and Spells cannot be targeted by enemy Spells.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/dacb4c575_01xSunGuardian.png' },
  { id: 'c_5', name: 'Sun Commander', card_type: 'creature', element: 'light', cost: 4, ap: 5, ch: 5, description: 'Inspire (On Play): All Light creatures on the field gain +2 AP for this turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/227c54fe8_02xSunCommander.png' },
  { id: 'c_6', name: 'Sun Knight', card_type: 'creature', element: 'light', cost: 3, ap: 4, ch: 5, description: 'Guardian: Must be destroyed before the opponent can attack your Controller.', keywords: ['Guardian'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6669305e6_02xSunKnight.png' },
  { id: 'c_7', name: 'Radiant Witch', card_type: 'creature', element: 'light', cost: 3, ap: 3, ch: 4, description: 'Light Enchantment: Choose 1 creature; it gains "This card cannot be destroyed by Spells."', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b87554b94_02xRadiantWitch.png' },
  { id: 'c_8', name: 'Sun Mage', card_type: 'creature', element: 'light', cost: 3, ap: 3, ch: 3, description: 'Burning Blast: Spend 1 Shard to deal 2 damage to any target.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/bc6ecea56_02xSunMage.png' },
  { id: 'c_9', name: 'Sun Wolf', card_type: 'creature', element: 'light', cost: 2, ap: 3, ch: 2, description: 'Haste: Can attack the turn it is summoned.', keywords: ['Charge'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/120e47c88_02xSunWolf.png' },
  { id: 'c_10', name: 'Sun Fairy', card_type: 'creature', element: 'light', cost: 2, ap: 2, ch: 2, description: 'Light Spirit: Sacrifice this card to grant your Controller 2 Shards.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/83e5ade47_02xSunFairy.png' },
  { id: 'c_11', name: 'Light Spirit', card_type: 'creature', element: 'light', cost: 1, ap: 1, ch: 1, description: 'Vessel: If Light Bind is active, this card gains the AP and CH of the bound enemy creature.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/8297f2bdd_02xLightSpirit.png' },
  { id: 's_1', name: 'Divine Elemental Convergence', card_type: 'spell', element: 'light', cost: 6, description: 'Eternal Light: While active, no Spells on the field can be destroyed. All Light cards gain +1 AP. Collapse: If you have 0 Light creatures, destroy this card.', keywords: [], is_persistent: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6ad6db213_02xDivineElementalConvergence.png' },
  { id: 's_2', name: 'Divine Light', card_type: 'spell', element: 'light', cost: 3, description: 'Restoration: Requires Light Enchantment. Restore Controller to 12 CH. Summoning Key: Allows Michael to be summoned this turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6a3ecd37c_02xDivineLight.png' },
  { id: 's_3', name: 'Light Bind', card_type: 'spell', element: 'light', cost: 2, description: 'Binding: Target enemy cannot attack/defend/use abilities (3 turns). Spirit Synergy: Light Spirit gains the target\'s stats.', keywords: [], is_persistent: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b30f300b9_02xLightBind.png' },
  { id: 's_4', name: 'Burning Blast', card_type: 'spell', element: 'light', cost: 2, description: 'Deal 3 damage to an enemy. If it kills the target, gain 1 Shard.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/686b92b8b_02xBurningBlast.png' },
  { id: 's_5', name: 'Light Enchantment', card_type: 'spell', element: 'light', cost: 2, description: 'Holy Vessel: Attach to Controller. Cut CH in half; add that amount to Controller\'s AP. Fatal Bond: If destroyed, the Controller is destroyed.', keywords: [], is_persistent: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/2a547b72a_02xLightEnchantment.png' },
  { id: 's_6', name: 'Blessing of Light', card_type: 'spell', element: 'light', cost: 2, description: 'Heal any target for 3 CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/69924dc34_02xBlessingofLight.png' },
  { id: 'a_1', name: 'Sword of the Sun Guardian', card_type: 'artifact', element: 'light', cost: 3, description: 'Sun Stealth: Sun Knight gains Stealth (Attack Controllers directly). Divine Tax: Stealth attacks deal only 50% damage to the Controller.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d463cf9bb_02xSwordoftheSunGuardian.png' },
  { id: 'a_2', name: 'Dagger of Fate', card_type: 'artifact', element: 'light', cost: 2, description: 'Equipped creature gets +2 AP. If it attacks a Controller, opponent discards 1 card.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/949b73f27_02xDaggerofFate.png' },
];

// Wind Deck
const OLD_WIND_DECK = [
  { id: 'ctrl_1', name: 'Wind Knight', card_type: 'controller', element: 'wind', cost: 4, ch: 12, ap: 1, description: 'Passive: Gale Force. Your Wind creatures gain Haste. Active (3 Shards): Ronin Strike. Target ally can attack twice this turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/864aa6ea9_Wind_Knight.png' },
  { id: 'ctrl_2', name: 'Wind Witch', card_type: 'controller', element: 'wind', cost: 5, ch: 12, ap: 1, description: 'Passive: Sky Blessing. The first Wind Spell you play each turn costs 1 less. Active (2 Shards): Mirage Veil. Target ally cannot be targeted by spells for 1 turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/2abf56ff5_Wind_Witch.png' },
  { id: 'ctrl_3', name: 'Spirit of the Wind', card_type: 'controller', element: 'wind', cost: 6, ch: 12, ap: 1, description: 'Passive: Cyclonic Flow. Gain 1 Shard when a card is Recalled. Ghost Strike: If Smoke Body is active, can attack Controllers directly.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/23e8d7a3f_Spirit_of_the_Wind.png' },
  { id: 'c_1', name: 'Wind Dragon', card_type: 'creature', element: 'wind', cost: 6, ap: 7, ch: 9, description: 'Storm Lord: Attacks deal 2 splash damage to all other enemies. Protects your board from Sweeping Wind.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/63b0f5281_Wind_Dragon.png' },
  { id: 'c_2', name: 'Wind Golem', card_type: 'creature', element: 'wind', cost: 5, ap: 3, ch: 11, description: 'Air Cushion: Reduces incoming non-magical damage by 3. Taunt. (Summoned by Wind Mirage).', keywords: ['Guardian'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/26a5bddc6_Wind_Golem.png' },
  { id: 'c_3', name: 'Wind Ronin', card_type: 'creature', element: 'wind', cost: 4, ap: 5, ch: 5, description: 'Double Strike: This card naturally attacks twice per turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e11a24011_Wind_Ronin.png' },
  { id: 'c_4', name: 'Wind Warrior', card_type: 'creature', element: 'wind', cost: 4, ap: 4, ch: 6, description: 'Tailwind (On Play): Give an ally +2 AP. Gains +2 AP per Wind ally if your side holds a creature via Wind Control.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b7f8c0d2c_Wind_Warrior.png' },
  { id: 'c_5', name: 'Wind Warlock', card_type: 'creature', element: 'wind', cost: 3, ap: 3, ch: 5, description: 'Arcane Anchor: While on field, Dark Infusion becomes a searcher. If in Controller slot, Spell Release becomes a board-wipe.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/dc56a9386_Wind_Warlock.png' },
  { id: 'c_6', name: 'Wind Keeper', card_type: 'creature', element: 'wind', cost: 3, ap: 2, ch: 7, description: "Wind Protection (P): Artifacts can't be destroyed. Combo: If holding Wind Sword, attacks return enemies to hand (1x/turn).", keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f2f198200_Wind_Keeper.png' },
  { id: 'c_7', name: 'Wind Pack', card_type: 'creature', element: 'wind', cost: 3, ap: 3, ch: 3, description: 'Summoning Gust (On Play): Summon another Wind Pack from your deck for 0 cost.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6f574a9fa_Wind_Pack.png' },
  { id: 's_1', name: 'Wind Control', card_type: 'spell', element: 'wind', cost: 4, description: 'Theft: Take an enemy for 2 turns, then destroy it. Buffs Wind Warrior based on your Wind allies.', keywords: [], is_persistent: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4f8e203a2_Wind_Control.png' },
  { id: 's_2', name: 'Sweeping Wind', card_type: 'spell', element: 'wind', cost: 5, description: 'Reset: Recall all creatures. If Dragon is out, only hits enemies. Draw 1: Play if Spell, shuffle if Creature.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/39eadf38f_Sweeping_Wind.png' },
  { id: 's_3', name: 'Spell Release', card_type: 'spell', element: 'wind', cost: 3, description: "Dispel: Destroy 1 target Spell. Warlock's Burst: If Warlock is Controller, destroy all enemy Spells/Permanent Spells.", keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b64e2e489_Spell_Release.png' },
  { id: 's_4', name: 'Creature Recall', card_type: 'spell', element: 'wind', cost: 3, description: 'Universal: Return any element (Blood, Cryo, Fire, Shadow, Water, Wind) creature to hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/000765bf6_Creature_Recall.png' },
  { id: 's_5', name: 'Dark Infusion', card_type: 'spell', element: 'wind', cost: 3, description: 'Utility: Search for Wind Control (if Warlock is out) or deal 3 DMG to enemy Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5b96e9259_Dark_Infusion.png' },
  { id: 's_6', name: 'Wind Protection', card_type: 'spell', element: 'wind', cost: 3, description: 'Barrier: If you have 2+ Wind allies, they cannot be attacked for 3 turns.', keywords: [], is_persistent: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d1b71d78c_Wind_Protection.png' },
  { id: 's_7', name: 'Wind Mirage', card_type: 'spell', element: 'wind', cost: 3, description: 'Reaction: Stops an attack on Controller; Summons a defensive Wind Golem (cannot attack).', keywords: ['Reaction'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/1d4295042_Wind_Mirage.png' },
  { id: 's_8', name: 'Smoke Body', card_type: 'spell', element: 'wind', cost: 2, description: 'Target is invulnerable/untargetable. Enables Spirit of the Wind direct attacks.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/2b9d1365d_Smoke_Body.png' },
  { id: 's_9', name: 'Tempest Convergence', card_type: 'spell', element: 'wind', cost: 4, description: 'Pressure Front: For each enemy creature that was Recalled or returned to hand this turn, deal 1 damage to an enemy Controller. Momentum: If 3 or more enemy creatures were Recalled this turn, draw 1 card.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a0f807f9f_Elemental_Convergence.png' },
  { id: 'a_1', name: 'Wind Orb', card_type: 'artifact', element: 'wind', cost: 2, description: 'Boosting Aura: +1 AP / +1 CH to all Wind allies. Draw 1 card when a Wind ally is Recalled.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f22199c29_Wind_Orb.png' },
  { id: 'a_2', name: 'Wind Staff', card_type: 'artifact', element: 'wind', cost: 3, description: 'Equipped: "When this card attacks, the opponent must discard 1 card."', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/17d39f9da_Wind_Staff.png' },
  { id: 'a_3', name: 'Wind Sword', card_type: 'artifact', element: 'wind', cost: 3, description: 'Equipped: +2 AP / +2 CH. Special: On Wind Keeper, attacks bounce enemies to hand.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/0f349e884_Wind_Sword.png' },
];

// Shadow Deck
const OLD_SHADOW_DECK = [
  { id: 'ctrl_1', name: 'Darth Ayres', card_type: 'controller', element: 'shadow', cost: 4, ch: 12, ap: 1, description: 'Passive: All enemy creatures lose 1 AP. Active (4): Dark Nova: Deal 2 damage to all enemy creatures.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d865b395a_01xDarthAyres.png' },
  { id: 'ctrl_2', name: 'Umbra Reaver', card_type: 'controller', element: 'shadow', cost: 5, ch: 12, ap: 1, description: 'Passive: If opponent draws extra cards, they lose 1 CH. Active (2): Deal 2 damage and heal active Controller 2 CH.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/1afd3c2cb_01xUmbraReaver.png' },
  { id: 'ctrl_3', name: 'Shadow Master', card_type: 'controller', element: 'shadow', cost: 6, ch: 12, ap: 1, description: 'Passive: May play Shadow Spells from discard (+1 cost). Active: Dark Dimension: Send 1 creature to the Void for 2 turns.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ea51dfcc9_01xShadowMaster.png' },
  { id: 'c_1', name: 'Dark Samurai', card_type: 'creature', element: 'shadow', cost: 4, ap: 5, ch: 4, description: 'If Shadow Spell is used on him: destroy 1 enemy Artifact or Spell.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/aea7b04ef_02xDarkSamurai.png' },
  { id: 'c_2', name: 'Dark Phantom', card_type: 'creature', element: 'shadow', cost: 3, ap: 3, ch: 2, description: 'Stealth; if Shadow Spell used on him: cannot be targeted by spells until next turn.', keywords: ['Stealth'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f3d32cb0e_02xDarkPhantom.png' },
  { id: 'c_3', name: 'Dark Knight', card_type: 'creature', element: 'shadow', cost: 4, ap: 5, ch: 6, description: 'Creatures with 3 AP or less cannot attack this. Gains AP from Dark Chains siphon.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/fa86c3207_02xDarkKnight.png' },
  { id: 'c_4', name: 'Shadow Knight', card_type: 'creature', element: 'shadow', cost: 3, ap: 4, ch: 4, description: 'Gains AP from Dark Chains siphon.', keywords: [], image_url: '' },
  { id: 'c_5', name: 'Dark Warlock', card_type: 'creature', element: 'shadow', cost: 3, ap: 2, ch: 3, description: 'On Play: Force opponent to discard 1 card. Enables Black Spell bonus.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/38d45133f_02xDarkWarlock.png' },
  { id: 'c_6', name: 'Sigurd Shadowhand', card_type: 'creature', element: 'shadow', cost: 3, ap: 3, ch: 4, description: 'When attacking, look at opponent hand; choose 1 card for them to discard.', keywords: [], image_url: '' },
  { id: 'c_7', name: 'Shadow Wraith', card_type: 'creature', element: 'shadow', cost: 5, ap: 6, ch: 5, description: 'Gains +1 AP permanently when it destroys a creature. Returns from Dark Dimension with Double AP.', keywords: [], image_url: '' },
  { id: 'c_8', name: 'Night Terror', card_type: 'creature', element: 'shadow', cost: 2, ap: 2, ch: 2, description: 'Hit target cannot attack/use abilities next turn. Returns from Dark Dimension with Double AP.', keywords: [], image_url: '' },
  { id: 's_1', name: 'Dark Dimension', card_type: 'spell', element: 'shadow', cost: 3, description: 'Banish 1 creature for 2 turns. If your Wraith/Phantom/Terror and Shadow Master active: returns with Double AP for 1 turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d84236095_02xDarkDimension.png' },
  { id: 's_2', name: 'Black Spell', card_type: 'spell', element: 'shadow', cost: 4, description: 'Summon 2 Tokens (2/2). If Dark Warlock is out, summon 1 Shadow creature from hand for 0 cost. None can attack this turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/3a4d238fe_02xBlackSpell.png' },
  { id: 's_3', name: 'Dark Ritual', card_type: 'spell', element: 'shadow', cost: 4, description: 'Sacrifice 1 creature; gain 5 Shards. If Shadow Master active: get Shadow\'s Embrace from deck and 0-cost instant summon from hand during any phase.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/8a98df5ed_02xDarkRitual.png' },
  { id: 's_4', name: 'Shadow\'s Embrace', card_type: 'spell', element: 'shadow', cost: 3, description: 'Control 1 enemy creature. If Darth Ayres bonus: steal 1 card from opponent hand as shield token. Sacrifice stolen card to heal Controller CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5cdf2b225_01xShadowsEmbrace.png' },
  { id: 's_5', name: 'Dark Chains', card_type: 'spell', element: 'shadow', cost: 3, description: 'Enemy: target cannot attack; Knights siphon its AP. Self: opponent must attack this card; survives 1st hit, dies on 2nd hit same turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a5cf6784a_02xDarkChains.png' },
  { id: 's_6', name: 'Shadow Spell', card_type: 'spell', element: 'shadow', cost: 2, description: 'Target Shadow creature gains +2 AP and Stealth. Triggers Samurai or Phantom synergy.', keywords: [], image_url: '' },
  { id: 's_7', name: 'Dark Nova', card_type: 'spell', element: 'shadow', cost: 4, description: 'Deal 3 damage to all creatures. If Darth Ayres is out, your units are safe. Gain 1 Shard next turn for each creature destroyed.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/088ae77b4_02xDarkNova.png' },
  { id: 'a_1', name: 'Thor\'s Hammer', card_type: 'artifact', element: 'shadow', cost: 5, description: 'Equipped creature gains +5 AP. When attacking, deal 1 damage to all other enemy creatures.', is_persistent: true, keywords: [], image_url: '' },
  { id: 'a_2', name: 'Cursed Sword', card_type: 'artifact', element: 'shadow', cost: 2, description: 'Equipped creature gains +4 AP. Ignores Swarm tokens. Equipped creature loses 2 CH each End Phase.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/7d26ddced_02xCursedSword.png' },
  { id: 'a_3', name: 'Dark Orb', card_type: 'artifact', element: 'shadow', cost: 2, description: 'When dealing damage, look at top 3 cards and take a Shadow Spell. If sacrificed via Dark Ritual, draw 2 cards.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a4a46b103_02xDarkOrb.png' },
];

// Electric Deck
const OLD_ELECTRIC_DECK = [
  { id: 'ctrl_1', name: 'The Luminary', card_type: 'controller', element: 'electric', cost: 6, ch: 12, ap: 1, description: 'Passive: When an Electric Spell is played, deal 1 damage to all enemy creatures. Active (3): Target creature gains +4 AP and Haste.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e28ea8978_01xTheLuminary.png' },
  { id: 'ctrl_2', name: 'Spark White Dragon', card_type: 'controller', element: 'electric', cost: 5, ch: 12, ap: 1, description: 'Passive: When this Controller attacks with an Artifact, deal 2 damage to a second enemy. Active (4): Deal 5 damage.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4fcef9be8_01xSparkWhiteDragon.png' },
  { id: 'ctrl_3', name: 'Spark Knight', card_type: 'controller', element: 'electric', cost: 4, ch: 12, ap: 1, description: 'Passive: Electric Artifacts cost 1 less. Active (2): Target enemy cannot use its Passive ability next turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/25578cf5e_01xSparkKnight.png' },
  { id: 'c_1', name: 'Volt-Howler', card_type: 'creature', element: 'electric', cost: 4, ap: 5, ch: 5, description: 'If targeted by an enemy spell, deal 2 damage to the enemy Controller. Damage dealt to creatures under Binding Chains is doubled.', keywords: [], image_url: '' },
  { id: 'c_2', name: 'Lightning Giant', card_type: 'creature', element: 'electric', cost: 5, ap: 5, ch: 9, description: 'On attack, target is Paralyzed for 1 turn.', keywords: [], image_url: '' },
  { id: 'c_3', name: 'Lightning Samurai', card_type: 'creature', element: 'electric', cost: 4, ap: 5, ch: 4, description: 'If it destroys a creature, it deals its full AP to enemy Controller.', keywords: [], image_url: '' },
  { id: 'c_4', name: 'Lightning Zephyr Knight', card_type: 'creature', element: 'electric', cost: 4, ap: 4, ch: 4, description: 'On Play: Summon 1 Zephyr from hand/deck as Equip (+2/+2). If attacked by >6 AP, discard Zephyr to stay on field.', keywords: [], image_url: '' },
  { id: 'c_5', name: 'Viking of Light', card_type: 'creature', element: 'electric', cost: 3, ap: 4, ch: 4, description: 'If your Controller has an Artifact equipped, this gains Stealth.', keywords: [], image_url: '' },
  { id: 'c_6', name: 'Lightning Knight', card_type: 'creature', element: 'electric', cost: 3, ap: 4, ch: 4, description: 'Reduces all incoming damage by 1.', keywords: [], image_url: '' },
  { id: 'c_7', name: 'Lightning Mage', card_type: 'creature', element: 'electric', cost: 3, ap: 3, ch: 3, description: 'Your equipped Artifacts gain +2 AP for this turn.', keywords: [], image_url: '' },
  { id: 'c_8', name: 'Lightning Wielder', card_type: 'creature', element: 'electric', cost: 3, ap: 3, ch: 4, description: 'Once per turn, transfer 1 Artifact between cards for 0 cost.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/c93b665d1_01xLightningWielder.png' },
  { id: 'c_9', name: 'Cosmic Witch', card_type: 'creature', element: 'electric', cost: 2, ap: 2, ch: 3, description: 'Controller Active abilities cost 1 less while active.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/045935b43_02xCosmicWitch.png' },
  { id: 'c_10', name: 'Spirit of Lightning', card_type: 'creature', element: 'electric', cost: 1, ap: 1, ch: 1, description: 'Sacrifice: gain 2 Shards this turn.', keywords: [], image_url: '' },
  { id: 'c_11', name: 'Zephyr', card_type: 'creature', element: 'electric', cost: 2, ap: 2, ch: 2, description: 'Equip to LZK: +2 AP/+2 CH. Discard to prevent LZK removal from attacks >6 AP.', keywords: [], image_url: '' },
  { id: 's_1', name: 'Binding Chains of Lightning', card_type: 'spell', element: 'electric', cost: 3, description: 'Target cannot attack. Loses 1 AP per Electric ally. If AP hits 0, channels damage to the weakest Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/8b09a1b9d_02xBindingChainsofLightning.png' },
  { id: 's_2', name: 'Surreal Light', card_type: 'spell', element: 'electric', cost: 4, description: '1 Electric creature gains +4 AP and Haste. On kill, play 1 Electric Artifact from hand for 0 cost.', keywords: [], image_url: '' },
  { id: 's_3', name: 'Wolf Lightning Strike', card_type: 'spell', element: 'electric', cost: 2, description: 'Deal 4 damage. If it destroys the target, damage jumps to enemy Controller.', keywords: [], image_url: '' },
  { id: 'a_1', name: 'Lightning Stone', card_type: 'artifact', element: 'electric', cost: 2, description: 'Electric spells cost 1 less. If destroyed, opponent loses 2 Shards.', is_persistent: true, keywords: [], image_url: '' },
  { id: 'a_2', name: 'Lightning Gauntlet', card_type: 'artifact', element: 'electric', cost: 2, description: 'If equipped to a Controller, their attacks Paralyze target for 1 turn.', is_persistent: true, keywords: [], image_url: '' },
  { id: 'a_3', name: 'Spark Knight Blade', card_type: 'artifact', element: 'electric', cost: 2, description: 'Equipped creature/Controller gains +2 AP. Takes 0 counter-damage when attacking.', is_persistent: true, keywords: [], image_url: '' },
];

// Cryo Deck
const OLD_CRYO_DECK = [
  { id: 'ctrl_1', name: 'CyRelli Princess', card_type: 'controller', element: 'cryo', cost: 6, ch: 12, ap: 1, description: 'On Play: Summon CyRelli\'s Tiger. Passive: If Tiger is destroyed by an effect (not battle), add its 5 CH to the Princess.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/abcc994ac_01xCyRelliPrincess.png' },
  { id: 'ctrl_2', name: 'Guardian Princess', card_type: 'controller', element: 'cryo', cost: 5, ch: 12, ap: 1, description: 'Passive: Cryo allies gain +2 CH if Sphere of Ice is active. Active (3): Target ally cannot be destroyed by battle this turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e5cf53765_01xGuardianPrincess.png' },
  { id: 'ctrl_3', name: 'Royal Ice Knight', card_type: 'controller', element: 'cryo', cost: 4, ch: 12, ap: 1, description: 'Passive: Frozen creatures gain +2 AP. Active (2): Summon a 3/3 Wyrm with Haste for one turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/85a300ad0_01xRoyalIceKnight.png' },
  { id: 'c_1', name: 'CyRelli\'s Tiger', card_type: 'creature', element: 'cryo', cost: 4, ap: 5, ch: 5, description: 'Cannot attack. Its 5 AP is added to CyRelli Princess. While on field, Princess cannot be targeted by attacks.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/58b4ac24a_02xCyRellisTiger.png' },
  { id: 'c_2', name: 'Frost Wyrm', card_type: 'creature', element: 'cryo', cost: 5, ap: 5, ch: 5, description: 'Freeze effects last +1 turn. If Ice Breath is played, trigger 3-turn lockdown.', keywords: [], image_url: '' },
  { id: 'c_3', name: 'Ice Yetti', card_type: 'creature', element: 'cryo', cost: 6, ap: 7, ch: 8, description: 'When attacking, target and adjacent creatures are Frozen for 1 turn.', keywords: [], image_url: '' },
  { id: 'c_4', name: 'Frozen Troll', card_type: 'creature', element: 'cryo', cost: 5, ap: 4, ch: 10, description: 'Heals 2 CH at the start of every turn.', keywords: [], image_url: '' },
  { id: 'c_5', name: 'Frozen Golem', card_type: 'creature', element: 'cryo', cost: 4, ap: 2, ch: 12, description: 'Taunt', keywords: ['Guardian'], image_url: '' },
  { id: 'c_6', name: 'Ice Protector', card_type: 'creature', element: 'cryo', cost: 3, ap: 3, ch: 7, description: 'Your Controller takes 0 damage from enemy Spells. If destroyed, Freeze the attacker for 2 turns.', keywords: [], image_url: '' },
  { id: 'c_7', name: 'Frozen Knight', card_type: 'creature', element: 'cryo', cost: 3, ap: 4, ch: 5, description: 'Damaged creatures are Frozen on opponent\'s next turn.', keywords: [], image_url: '' },
  { id: 'c_8', name: 'Cryo Mage', card_type: 'creature', element: 'cryo', cost: 3, ap: 3, ch: 3, description: 'On Play: Freeze one enemy creature.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/0c1d1843f_02xCryoMage.png' },
  { id: 'c_9', name: 'Frozen Spirit', card_type: 'creature', element: 'cryo', cost: 1, ap: 1, ch: 1, description: 'If only 1 enemy is on field and it is Frozen, hit Controller directly. Return to hand after attack.', keywords: [], image_url: '' },
  { id: 's_1', name: 'Frozen Barrage', card_type: 'spell', element: 'cryo', cost: 4, description: 'If no allies: Recall enemies to hand. Creatures with 3 AP or less are destroyed.', keywords: [], image_url: '' },
  { id: 's_2', name: 'Ice Breath', card_type: 'spell', element: 'cryo', cost: 3, description: 'If Frost Wyrm is out, enemies can\'t attack for 3 turns. If enemies are Cryo, play Freezing Spell for 0 cost.', keywords: [], image_url: '' },
  { id: 's_3', name: 'Freezing Spell', card_type: 'spell', element: 'cryo', cost: 3, description: 'No enemy creatures or Controllers can attack on their next turn.', keywords: [], image_url: '' },
  { id: 's_4', name: 'Blizzard', card_type: 'spell', element: 'cryo', cost: 3, description: 'All creatures except Cryo are Frozen for 1 turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/39ba9ffbd_02xBlizzard.png' },
  { id: 's_5', name: 'White Out', card_type: 'spell', element: 'cryo', cost: 2, description: 'All enemy creatures lose 2 AP for 1 turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/42bdb8d33_01xWhiteOut.png' },
  { id: 's_6', name: 'Defrost', card_type: 'spell', element: 'cryo', cost: 1, description: 'Cleanse "cannot attack" effects. Give +3 AP. If Royal Ice Knight active, tutor Blizzard or White Out.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ff886e970_02xDefrost.png' },
  { id: 'a_1', name: 'Sphere of Ice', card_type: 'artifact', element: 'cryo', cost: 3, description: 'If on Guardian Princess, summon Protector/Knight for 0. Controller gains +3 AP, but loses 1 AP per death.', is_persistent: true, keywords: [], image_url: '' },
  { id: 'a_2', name: 'Enchanted Ice Crystal', card_type: 'artifact', element: 'cryo', cost: 2, description: 'First attack from equipped is a guaranteed Freeze. +2 AP +2 CH. After 3 turns: shatters (destroyed).', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6d2dd9a8c_02xEnchantedIceCrystal.png' },
];

// Earth Deck
const OLD_EARTH_DECK = [
  { id: 'ctrl_1', name: 'Earth Spirit', card_type: 'controller', element: 'earth', cost: 4, ch: 12, ap: 1, description: 'Passive: Play a Nature Creature: gain 1 Shard (once per turn). Active (2): Search deck for Emerald or Guardian of the Tree.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/1b372e48a_01xEarthSpirit.png' },
  { id: 'ctrl_2', name: 'Earth Defender', card_type: 'controller', element: 'earth', cost: 5, ch: 12, ap: 1, description: 'Passive: Allies cannot be moved to hand/deck by enemy effects. Active (3): Paralyze 1 enemy for 2 turns; -2 CH each turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4ff9b6b31_01xEarthDefender.png' },
  { id: 'ctrl_3', name: 'Giant', card_type: 'controller', element: 'earth', cost: 6, ch: 12, ap: 1, description: 'Passive: Attack with Artifact: opponent discards 1 card. Active (4): Deal 3 damage to all enemy creatures.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5accb4966_01xGiant.png' },
  { id: 'c_1', name: 'Guardian of the Tree', card_type: 'creature', element: 'earth', cost: 5, ap: 4, ch: 10, description: 'On Play: Search deck/discard for Vine Tree or Vine Coffin. Passive: All Nature allies heal 2 CH at end of your turn.', keywords: [], image_url: '' },
  { id: 'c_2', name: 'Moss Dragon', card_type: 'creature', element: 'earth', cost: 6, ap: 6, ch: 10, description: 'Reduces all incoming damage by 2.', keywords: [], image_url: '' },
  { id: 'c_3', name: 'Earth Serpent', card_type: 'creature', element: 'earth', cost: 4, ap: 4, ch: 7, description: 'Untargetable if another Nature ally is present. Deals +3 bonus damage vs Paralyzed enemies.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d2d8d2e8d_02xEarthSerpant.png' },
  { id: 'c_4', name: 'Earth Knight', card_type: 'creature', element: 'earth', cost: 4, ap: 5, ch: 6, description: 'On Play: Artifacts cannot be destroyed by spells. Ally gains +3 CH and Freeze immunity.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4a845b951_02xEarthKnight.png' },
  { id: 'c_5', name: 'Ogre Attacker', card_type: 'creature', element: 'earth', cost: 4, ap: 6, ch: 4, description: 'Destroy equipped card and equipment. Takes 1 CH damage vs unequipped; cannot attack next turn.', keywords: [], image_url: '' },
  { id: 'c_6', name: 'Witch of Nature', card_type: 'creature', element: 'earth', cost: 2, ap: 2, ch: 5, description: 'On Play: Heal ally for 3 CH. If equipped with Staff, attacks heal lowest ally for 2 CH.', keywords: [], image_url: '' },
  { id: 'c_7', name: 'Gnome Warlock', card_type: 'creature', element: 'earth', cost: 3, ap: 3, ch: 5, description: 'When a Nature ally is destroyed, gain 1 Shard (limit 1/turn).', keywords: [], image_url: '' },
  { id: 'c_8', name: 'Wolfen', card_type: 'creature', element: 'earth', cost: 3, ap: 3, ch: 3, description: 'Haste; +2 AP if you control another Wolfen or Goblin Knight.', keywords: ['Charge'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b28626c7a_02xCallofthePack.png' },
  { id: 'c_9', name: 'Goblin Knight', card_type: 'creature', element: 'earth', cost: 3, ap: 3, ch: 4, description: 'On Play: Summon another Goblin Knight from hand/deck for 0.', keywords: [], image_url: '' },
  { id: 'c_10', name: 'Golem Defender', card_type: 'creature', element: 'earth', cost: 5, ap: 3, ch: 10, description: 'Taunt', keywords: ['Guardian'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5444cd812_01xGolemDefender.png' },
  { id: 's_1', name: 'Tree of Life', card_type: 'spell', element: 'earth', cost: 4, description: 'If Guardian present: Guardian absorbs all ally CH (not Controllers), AP becomes 0, Taunts everyone. Else: Search Earth Staff.', keywords: [], image_url: '' },
  { id: 's_2', name: 'Nature\'s Bliss', card_type: 'spell', element: 'earth', cost: 2, description: 'If Witch is out: auto-equip Staff + Blade from hand. Else: summon Gnome or Goblin from hand.', keywords: [], image_url: '' },
  { id: 's_3', name: 'Vine Tree', card_type: 'spell', element: 'earth', cost: 3, description: 'Summon two 0/5 Wall of Vines tokens with Taunt.', keywords: [], image_url: '' },
  { id: 's_4', name: 'Vine Coffin', card_type: 'spell', element: 'earth', cost: 3, description: 'Target is Paralyzed for 2 turns and loses 2 CH each turn.', keywords: [], image_url: '' },
  { id: 's_5', name: 'Nature\'s Blade', card_type: 'spell', element: 'earth', cost: 2, description: 'Target gains +3 AP. If it destroys an enemy this turn, draw 1 card.', keywords: [], image_url: '' },
  { id: 'a_1', name: 'Earth Staff', card_type: 'artifact', element: 'earth', cost: 2, description: 'Equipped card gains +4 CH. If attacked, attacker takes 1 damage.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ed4dda5dd_02xEarthStaff.png' },
  { id: 'a_2', name: 'Enchanted Emerald', card_type: 'artifact', element: 'earth', cost: 3, description: 'Equipped card gains +3 AP / +3 CH. If destroyed: heal all allies 2 CH.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/38d4392bf_02xEnchantedEmerald.png' },
];

// Water Deck
const OLD_WATER_DECK = [
  { id: 'ctrl_1', name: 'Neptune', card_type: 'controller', element: 'water', cost: 6, ch: 12, ap: 1, description: 'On Play: Search deck/discard for 1 Water Safe. If The Kraken is on field, add 1 Kraken Slash to hand. Passive: Gain 1 Shard whenever an enemy is Recalled (bounced).', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/96c5dca39_01xNeptune.png' },
  { id: 'ctrl_2', name: 'The Kraken', card_type: 'controller', element: 'water', cost: 4, ch: 12, ap: 1, description: 'Passive: Play a Water Spell: opponent loses 1 Shard. Ink Cloud (3): Reaction during opponent attack; you choose the attack target; must hit own creatures first or own Controller if none.', keywords: ['Reaction'], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/31241777e_01xKraken.png' },
  { id: 'ctrl_3', name: 'Mermaid Empress', card_type: 'controller', element: 'water', cost: 5, ch: 12, ap: 1, description: 'Passive: Water Guardians and Royal Guards gain +2 AP. Deep Recovery (2): Heal target Water creature for 4 CH.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/836b54350_01xMermaidEmperess.png' },
  { id: 'c_1', name: 'Supreme Water Dragon', card_type: 'creature', element: 'water', cost: 6, ap: 8, ch: 10, description: 'On Play: Return all enemy creatures with 4 AP or less to hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ea1960e61_01xSupremeWaterDragon.png' },
  { id: 'c_2', name: 'Water Golem', card_type: 'creature', element: 'water', cost: 5, ap: 2, ch: 12, description: 'Taunt; takes 0 damage from creatures with 6+ AP.', keywords: ['Guardian'], image_url: '' },
  { id: 'c_3', name: 'Guardians of Atlantis', card_type: 'creature', element: 'water', cost: 4, ap: 4, ch: 6, description: 'Your Controller takes 50% less damage from Spells.', keywords: [], image_url: '' },
  { id: 'c_4', name: 'Shark', card_type: 'creature', element: 'water', cost: 4, ap: 5, ch: 4, description: 'Gains +3 AP when attacking a creature already damaged this turn.', keywords: [], image_url: '' },
  { id: 'c_5', name: 'Royal Guard', card_type: 'creature', element: 'water', cost: 3, ap: 3, ch: 6, description: 'While Mermaid Empress is out, this card can take damage in her place.', keywords: [], image_url: '' },
  { id: 'c_6', name: 'Lizard Warrior', card_type: 'creature', element: 'water', cost: 3, ap: 4, ch: 4, description: 'If a Water Spell was played this turn: +2 AP and can attack twice.', keywords: [], image_url: '' },
  { id: 'c_7', name: 'Water Warlock', card_type: 'creature', element: 'water', cost: 3, ap: 3, ch: 5, description: 'When this deals damage to an enemy creature, steal 1 Shard.', keywords: [], image_url: '' },
  { id: 'c_8', name: 'Water Guardian', card_type: 'creature', element: 'water', cost: 2, ap: 2, ch: 6, description: 'If recalled to hand, may summon again immediately for 0 cost.', keywords: [], image_url: '' },
  { id: 'c_9', name: 'Water Familiar', card_type: 'creature', element: 'water', cost: 1, ap: 1, ch: 1, description: 'Sacrifice: look at opponent hand; choose 1 Spell, they cannot play it for 2 turns.', keywords: [], image_url: '' },
  { id: 's_1', name: 'Water Safe', card_type: 'spell', element: 'water', cost: 2, description: 'Water allies cannot be targeted by non-Water. Maintenance: Pay 1 CH from Mermaid Empress per turn or discard this card.', keywords: [], is_persistent: true, image_url: '' },
  { id: 's_2', name: 'Whirlpool', card_type: 'spell', element: 'water', cost: 2, description: 'Opponent cannot play Spells next turn. If a Persistent Spell is active, destroy it and add 1 Tidal Wave to your hand.', keywords: [], image_url: '' },
  { id: 's_3', name: 'Water Entrapment', card_type: 'spell', element: 'water', cost: 3, description: 'Target is Paralyzed for 3 turns. If target is Fire attribute, discard it immediately.', keywords: [], image_url: '' },
  { id: 's_4', name: 'Kraken Slash', card_type: 'spell', element: 'water', cost: 3, description: 'Deal 5 damage. If target survives, return it to owner\'s hand.', keywords: [], image_url: '' },
  { id: 's_5', name: 'Tidal Wave', card_type: 'spell', element: 'water', cost: 4, description: 'Return all non-Water creatures to owner\'s hands.', keywords: [], image_url: '' },
  { id: 's_6', name: 'Dragon\'s Tsunami', card_type: 'spell', element: 'water', cost: 5, description: 'Requires Supreme Water Dragon. Destroy all enemy creatures with 3 CH or less; recall the rest.', keywords: [], image_url: '' },
  { id: 'a_1', name: 'Spear of Neptune', card_type: 'artifact', element: 'water', cost: 3, description: 'Equipped card gains +4 AP. On attack, return target to hand after damage.', is_persistent: true, keywords: [], image_url: '' },
  { id: 'a_2', name: 'Crown of Neptune', card_type: 'artifact', element: 'water', cost: 4, description: 'Water Spells cost 1 less. Gain 1 Shard every time you play a Water Spell.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/3c15b8b15_02xCrownofNeptune.png' },
];

const ALL_CARDS = {
  all: [...BLOOD_DECK, ...FIRE_DECK, ...WIND_DECK, ...LIGHT_DECK, ...SHADOW_DECK, ...ELECTRIC_DECK, ...CRYO_DECK, ...EARTH_DECK, ...WATER_DECK, ...UNIVERSAL_CARDS],
  blood: [...BLOOD_DECK, ...UNIVERSAL_CARDS],
  fire: [...FIRE_DECK, ...UNIVERSAL_CARDS],
  wind: [...WIND_DECK, ...UNIVERSAL_CARDS],
  light: [...LIGHT_DECK, ...UNIVERSAL_CARDS],
  shadow: [...SHADOW_DECK, ...UNIVERSAL_CARDS],
  electric: [...ELECTRIC_DECK, ...UNIVERSAL_CARDS],
  cryo: [...CRYO_DECK, ...UNIVERSAL_CARDS],
  earth: [...EARTH_DECK, ...UNIVERSAL_CARDS],
  water: [...WATER_DECK, ...UNIVERSAL_CARDS]
};

export default function DeckBuilder() {
  const [user, setUser] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [selectedElement, setSelectedElement] = useState('fire');
  const [currentDeck, setCurrentDeck] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);
  const [viewCard, setViewCard] = useState(null);
  const queryClient = useQueryClient();

useEffect(() => {
  // Local dev fallback so Base44 auth doesn't block the UI
  if (import.meta.env.DEV) {
    setUser({ email: 'dev@local.test' });
    return;
  }

  base44.auth.me().then(setUser).catch(() => {});
}, []);




  const { data: progress } = useQuery({
    queryKey: ['player-progress', user?.email],
    queryFn: async () => {
      const progs = await base44.entities.PlayerProgress.filter({ user_email: user.email });
      if (progs.length > 0) return progs[0];
      return null;
    },
    enabled: !!user && !import.meta.env.DEV

  });

  const { data: savedDecks } = useQuery({
    queryKey: ['custom-decks', user?.email],
    queryFn: () => base44.entities.CustomDeck.filter({ user_email: user.email }),
    enabled: !!user && !import.meta.env.DEV

  });

  const saveDeckMutation = useMutation({
    mutationFn: (deckData) => {
      if (selectedDeckId) {
        return base44.entities.CustomDeck.update(selectedDeckId, deckData);
      }
      return base44.entities.CustomDeck.create(deckData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['custom-decks']);
      setDeckName('');
      setCurrentDeck([]);
      setSelectedDeckId(null);
    }
  });

  const deleteDeckMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomDeck.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['custom-decks']);
    }
  });

  const handleAddCard = (card) => {
    const existingIndex = currentDeck.findIndex(c => c.card.id === card.id);
    
    // Check controller limit (max 3 unique controllers)
    if (card.card_type === 'controller') {
      const controllerCount = currentDeck.filter(c => c.card.card_type === 'controller').length;
      if (existingIndex === -1 && controllerCount >= 3) {
        alert('Maximum 3 controllers allowed in deck');
        return;
      }
      if (existingIndex >= 0) {
        alert('Controllers must be unique - only 1 copy allowed');
        return;
      }
    }
    
    // Check duplicate limit for non-unique cards (max 2 copies)
    if (existingIndex >= 0) {
      if (card.is_unique) {
        alert('This card is unique - only 1 copy allowed');
        return;
      }
      if (currentDeck[existingIndex].quantity >= 2) {
        alert('Maximum 2 copies of non-unique cards allowed');
        return;
      }
      const newDeck = [...currentDeck];
      newDeck[existingIndex].quantity += 1;
      setCurrentDeck(newDeck);
    } else {
      setCurrentDeck([...currentDeck, { card, quantity: 1 }]);
    }
  };

  const handleRemoveCard = (cardId) => {
    const existingIndex = currentDeck.findIndex(c => c.card.id === cardId);
    if (existingIndex >= 0) {
      const newDeck = [...currentDeck];
      if (newDeck[existingIndex].quantity > 1) {
        newDeck[existingIndex].quantity -= 1;
      } else {
        newDeck.splice(existingIndex, 1);
      }
      setCurrentDeck(newDeck);
    }
  };

  const handleSaveDeck = () => {
    if (!deckName.trim()) {
      alert('Please enter a deck name');
      return;
    }
    if (currentDeck.length === 0) {
      alert('Deck cannot be empty');
      return;
    }

    const deckData = {
      name: deckName,
      user_email: user.email,
      element: selectedElement,
      cards: currentDeck.map(({ card, quantity }) => ({
        card_id: card.id,
        quantity
      })),
      total_cards: currentDeck.reduce((sum, c) => sum + c.quantity, 0),
      is_valid: true
    };

    saveDeckMutation.mutate(deckData);
  };

  const handleLoadDeck = (deck) => {
    setDeckName(deck.name);
    setSelectedElement(deck.element);
    setSelectedDeckId(deck.id);
    
    const loadedCards = deck.cards.map(({ card_id, quantity }) => {
      const card = ALL_CARDS[deck.element].find(c => c.id === card_id);
      return { card, quantity };
    }).filter(c => c.card);
    
    setCurrentDeck(loadedCards);
  };

  const totalCards = currentDeck.reduce((sum, c) => sum + c.quantity, 0);
  const avgCost = currentDeck.length > 0
    ? (currentDeck.reduce((sum, c) => sum + c.card.cost * c.quantity, 0) / totalCards).toFixed(1)
    : 0;

  const availableCards = ALL_CARDS[selectedElement] || [];
  
  // Show all cards with lock status - admins unlock everything
  const ownedCards = progress?.owned_cards || [];
  const isAdmin = progress?.admin_mode_active || false;
  const cardsWithOwnership = availableCards.map(card => ({
    ...card,
    owned: isAdmin ? 99 : (ownedCards.find(oc => oc.card_id === card.id)?.quantity || 0),
    isLocked: isAdmin ? false : !ownedCards.find(oc => oc.card_id === card.id)
  }));
  
  const filteredByType = filterType === 'all' 
    ? cardsWithOwnership 
    : cardsWithOwnership.filter(c => c.card_type === filterType);
  
  const filteredCards = showOnlyOwned 
    ? filteredByType.filter(c => !c.isLocked)
    : filteredByType;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Link to={createPageUrl('TCG')}>
              <Button variant="outline" className="border-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <Link to={createPageUrl('Shop')}>
              <Button className="bg-gradient-to-r from-amber-600 to-orange-600">
                <Flame className="w-4 h-4 mr-2" />
                Shop
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Deck Builder
          </h1>
          <div className="w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Collection */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-slate-900/80 border-purple-500/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Card Collection</CardTitle>
                  <div className="flex gap-2">
                    <Select value={selectedElement} onValueChange={setSelectedElement}>
                      <SelectTrigger className="w-36 bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🌟 All</SelectItem>
                        <SelectItem value="fire">🔥 Fire</SelectItem>
                        <SelectItem value="water">💧 Water</SelectItem>
                        <SelectItem value="earth">🌿 Earth</SelectItem>
                        <SelectItem value="wind">💨 Wind</SelectItem>
                        <SelectItem value="blood">🩸 Blood</SelectItem>
                        <SelectItem value="light">☀️ Light</SelectItem>
                        <SelectItem value="shadow">🌑 Shadow</SelectItem>
                        <SelectItem value="electric">⚡ Electric</SelectItem>
                        <SelectItem value="cryo">❄️ Cryo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="controller">Controllers</SelectItem>
                        <SelectItem value="creature">Creatures</SelectItem>
                        <SelectItem value="spell">Spells</SelectItem>
                        <SelectItem value="artifact">Artifacts</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => setShowOnlyOwned(!showOnlyOwned)}
                      variant={showOnlyOwned ? "default" : "outline"}
                      className={showOnlyOwned ? "bg-green-600 hover:bg-green-700 border-green-600" : "border-slate-700 hover:bg-slate-800"}
                    >
                      {showOnlyOwned ? "✓ Owned Only" : "Show All"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-[600px] overflow-y-auto">
                  {filteredCards.map((card) => {
                    const inDeck = currentDeck.find(c => c.card.id === card.id);
                    const canAdd = !card.isLocked && (!inDeck || inDeck.quantity < card.owned);
                    return (
                      <div key={card.id} className="relative">
                        <div className={card.isLocked ? 'opacity-40 grayscale' : ''}>
                          <GameCard card={card} onView={() => setViewCard(card)} />
                        </div>
                        
                        {card.isLocked ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                            <Lock className="w-8 h-8 text-slate-400" />
                          </div>
                        ) : (
                          <div className="absolute top-1 right-1 bg-slate-900/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400">
                            {card.owned}
                          </div>
                        )}
                        
                        {!card.isLocked && (
                          <div className="mt-1 flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleAddCard(card)}
                              disabled={!canAdd}
                              className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700 disabled:opacity-30"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            {inDeck && (
                              <>
                                <span className="text-xs text-white font-bold px-1">
                                  {inDeck.quantity}
                                </span>
                                <Button
                                  size="sm"
                                  onClick={() => handleRemoveCard(card.id)}
                                  className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Deck & Saved Decks */}
          <div className="space-y-4">
            {/* Current Deck */}
            <Card className="bg-slate-900/80 border-cyan-500/50">
              <CardHeader>
                <CardTitle className="text-white">Current Deck</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Input
                    placeholder="Deck Name"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white mb-2"
                  />
                  <Button
                    onClick={handleSaveDeck}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {selectedDeckId ? 'Update Deck' : 'Save Deck'}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-400">Cards</div>
                    <div className="text-lg font-bold text-white">{totalCards}</div>
                  </div>
                  <div className="bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-400">Avg Cost</div>
                    <div className="text-lg font-bold text-white">{avgCost}</div>
                  </div>
                  <div className="bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-400">Unique</div>
                    <div className="text-lg font-bold text-white">{currentDeck.length}</div>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {currentDeck.map(({ card, quantity }) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between bg-slate-800 rounded p-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-bold text-white">{quantity}x</span>
                        <span className="text-sm text-white truncate">{card.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-amber-400">{card.cost}</span>
                        <Button
                          size="sm"
                          onClick={() => handleRemoveCard(card.id)}
                          className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Saved Decks */}
            <Card className="bg-slate-900/80 border-purple-500/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Saved Decks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {savedDecks?.map((deck) => (
                    <div
                      key={deck.id}
                      className="flex items-center justify-between bg-slate-800 rounded p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {deck.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {deck.total_cards} cards • {deck.element}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleLoadDeck(deck)}
                          className="h-8 px-2 bg-blue-600 hover:bg-blue-700"
                        >
                          Load
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => deleteDeckMutation.mutate(deck.id)}
                          className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!savedDecks || savedDecks.length === 0) && (
                    <div className="text-center text-slate-400 py-8">
                      No saved decks yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Card Preview Modal */}
        <AnimatePresence>
          {viewCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
              onClick={() => setViewCard(null)}
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="relative max-w-2xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/95 p-6 rounded-2xl border-2 border-purple-500">
                  {/* Card Image */}
                  <div className="flex items-center justify-center">
                    <div className="w-64">
                      <GameCard card={viewCard} onView={() => {}} />
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="text-white space-y-4">
                    <div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
                        {viewCard.name}
                      </h2>
                      <div className="flex gap-2 flex-wrap mb-4">
                        <span className="px-3 py-1 bg-purple-600/30 border border-purple-500 rounded-full text-sm capitalize">
                          {viewCard.element}
                        </span>
                        <span className="px-3 py-1 bg-blue-600/30 border border-blue-500 rounded-full text-sm capitalize">
                          {viewCard.card_type}
                        </span>
                        <span className="px-3 py-1 bg-amber-600/30 border border-amber-500 rounded-full text-sm">
                          Cost: {viewCard.cost}
                        </span>
                        {viewCard.ap !== undefined && (
                          <span className="px-3 py-1 bg-red-600/30 border border-red-500 rounded-full text-sm">
                            AP: {viewCard.ap}
                          </span>
                        )}
                        {viewCard.ch !== undefined && (
                          <span className="px-3 py-1 bg-green-600/30 border border-green-500 rounded-full text-sm">
                            CH: {viewCard.ch}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-lg">
                      <h3 className="text-sm font-bold text-slate-400 mb-2">ABILITIES</h3>
                      <p className="text-sm leading-relaxed">{viewCard.description}</p>
                    </div>

                    {viewCard.keywords && viewCard.keywords.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-slate-400 mb-2">KEYWORDS</h3>
                        <div className="flex gap-2 flex-wrap">
                          {viewCard.keywords.map((kw, i) => (
                            <span key={i} className="px-2 py-1 bg-cyan-600/30 border border-cyan-500 rounded text-xs">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => setViewCard(null)}
                      variant="outline"
                      className="w-full mt-4 border-slate-700"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}