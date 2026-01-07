import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Swords, Home, Flame, Wind, Zap, Menu, RotateCcw, Heart, Users, Copy, Check, User, BookOpen, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import GameBoard from '@/components/tcg/GameBoard';
import * as GameEngine from '@/components/tcg/gameEngine';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';

// Blood Deck
export const BLOOD_DECK = [
  // Controllers
  { id: 'BL0003', name: 'RenLarKu', card_type: 'controller', element: 'blood', cost: 0, ch: 12, ap: 1, description: 'Passive: Pay 1 CH to draw 1 card. Active: Target 1 Creature; it gains +1 AP until End Phase.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a121bd872_RenLarKu.png' },
  { id: 'BL0004', name: 'Blood Weaver', card_type: 'controller', element: 'blood', cost: 4, ch: 12, ap: 1, description: 'Passive: Sacrifice 2 creatures to search Hand/Deck/Discard for a Controller and play it. Active: Pay 2 CH to prevent 1 enemy from attacking.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e05172934_Blood_Weaver.png' },
  { id: 'BL0005', name: 'Blood Lord', card_type: 'controller', element: 'blood', cost: 6, ch: 12, ap: 1, description: 'On Play: If field is empty, steal 1 CH from enemy Controller. Active: Deal 2 damage to all enemy creatures.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a6fcf6837_Blood_Lord.png' },
  
  // Creatures
  { id: 'BL0006', name: 'Blood General', card_type: 'creature', element: 'blood', cost: 5, ap: 5, ch: 8, description: 'Passive: All other Blood-type creatures you control gain +1 AP.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/fe595b3cc_Blood_General.png' },
  { id: 'BL0007', name: 'Crimson Knight', card_type: 'creature', element: 'blood', cost: 4, ap: 4, ch: 5, description: 'Passive: This card cannot be sacrificed to satisfy requirements of other Spells or Controller abilities.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/8b41c8647_Crimson_Knight.png' },
  { id: 'BL0008', name: 'Blood Knight', card_type: 'creature', element: 'blood', cost: 3, ap: 3, ch: 6, description: 'Passive: Gains +2 CH as long as your active Controller has its maximum (12) CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/148c975f3_Blood_Knight.png' },
  { id: 'BL0009', name: 'Redeemed Knight', card_type: 'creature', element: 'blood', cost: 3, ap: 2, ch: 8, description: 'On Death: Heal your active Controller for 3 CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5e6802ca5_Redeemed_Knight.png' },
  { id: 'BL0010', name: 'Reaper', card_type: 'creature', element: 'blood', cost: 4, ap: 5, ch: 2, description: 'Passive: If this destroys an enemy in combat, it does not Exhaust and can still block during opponent\'s turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4f94166d0_Reaper.png' },
  { id: 'BL0011', name: 'Blood Witch', card_type: 'creature', element: 'blood', cost: 2, ap: 2, ch: 3, description: 'On Play: Select 1 Blood Spell from your discard pile and add it to your hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6f8c17664_Blood_Witch.png' },
  { id: 'BL0012', name: 'Blood Swarm', card_type: 'creature', element: 'blood', cost: 2, ap: 1, ch: 2, description: 'On Play: Pay 1 CH from Controller to summon 2 Swarm Tokens (1/1).', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/32614f4cb_Blood_Swarm.png' },
  { id: 'BL0013', name: 'Ren', card_type: 'creature', element: 'blood', cost: 2, ap: 2, ch: 4, description: 'Passive: If Katana of Fate is equipped, this gains the current AP of RenLarKu.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b1e91c6ff_Ren.png' },
  
  // Spells
  { id: 'BL0014', name: 'Blood Bond', card_type: 'spell', element: 'blood', cost: 3, description: 'Req: Blood Weaver as Controller. Take control of 1 enemy creature; it can be used for sacrifices.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/549687069_Blood_Bond.png' },
  { id: 'BL0015', name: 'Blood Ritual', card_type: 'spell', element: 'blood', cost: 0, description: 'Sacrifice 1 creature you control to gain 3 temporary Shards this turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/287298fe4_Blood_Ritual.png' },
  { id: 'BL0016', name: 'Blood Magic', card_type: 'spell', element: 'blood', cost: 1, description: 'Target creature gains +3 AP. At End Phase, that creature is destroyed.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/48bf39802_Blood_Magic.png' },
  { id: 'BL0017', name: 'Soul Siphon', card_type: 'spell', element: 'blood', cost: 2, description: 'Deal 2 damage to a creature. If Controller is Blood-type, heal Controller for 2 CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/46768ea9e_Soul_Siphon.png' },
  { id: 'BL0018', name: 'Lifeblood', card_type: 'spell', element: 'blood', cost: 4, description: 'Sacrifice all creatures. Add their combined total CH to one of your Controllers as permanent Bonus Health.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d69624f7e_Lifeblood.png' },
  { id: 'BL0019', name: 'Mist of Fate', card_type: 'spell', element: 'blood', cost: 3, description: 'Destroy 1 enemy creature. If none, steal 2 CH. Non-Blood: Flip a coin.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/49780ed7f_Mist_of_Fate.png' },
  { id: 'BL0002', name: 'Zombie\'s Day', card_type: 'spell', element: 'blood', cost: 3, description: 'This turn, any creature card that was Recalled from the battlefield to its owner\'s hand earlier in the game may be played from hand for 0 cost; it enters Zombified. Zombified: cannot attack, cannot activate abilities, may block, may be sacrificed, removed from play on death.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/01171042a_Blood_Nova.png' },
  
  // Artifacts
  { id: 'BL0020', name: 'Katana of Fate', card_type: 'artifact', element: 'blood', cost: 2, description: 'Attached card gains +1 AP (+2 if Blood). If on Blood General or Ren, they gain RenLarKu\'s current AP.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/1cca5432b_Katana_of_Fate.png' },
  { id: 'BL0021', name: 'The Generals Armor', card_type: 'artifact', element: 'blood', cost: 3, description: 'The equipped card cannot be destroyed by Spell effects. Only combat damage can destroy it.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/7a81e65da_The_Generals_Armor.png' },
  { id: 'BL0022', name: 'Blood Pendant', card_type: 'artifact', element: 'blood', cost: 2, description: 'Whenever the equipped card deals damage, gain 1 extra Shard during your next Energy Phase.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/98f11f3d4_Blood_Pendant.png' },
  { id: 'BL0001', name: 'Vampiric Destiny', card_type: 'artifact', element: 'blood', cost: 3, description: 'On Play: Add 1 Swarm creature from deck/discard to hand. Passive: When equipped, add equipped creature\'s base CH to a creature/Controller. Active: When equipped creature is destroyed/sacrificed, mark it. At start of next turn, return marked creature to battlefield or hand.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/01171042a_Blood_Nova.png' },
];

// Fire Deck
export const FIRE_DECK = [
  // Controllers
  { id: 'FI0001', name: 'Draco Alec', card_type: 'controller', element: 'fire', cost: 4, ch: 12, ap: 1, description: 'Passive: All Fire-type creatures gain +1 AP. Active: Target 1 Fire creature can attack twice; destroyed at End Phase.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/2955aed0e_01xDracoAlec.png' },
  { id: 'FI0002', name: 'Flame Emperor', card_type: 'controller', element: 'fire', cost: 5, ch: 12, ap: 1, description: 'Passive: Spend 2 Shards to draw 1 card. Active: Deal 2 damage directly to an enemy Controller.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/35726c273_01xFlameEmperor.png' },
  { id: 'FI0003', name: 'Supreme Fire Spirit', card_type: 'controller', element: 'fire', cost: 6, ch: 12, ap: 1, description: 'Passive: All Fire creatures gain +1 AP. Active: Pay 3 Shards to destroy 1 enemy creature with 4 CH or less.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/55fde1a33_01xSupremeFireSpirit.png' },
  
  // Creatures
  { id: 'FI0004', name: 'Draco', card_type: 'creature', element: 'fire', cost: 3, ap: 4, ch: 6, description: 'Passive: Fire Spells cost 1 less while on field. If Draco Alec is Controller, Draco gains +2 AP.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6b26fcea6_02xDraco.png' },
  { id: 'FI0005', name: 'Emperor\'s Fire Dragon', card_type: 'creature', element: 'fire', cost: 6, ap: 7, ch: 9, description: 'Passive: If Flame Emperor is active, can attack twice. Active: Pay 2 Shards to deal 3 damage to an enemy creature.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e21f1908f_02xEmperorsFireDragon.png' },
  { id: 'FI0006', name: 'Flame Dragon', card_type: 'creature', element: 'fire', cost: 5, ap: 6, ch: 8, description: 'Bypass Swarm tokens and attack Controller if tokens are only shields.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/9d6bc8d4b_02xFlameDragon.png' },
  { id: 'FI0007', name: 'Fire Paladin', card_type: 'creature', element: 'fire', cost: 3, ap: 4, ch: 7, description: 'Passive: When it destroys an enemy creature, heal your active Controller for 2 CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/8ccc4b4c4_02xFirePaladin.png' },
  { id: 'FI0008', name: 'Flame Samurai', card_type: 'creature', element: 'fire', cost: 4, ap: 5, ch: 3, description: 'Passive: When attacking a creature with lower AP, takes no recoil damage. First Strike.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f644502a4_02xFlameSamurai.png' },
  { id: 'FI0009', name: 'Fire Knight', card_type: 'creature', element: 'fire', cost: 3, ap: 3, ch: 4, description: 'Charge', keywords: ['Charge'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/cc7c90e93_02xFireKnight.png' },
  { id: 'FI0010', name: 'Flaming Sword Bearer', card_type: 'creature', element: 'fire', cost: 3, ap: 3, ch: 5, description: 'On Death: Search Deck/Discard for Cursed Flame Sword or Katana of Fate; add to hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/9ac76e93a_02xFlamingSwordBearer.png' },
  { id: 'FI0011', name: 'Flame Guardian', card_type: 'creature', element: 'fire', cost: 3, ap: 1, ch: 10, description: 'Passive: Cannot attack. High CH shield.', keywords: ['Guardian'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/979df27ae_02xFlameGuardian.png' },
  { id: 'FI0012', name: 'Flame Wolf', card_type: 'creature', element: 'fire', cost: 2, ap: 2, ch: 2, description: 'Passive: If you play 1 Flame Wolf, you may play a second from hand for 0 Shards.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/708a0116b_02xFlameWolf.png' },
  { id: 'FI0013', name: 'Fire Witch', card_type: 'creature', element: 'fire', cost: 2, ap: 2, ch: 4, description: 'Passive: Deal 1 damage to an enemy Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d235a0ec6_02xFireWitch.png' },
  { id: 'FI0014', name: 'Flame Warlock', card_type: 'creature', element: 'fire', cost: 3, ap: 3, ch: 3, description: 'Passive: Sacrifice 1 of your creatures to deal 3 damage to any enemy creature.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/0ef3990ab_02xFlameWarlock.png' },
  
  // Spells
  { id: 'FI0015', name: 'Draco\'s Inferno', card_type: 'spell', element: 'fire', cost: 1, description: 'Req: Draco or Draco Alec on field. Deal 3 damage to all non-controllers. If BOTH are on field: deal 5 to all non-controllers and 2 to enemy Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/0fea674c3_02xDracosInferno.png' },
  { id: 'FI0016', name: 'Draco\'s Curse', card_type: 'spell', element: 'fire', cost: 3, description: 'Req: Draco Alec is Controller. Take control of 1 enemy creature. If it is sacrificed or destroyed, Draco can attack twice next turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5698abc25_02xDracosCurse.png' },
  { id: 'FI0017', name: 'Enflamed', card_type: 'spell', element: 'fire', cost: 4, description: 'Destroy 1 enemy creature. If Supreme Fire Spirit is active: enemy explodes after 1 turn; deal its CH to enemy Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/954ad10ed_02xEnflamed.png' },
  
  // Artifacts
  { id: 'FI0018', name: 'Draco\'s Slayer', card_type: 'artifact', element: 'fire', cost: 3, description: 'As Equip: Draco gains +3 AP for 2 turns. As Spell: destroy 1 enemy creature with 6 AP or higher.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d86df926b_02xDracosSlayer.png' },
  { id: 'FI0019', name: 'Cursed Flame Sword', card_type: 'artifact', element: 'fire', cost: 2, description: 'Equipped creature gains +3 AP. Every attack deals 1 damage to your Controller; if used by Draco, ignore self-damage for first 2 turns.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a5060ec82_02xCursedFlameSword.png' },
  { id: 'FI0020', name: 'Flame Orb', card_type: 'artifact', element: 'fire', cost: 2, description: 'Double 1 Fire creature\'s AP. Destroy that creature at End Phase; it deals 2 damage to all other creatures.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b5102c3fb_02xFlameOrb.png' },
];

// Light Deck
export const LIGHT_DECK = [
  // Controllers
  { id: 'LT0001', name: 'Cosmic Sunlight Goddess', card_type: 'controller', element: 'light', cost: 6, ch: 12, ap: 1, description: 'Passive: All Light creatures gain +1 AP. Active (4): Opponent cannot play Artifacts for 2 turns.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/dbee5f660_01xCosmicSunlightGoddess.png' },
  { id: 'LT0002', name: 'Perfect Light Being', card_type: 'controller', element: 'light', cost: 5, ch: 12, ap: 1, description: 'Passive: Light Spells cost 1 less (min 1). Active (3): Light Bind: Target cannot attack/use abilities for 2 turns.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e4f83a0f2_01xPerfectLightBeing.png' },
  { id: 'LT0003', name: 'Light Priest', card_type: 'controller', element: 'light', cost: 4, ch: 12, ap: 1, description: 'Passive: Heal 1 CH to all Light creatures at turn start. Active (2): Heal any target for 3 CH.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6ed801870_01xLightPriest.png' },

  // Creatures
  { id: 'LT0004', name: 'Michael', card_type: 'creature', element: 'light', cost: 6, ap: 9, ch: 9, description: 'Passive: Cannot be summoned unless Divine Light was played this turn. Targets lose all abilities and cannot heal.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/2e0db0cff_02xMichael.png' },
  { id: 'LT0005', name: 'Light Dragon', card_type: 'creature', element: 'light', cost: 5, ap: 6, ch: 7, description: 'Passive: When attacking, deal 2 damage to all other enemy creatures.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/66e3bfd6f_02xLightDragon.png' },
  { id: 'LT0006', name: 'Sun Golem', card_type: 'creature', element: 'light', cost: 5, ap: 2, ch: 10, description: 'Passive: Cannot attack. Reflects 50% of damage taken back to attacker.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ecaeef15a_02xSunGolem.png' },
  { id: 'LT0007', name: 'Sun Guardian', card_type: 'creature', element: 'light', cost: 4, ap: 4, ch: 8, description: 'Passive: While active, your Controllers and Spells cannot be targeted by enemy Spells.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/c07bd5b84_01xSunGuardian.png' },
  { id: 'LT0008', name: 'Sun Commander', card_type: 'creature', element: 'light', cost: 4, ap: 5, ch: 5, description: 'On Play: All Light creatures gain +2 AP for this turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/227c54fe8_02xSunCommander.png' },
  { id: 'LT0009', name: 'Sun Knight', card_type: 'creature', element: 'light', cost: 3, ap: 4, ch: 5, description: 'Passive: Guardian: Must be destroyed before opponent can attack your Controller.', keywords: ['Guardian'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6669305e6_02xSunKnight.png' },
  { id: 'LT0010', name: 'Radiant Witch', card_type: 'creature', element: 'light', cost: 3, ap: 3, ch: 4, description: 'On Play: Choose 1 creature; it gains "cannot be destroyed by Spells."', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b87554b94_02xRadiantWitch.png' },
  { id: 'LT0011', name: 'Sun Mage', card_type: 'creature', element: 'light', cost: 3, ap: 3, ch: 3, description: 'Passive: Spend 1 Shard to deal 2 damage to any target.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/bc6ecea56_02xSunMage.png' },
  { id: 'LT0012', name: 'Sun Wolf', card_type: 'creature', element: 'light', cost: 2, ap: 3, ch: 2, description: 'On Play: Haste. Immediately attacks', keywords: ['Charge'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/120e47c88_02xSunWolf.png' },
  { id: 'LT0013', name: 'Sun Fairy', card_type: 'creature', element: 'light', cost: 2, ap: 2, ch: 2, description: 'Passive: Sacrifice to grant your Controller 2 Shards.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/83e5ade47_02xSunFairy.png' },
  { id: 'LT0014', name: 'Light Spirit', card_type: 'creature', element: 'light', cost: 1, ap: 1, ch: 1, description: 'Passive: If Light Bind is active, gains AP/CH of the bound enemy creature. Vessel.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/8297f2bdd_02xLightSpirit.png' },

  // Spells
  { id: 'LT0015', name: 'Divine Elemental Convergence', card_type: 'spell', element: 'light', cost: 6, description: 'While active, no Spells on the field can be destroyed. All Light cards gain +1 AP. Collapse: If you have 0 Light creatures, destroy this card.', keywords: [], is_persistent: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a465509b7_02xDivineElementalConvergence.png' },
  { id: 'LT0016', name: 'Light Enchantment', card_type: 'spell', element: 'light', cost: 2, description: 'Attach to Controller. Cut CH in half; add that amount to Controller AP. If destroyed, the Controller is destroyed.', keywords: [], is_persistent: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/2a547b72a_02xLightEnchantment.png' },
  { id: 'LT0017', name: 'Divine Light', card_type: 'spell', element: 'light', cost: 3, description: 'Requires Light Enchantment. Restore Controller to 12 CH. Allows Michael to be summoned this turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/7bfb30ff0_02xDivineLight.png' },
  { id: 'LT0018', name: 'Light Bind', card_type: 'spell', element: 'light', cost: 2, description: 'Target enemy cannot attack/defend/use abilities for 3 turns. Enables Light Spirit stat gain.', keywords: [], is_persistent: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b30f300b9_02xLightBind.png' },
  { id: 'LT0019', name: 'Burning Blast', card_type: 'spell', element: 'light', cost: 2, description: 'Deal 3 damage to an enemy. If it kills the target, gain 1 Shard.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/01911f04e_02xBurningBlast.png' },

  // Artifacts
  { id: 'LT0020', name: 'Dagger of Fate', card_type: 'artifact', element: 'light', cost: 2, description: 'Equipped creature gets +2 AP. If it attacks a Controller, opponent discards 1 card.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/edc9768b0_02xDaggerofFate.png' },
  { id: 'LT0021', name: 'Sword of the Sun Guardian', card_type: 'artifact', element: 'light', cost: 3, description: 'Equipped creature gets +4 AP. Sun Knight gains Stealth; Stealth attacks deal 50% damage to Controller.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d463cf9bb_02xSwordoftheSunGuardian.png' },
];

// Shadow Deck
export const SHADOW_DECK = [
  { id: 'SH0001', name: 'Darth Ayres', card_type: 'controller', element: 'shadow', cost: 4, ch: 12, ap: 1, description: 'Passive: All enemy creatures lose 1 AP. Active (4): Dark Nova: Deal 2 damage to all enemy creatures.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/68a0c661a_01xDarthAyres.png' },
  { id: 'SH0002', name: 'Umbra Reaver', card_type: 'controller', element: 'shadow', cost: 5, ch: 12, ap: 1, description: 'Passive: If opponent draws extra cards, they lose 1 CH. Active (2): Deal 2 damage and heal active Controller 2 CH.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/276a9c403_01xUmbraReaver.png' },
  { id: 'SH0003', name: 'Shadow Master', card_type: 'controller', element: 'shadow', cost: 6, ch: 12, ap: 1, description: 'Passive: May play Shadow Spells from discard (+1 cost). Active: Dark Dimension: Send 1 creature to the Void for 2 turns.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b251e1e80_01xShadowMaster.png' },
  { id: 'SH0004', name: 'Dark Samurai', card_type: 'creature', element: 'shadow', cost: 4, ap: 5, ch: 4, description: 'Passive: +1 AP for every Shadow card in discard. If Shadow Spell is used on him: destroy 1 enemy Artifact or Spell.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4cc7e4490_02xDarkSamurai.png' },
  { id: 'SH0005', name: 'Dark Phantom', card_type: 'creature', element: 'shadow', cost: 3, ap: 3, ch: 2, description: 'Stealth; if Shadow Spell used on him: cannot be targeted by spells until next turn.', keywords: ['Stealth'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a215f2868_02xDarkPhantom.png' },
  { id: 'SH0006', name: 'Dark Knight', card_type: 'creature', element: 'shadow', cost: 4, ap: 5, ch: 6, description: 'Passive: Creatures with 3 AP or less cannot attack this. Gains AP from Dark Chains siphon.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6e72837fc_02xDarkKnight.png' },
  { id: 'SH0007', name: 'Shadow Knight', card_type: 'creature', element: 'shadow', cost: 3, ap: 4, ch: 4, description: 'Passive: +2 damage if opponent has no creatures. Gains AP from Dark Chains siphon.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b52fbaf2b_02xShadowKnight.png' },
  { id: 'SH0008', name: 'Dark Warlock', card_type: 'creature', element: 'shadow', cost: 3, ap: 2, ch: 3, description: 'On Play: Force opponent to discard 1 card. Enables Black Spell bonus.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/c9841be26_02xDarkWarlock.png' },
  { id: 'SH0009', name: 'Sigurd Shadowhand', card_type: 'creature', element: 'shadow', cost: 3, ap: 3, ch: 4, description: 'Passive: When attacking, look at opponent hand; choose 1 card for them to discard.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a630da0fc_02xSigurdShadowhand.png' },
  { id: 'SH0010', name: 'Shadow Wraith', card_type: 'creature', element: 'shadow', cost: 5, ap: 6, ch: 5, description: 'Passive: Gains +1 AP permanently when it destroys a creature. Returns from Dark Dimension with Double AP.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/00f243dd8_02xShadowWraith.png' },
  { id: 'SH0011', name: 'Night Terror', card_type: 'creature', element: 'shadow', cost: 2, ap: 2, ch: 2, description: 'Passive: Hit target cannot attack/use abilities next turn. Returns from Dark Dimension with Double AP.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a64f7e295_02xNightTerror.png' },
  { id: 'SH0012', name: 'Dark Dimension', card_type: 'spell', element: 'shadow', cost: 3, description: 'Banish 1 creature for 2 turns. If your Wraith/Phantom/Terror and Shadow Master active: returns with Double AP for 1 turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/1735c73fe_02xDarkDimension.png' },
  { id: 'SH0013', name: 'Black Spell', card_type: 'spell', element: 'shadow', cost: 4, description: 'Summon 2 Tokens (2/2). If Dark Warlock is out, summon 1 Shadow creature from hand for 0 cost. None can attack this turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4c2e06f40_02xBlackSpell.png' },
  { id: 'SH0014', name: 'Dark Ritual', card_type: 'spell', element: 'shadow', cost: 4, description: 'Sacrifice 1 creature; gain 5 Shards. If Shadow Master active: get Shadow\'s Embrace from deck and 0-cost instant summon from hand during any phase.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/53d9aab8a_02xDarkRitual.png' },
  { id: 'SH0015', name: 'Shadow\'s Embrace', card_type: 'spell', element: 'shadow', cost: 3, description: 'Control 1 enemy creature. If Darth Ayres bonus: steal 1 card from opponent hand as shield token. Sacrifice stolen card to heal Controller CH.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/cdf35a509_01xShadowsEmbrace.png' },
  { id: 'SH0016', name: 'Dark Chains', card_type: 'spell', element: 'shadow', cost: 3, description: 'Enemy: target cannot attack; Knights siphon its AP. Self: opponent must attack this card; survives 1st hit, dies on 2nd hit same turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/27659eef0_02xDarkChains.png' },
  { id: 'SH0017', name: 'Shadow Spell', card_type: 'spell', element: 'shadow', cost: 2, description: 'Target Shadow creature gains +2 AP and Stealth. Triggers Samurai or Phantom synergy.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5f897972b_02xShadowSpell.png' },
  { id: 'SH0018', name: 'Dark Nova', card_type: 'spell', element: 'shadow', cost: 4, description: 'Deal 3 damage to all creatures. If Darth Ayres is out, your units are safe. Gain 1 Shard next turn for each creature destroyed.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/3bca50ad4_02xDarkNova.png' },
  { id: 'SH0019', name: 'Thor\'s Hammer', card_type: 'artifact', element: 'shadow', cost: 5, description: 'Equipped creature gains +5 AP. When attacking, deal 1 damage to all other enemy creatures.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/bedde560f_02xThorsHammer.png' },
  { id: 'SH0020', name: 'Cursed Sword', card_type: 'artifact', element: 'shadow', cost: 2, description: 'Equipped creature gains +4 AP. Ignores Swarm tokens. Equipped creature loses 2 CH each End Phase.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/90072dd96_02xCursedSword.png' },
  { id: 'SH0021', name: 'Dark Orb', card_type: 'artifact', element: 'shadow', cost: 2, description: 'When dealing damage, look at top 3 cards and take a Shadow Spell. If sacrificed via Dark Ritual, draw 2 cards.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/30bb2a481_02xDarkOrb.png' },
];

// Electric Deck
export const ELECTRIC_DECK = [
  { id: 'EC0001', name: 'The Luminary', card_type: 'controller', element: 'electric', cost: 6, ch: 12, ap: 1, description: 'Passive: When an Electric Spell is played, deal 1 damage to all enemy creatures. Active (3): Target creature gains +4 AP and Haste.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/af36677f5_01xTheLuminary.png' },
  { id: 'EC0002', name: 'Spark White Dragon', card_type: 'controller', element: 'electric', cost: 5, ch: 12, ap: 1, description: 'Passive: When this Controller attacks with an Artifact, deal 2 damage to a second enemy. Active (4): Deal 5 damage.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/38916fca9_01xSparkWhiteDragon.png' },
  { id: 'EC0003', name: 'Spark Knight', card_type: 'controller', element: 'electric', cost: 4, ch: 12, ap: 1, description: 'Passive: Electric Artifacts cost 1 less. Active (2): Target enemy cannot use its Passive ability next turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/8eb39b94b_01xSparkKnight.png' },
  { id: 'EC0004', name: 'Volt-Howler', card_type: 'creature', element: 'electric', cost: 4, ap: 5, ch: 5, description: 'Passive: If targeted by an enemy spell, deal 2 damage to the enemy Controller. Damage dealt to creatures under Binding Chains is doubled.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4f77338b8_02xVolt-Howler.png' },
  { id: 'EC0005', name: 'Lightning Giant', card_type: 'creature', element: 'electric', cost: 5, ap: 5, ch: 9, description: 'Passive: On attack, target is Paralyzed for 1 turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ae3509fb0_02xLightningGiant.png' },
  { id: 'EC0006', name: 'Lightning Samurai', card_type: 'creature', element: 'electric', cost: 4, ap: 5, ch: 4, description: 'Passive: If it destroys a creature, it deals its full AP to enemy Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f5865838c_02xLightningSamurai.png' },
  { id: 'EC0007', name: 'Lightning Zephyr Knight', card_type: 'creature', element: 'electric', cost: 4, ap: 4, ch: 4, description: 'On Play: Summon 1 Zephyr from hand/deck as Equip (+2/+2). If attacked by >6 AP, discard Zephyr to stay on field.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/0c3d0e604_02xLightningKnight2.png' },
  { id: 'EC0008', name: 'Viking of Light', card_type: 'creature', element: 'electric', cost: 3, ap: 4, ch: 4, description: 'Passive: If your Controller has an Artifact equipped, this gains Stealth.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/42f450041_02xVikingofLight.png' },
  { id: 'EC0009', name: 'Lightning Knight', card_type: 'creature', element: 'electric', cost: 3, ap: 4, ch: 4, description: 'Passive: Reduces all incoming damage by 1.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/450788d75_02xLightningKnight.png' },
  { id: 'EC0010', name: 'Lightning Mage', card_type: 'creature', element: 'electric', cost: 3, ap: 3, ch: 3, description: 'Passive: Your equipped Artifacts gain +2 AP for this turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/39f57310d_02xLightningMage.png' },
  { id: 'EC0011', name: 'Lightning Wielder', card_type: 'creature', element: 'electric', cost: 3, ap: 3, ch: 4, description: 'Passive: Once per turn, transfer 1 Artifact between cards for 0 cost.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/44ef5449b_01xLightningWielder.png' },
  { id: 'EC0012', name: 'Cosmic Witch', card_type: 'creature', element: 'electric', cost: 2, ap: 2, ch: 3, description: 'Passive: Controller Active abilities cost 1 less while active.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/278e012ad_02xCosmicWitch.png' },
  { id: 'EC0013', name: 'Spirit of Lightning', card_type: 'creature', element: 'electric', cost: 1, ap: 1, ch: 1, description: 'Passive: Sacrifice: gain 2 Shards this turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/99367412a_02xSpiritofLightning.png' },
  { id: 'EC0014', name: 'Zephyr', card_type: 'creature', element: 'electric', cost: 2, ap: 2, ch: 2, description: 'Passive: Equip to LZK: +2 AP/+2 CH. Discard to prevent LZK removal from attacks >6 AP.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f2ee187ed_02xZephyr.png' },
  { id: 'EC0015', name: 'Binding Chains of Lightning', card_type: 'spell', element: 'electric', cost: 3, description: 'Target cannot attack. Loses 1 AP per Electric ally. If AP hits 0, channels damage to the weakest Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/59c74e946_02xBindingChainsofLightning.png' },
  { id: 'EC0016', name: 'Surreal Light', card_type: 'spell', element: 'electric', cost: 4, description: '1 Electric creature gains +4 AP and Haste. On kill, play 1 Electric Artifact from hand for 0 cost.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/260b96c77_02xSurrealLight.png' },
  { id: 'EC0017', name: 'Wolf Lightning Strike', card_type: 'spell', element: 'electric', cost: 2, description: 'Deal 4 damage. If it destroys the target, damage jumps to enemy Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d9442a7e2_02xWolfLightningStrike.png' },
  { id: 'EC0018', name: 'Lightning Stone', card_type: 'artifact', element: 'electric', cost: 2, description: 'Electric spells cost 1 less. If destroyed, opponent loses 2 Shards.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f6211ff63_02xLightningStone.png' },
  { id: 'EC0019', name: 'Lightning Gauntlet', card_type: 'artifact', element: 'electric', cost: 2, description: 'If equipped to a Controller, their attacks Paralyze target for 1 turn.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6b49c5461_02xLightningGauntlet.png' },
  { id: 'EC0020', name: 'Spark Knight Blade', card_type: 'artifact', element: 'electric', cost: 2, description: 'Equipped creature/Controller gains +2 AP. Takes 0 counter-damage when attacking.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f5e3ae23a_02xSparkKnightBlade.png' },
];

// Cryo Deck
export const CRYO_DECK = [
  { id: 'CR0001', name: 'CyRelli Princess', card_type: 'controller', element: 'cryo', cost: 6, ch: 12, ap: 1, description: 'On Play: Summon CyRelli\'s Tiger. Passive: If Tiger is destroyed by an effect (not battle), add its 5 CH to the Princess.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e9c470e57_01xCyRelliPrincess.png' },
  { id: 'CR0002', name: 'Guardian Princess', card_type: 'controller', element: 'cryo', cost: 5, ch: 12, ap: 1, description: 'On Play: Cryo allies gain +2 CH if Sphere of Ice is active. Active (3): Target ally cannot be destroyed by battle this turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/0f06701e7_01xGuardianPrincess.png' },
  { id: 'CR0003', name: 'Royal Ice Knight', card_type: 'controller', element: 'cryo', cost: 4, ch: 12, ap: 1, description: 'On Play: Frozen creatures gain +2 AP. Active (2): Summon a 3/3 Wyrm with Haste for one turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/24821ac60_01xRoyalIceKnight.png' },
  { id: 'CR0004', name: 'CyRelli\'s Tiger', card_type: 'creature', element: 'cryo', cost: 4, ap: 5, ch: 5, description: 'Passive: Cannot attack. Its 5 AP is added to CyRelli Princess. While on field, Princess cannot be targeted by attacks.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a4a368ba7_02xCyRellisTiger.png' },
  { id: 'CR0005', name: 'Frost Wyrm', card_type: 'creature', element: 'cryo', cost: 5, ap: 5, ch: 5, description: 'Passive: Freeze effects last +1 turn. If Ice Breath is played, trigger 3-turn lockdown.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a2e921431_02xFrostWyrm.png' },
  { id: 'CR0006', name: 'Ice Yetti', card_type: 'creature', element: 'cryo', cost: 6, ap: 7, ch: 8, description: 'Passive: When attacking, target and adjacent creatures are Frozen for 1 turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6b475f327_02xIceYetti.png' },
  { id: 'CR0007', name: 'Frozen Troll', card_type: 'creature', element: 'cryo', cost: 5, ap: 4, ch: 10, description: 'Passive: Heals 2 CH at the start of every turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ad94135d2_02xFrozenTroll.png' },
  { id: 'CR0008', name: 'Frozen Golem', card_type: 'creature', element: 'cryo', cost: 4, ap: 2, ch: 12, description: 'Passive: Taunt', keywords: ['Guardian'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6b52ddb0c_02xFrozenGolem.png' },
  { id: 'CR0009', name: 'Ice Protector', card_type: 'creature', element: 'cryo', cost: 3, ap: 3, ch: 7, description: 'Passive: Your Controller takes 0 damage from enemy Spells. If destroyed, Freeze the attacker for 2 turns.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/da669c1b7_02xIceProtector.png' },
  { id: 'CR0010', name: 'Frozen Knight', card_type: 'creature', element: 'cryo', cost: 3, ap: 4, ch: 5, description: 'Passive: Damaged creatures are Frozen on opponent\'s next turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/9aa02df0e_02xFrozenKnight.png' },
  { id: 'CR0011', name: 'Cryo Mage', card_type: 'creature', element: 'cryo', cost: 3, ap: 3, ch: 3, description: 'On Play: Freeze one enemy creature.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f28e33849_02xCryoMage.png' },
  { id: 'CR0012', name: 'Frozen Spirit', card_type: 'creature', element: 'cryo', cost: 1, ap: 1, ch: 1, description: 'Passive: If only 1 enemy is on field and it is Frozen, hit Controller directly. Return to hand after attack.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/9ce4d6f14_02xFrozenSpirit.png' },
  { id: 'CR0013', name: 'Frozen Barrage', card_type: 'spell', element: 'cryo', cost: 4, description: 'If no allies: Recall enemies to hand. Creatures with 3 AP or less are destroyed.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/9087edc97_02xFrozenBarrage.png' },
  { id: 'CR0014', name: 'Ice Breath', card_type: 'spell', element: 'cryo', cost: 3, description: 'If Frost Wyrm is out, enemies can\'t attack for 3 turns. If enemies are Cryo, play Freezing Spell for 0 cost.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e9b1ca87f_02xIceBreath.png' },
  { id: 'CR0015', name: 'Freezing Spell', card_type: 'spell', element: 'cryo', cost: 3, description: 'No enemy creatures or Controllers can attack on their next turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/95044b7fe_02xFreezingSpell.png' },
  { id: 'CR0016', name: 'Blizzard', card_type: 'spell', element: 'cryo', cost: 3, description: 'All creatures except Cryo are Frozen for 1 turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/c775804c7_02xBlizzard.png' },
  { id: 'CR0017', name: 'White Out', card_type: 'spell', element: 'cryo', cost: 2, description: 'All enemy creatures lose 2 AP for 1 turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e7c654140_01xWhiteOut.png' },
  { id: 'CR0018', name: 'Defrost', card_type: 'spell', element: 'cryo', cost: 1, description: 'Cleanse "cannot attack" effects. Give +3 AP. If Royal Ice Knight active, tutor Blizzard or White Out.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ab1fdefa2_02xDefrost.png' },
  { id: 'CR0019', name: 'Sphere of Ice', card_type: 'artifact', element: 'cryo', cost: 3, description: 'If on Guardian Princess, summon Protector/Knight for 0. Controller gains +3 AP, but loses 1 AP per death.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d61a161a2_02xSphereofIce.png' },
  { id: 'CR0020', name: 'Enchanted Ice Crystal', card_type: 'artifact', element: 'cryo', cost: 2, description: 'Cryo spells cost 1 less. Gain +1 Shard once per turn when you Freeze an enemy.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/0a3337ca0_02xEnchantedIceCrystal.png' },
];

// Earth Deck
export const EARTH_DECK = [
  { id: 'EarthCtrl1', name: 'Earth Spirit', card_type: 'controller', element: 'earth', cost: 4, ch: 12, ap: 1, description: 'Passive: Play a Nature Creature: gain 1 Shard (once per turn). Active (2): Search deck for Emerald or Guardian of the Tree.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/1b372e48a_01xEarthSpirit.png' },
  { id: 'EarthCtrl2', name: 'Earth Defender', card_type: 'controller', element: 'earth', cost: 5, ch: 12, ap: 1, description: 'Passive: Allies cannot be moved to hand/deck by enemy effects. Active (3): Paralyze 1 enemy for 2 turns; -2 CH each turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4ff9b6b31_01xEarthDefender.png' },
  { id: 'EarthCtrl3', name: 'Giant', card_type: 'controller', element: 'earth', cost: 6, ch: 12, ap: 1, description: 'Passive: Attack with Artifact: opponent discards 1 card. Active (4): Deal 3 damage to all enemy creatures.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5accb4966_01xGiant.png' },
  { id: 'EarthC1', name: 'Guardian of the Tree', card_type: 'creature', element: 'earth', cost: 5, ap: 4, ch: 10, description: 'On Play: Search deck/discard for Vine Tree or Vine Coffin. Passive: All Nature allies heal 2 CH at end of your turn.', keywords: [], image_url: '' },
  { id: 'EarthC2', name: 'Moss Dragon', card_type: 'creature', element: 'earth', cost: 6, ap: 6, ch: 10, description: 'Passive: Reduces all incoming damage by 2.', keywords: [], image_url: '' },
  { id: 'EarthC3', name: 'Earth Serpent', card_type: 'creature', element: 'earth', cost: 4, ap: 4, ch: 7, description: 'Passive: Untargetable if another Nature ally is present. +3 damage vs Paralyzed enemies.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d2d8d2e8d_02xEarthSerpant.png' },
  { id: 'EarthC4', name: 'Earth Knight', card_type: 'creature', element: 'earth', cost: 4, ap: 5, ch: 6, description: 'Passive: Artifacts cannot be destroyed by spells. On Play: Ally gains +3 CH and Freeze immunity.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4a845b951_02xEarthKnight.png' },
  { id: 'EarthC5', name: 'Ogre Attacker', card_type: 'creature', element: 'earth', cost: 4, ap: 6, ch: 4, description: 'Passive: Destroy equipped card and equipment. Takes 1 CH damage vs unequipped; cannot attack next turn.', keywords: [], image_url: '' },
  { id: 'EarthC6', name: 'Witch of Nature', card_type: 'creature', element: 'earth', cost: 2, ap: 2, ch: 5, description: 'On Play: Heal ally for 3 CH. Passive: If equipped with Staff, attacks heal lowest ally for 2 CH.', keywords: [], image_url: '' },
  { id: 'EarthC7', name: 'Gnome Warlock', card_type: 'creature', element: 'earth', cost: 3, ap: 3, ch: 5, description: 'Passive: When a Nature ally is destroyed, gain 1 Shard (limit 1/turn).', keywords: [], image_url: '' },
  { id: 'EarthC8', name: 'Wolfen', card_type: 'creature', element: 'earth', cost: 3, ap: 3, ch: 3, description: 'Passive: Haste; +2 AP if you control another Wolfen or Goblin Knight.', keywords: ['Charge'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b28626c7a_02xCallofthePack.png' },
  { id: 'EarthC9', name: 'Goblin Knight', card_type: 'creature', element: 'earth', cost: 3, ap: 3, ch: 4, description: 'On Play: Summon another Goblin Knight from hand/deck for 0.', keywords: [], image_url: '' },
  { id: 'EarthC10', name: 'Golem Defender', card_type: 'creature', element: 'earth', cost: 5, ap: 3, ch: 10, description: 'Taunt.', keywords: ['Guardian'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5444cd812_01xGolemDefender.png' },
  { id: 'EarthS1', name: 'Tree of Life', card_type: 'spell', element: 'earth', cost: 4, description: 'If Guardian present: Guardian absorbs all ally CH (not Controllers), AP becomes 0, Taunts everyone. Else: Search Earth Staff.', keywords: [], image_url: '' },
  { id: 'EarthS2', name: 'Nature\'s Bliss', card_type: 'spell', element: 'earth', cost: 2, description: 'If Witch is out: auto-equip Staff + Blade from hand. Else: summon Gnome or Goblin from hand.', keywords: [], image_url: '' },
  { id: 'EarthS3', name: 'Vine Tree', card_type: 'spell', element: 'earth', cost: 3, description: 'Summon two 0/5 Wall of Vines tokens with Taunt.', keywords: [], image_url: '' },
  { id: 'EarthS4', name: 'Vine Coffin', card_type: 'spell', element: 'earth', cost: 3, description: 'Target is Paralyzed for 2 turns and loses 2 CH each turn.', keywords: [], image_url: '' },
  { id: 'EarthS5', name: 'Nature\'s Blade', card_type: 'spell', element: 'earth', cost: 2, description: 'Target gains +3 AP. If it destroys an enemy this turn, draw 1 card.', keywords: [], image_url: '' },
  { id: 'EarthA1', name: 'Earth Staff', card_type: 'artifact', element: 'earth', cost: 2, description: 'Equipped card gains +4 CH. If attacked, attacker takes 1 damage.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ed4dda5dd_02xEarthStaff.png' },
  { id: 'EarthA2', name: 'Enchanted Emerald', card_type: 'artifact', element: 'earth', cost: 3, description: 'Every 2 turns, gain +1 extra Shard.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/38d4392bf_02xEnchantedEmerald.png' },
];

// Water Deck
export const WATER_DECK = [
  { id: 'WA00001', name: 'Neptune', card_type: 'controller', element: 'water', cost: 6, ch: 12, ap: 1, description: 'On Play: Search deck/discard for 1 Water Safe. If The Kraken is on field, add 1 Kraken Slash to hand. Passive: Gain 1 Shard whenever an enemy is Recalled (bounced).', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/1161ebfa9_01xNeptune.png' },
  { id: 'WA00002', name: 'The Kraken', card_type: 'controller', element: 'water', cost: 4, ch: 12, ap: 1, description: 'On Play: Play a Water Spell: opponent loses 1 Shard. Passive: Ink Cloud (3): Reaction during opponent attack; you choose the attack target; must hit own creatures first or own Controller if none. Reaction', keywords: ['Reaction'], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/66acca2e4_TheKraken.jpg' },
  { id: 'WA00003', name: 'Mermaid Empress', card_type: 'controller', element: 'water', cost: 5, ch: 12, ap: 1, description: 'On Play: Water Guardians and Royal Guards gain +2 AP. Deep Recovery (2): Heal target Water creature for 4 CH.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/c0ae3f642_01xMermaidEmperess.png' },
  { id: 'WA00004', name: 'Supreme Water Dragon', card_type: 'creature', element: 'water', cost: 6, ap: 8, ch: 10, description: 'On Play: Return all enemy creatures with 4 AP or less to hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f9185f4d1_01xSupremeWaterDragon.png' },
  { id: 'WA00005', name: 'Water Golem', card_type: 'creature', element: 'water', cost: 5, ap: 2, ch: 12, description: 'Passive: Taunt; takes 0 damage from creatures with 6+ AP.', keywords: ['Guardian'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/74f501a8d_02xWaterGolem.png' },
  { id: 'WA00006', name: 'Guardians of Atlantis', card_type: 'creature', element: 'water', cost: 4, ap: 4, ch: 6, description: 'On Play: Your Controller takes 50% less damage from Spells.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/053690810_02xGuardiansofAtlantis.png' },
  { id: 'WA00007', name: 'Shark', card_type: 'creature', element: 'water', cost: 4, ap: 5, ch: 4, description: 'On Play: Gains +3 AP when attacking a creature already damaged this turn.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4ccab0af8_02xShark.png' },
  { id: 'WA00008', name: 'Royal Guard', card_type: 'creature', element: 'water', cost: 3, ap: 3, ch: 6, description: 'On Play: While Mermaid Empress is out, this card can take damage in her place.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f972464ec_02xRoyalGuard.png' },
  { id: 'WA00009', name: 'Lizard Warrior', card_type: 'creature', element: 'water', cost: 3, ap: 4, ch: 4, description: 'Passive: If a Water Spell was played this turn: +2 AP and can attack twice.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/35f76da4c_02xLizardWarrior.png' },
  { id: 'WA00010', name: 'Water Warlock', card_type: 'creature', element: 'water', cost: 3, ap: 3, ch: 5, description: 'On Play: When this deals damage to an enemy creature, steal 1 Shard.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/037f5c3d9_02xWaterWarlock.png' },
  { id: 'WA00011', name: 'Water Guardian', card_type: 'creature', element: 'water', cost: 2, ap: 2, ch: 6, description: 'Passive: If recalled to hand, may summon again immediately for 0 cost.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/85fefdbf4_02xWaterGuardian.png' },
  { id: 'WA00012', name: 'Water Familiar', card_type: 'creature', element: 'water', cost: 1, ap: 1, ch: 1, description: 'Passive: Sacrifice: look at opponent hand; choose 1 Spell, they cannot play it for 2 turns.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5bae658e2_02xWaterFamiliar.png' },
  { id: 'WA00013', name: 'Water Safe', card_type: 'spell', element: 'water', cost: 2, description: 'Water allies cannot be targeted by non-Water. Maintenance: Pay 1 CH from Mermaid Empress per turn or discard this card.', keywords: [], is_persistent: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/802393418_02xWaterSafe.png' },
  { id: 'WA00014', name: 'Whirlpool', card_type: 'spell', element: 'water', cost: 2, description: 'Opponent cannot play Spells next turn. If a Persistent Spell is active, destroy it and add 1 Tidal Wave to your hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/3b1e85a1d_02xWhirlpool.png' },
  { id: 'WA00015', name: 'Water Entrapment', card_type: 'spell', element: 'water', cost: 3, description: 'Target is Paralyzed for 3 turns. If target is Fire attribute, discard it immediately.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f925a24a0_02xWaterEntrapment.png' },
  { id: 'WA00016', name: 'Kraken Slash', card_type: 'spell', element: 'water', cost: 3, description: 'Deal 5 damage. If target survives, return it to owner\'s hand.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/3fd7931fa_02xKrakenSlash.png' },
  { id: 'WA00017', name: 'Tidal Wave', card_type: 'spell', element: 'water', cost: 4, description: 'Return all non-Water creatures to owner\'s hands.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ea1064351_02xTidalWave.png' },
  { id: 'WA00018', name: 'Dragon\'s Tsunami', card_type: 'spell', element: 'water', cost: 5, description: 'Requires Supreme Water Dragon. Destroy all enemy creatures with 3 CH or less; recall the rest.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/fc994f68f_02xWaterDragonsTsunami.png' },
  { id: 'WA00019', name: 'Spear of Neptune', card_type: 'artifact', element: 'water', cost: 3, description: 'Equipped card gains +4 AP. On attack, return target to hand after damage.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/8aec3fb51_02xSpearofNeptune.png' },
  { id: 'WA00020', name: 'Crown of Neptune', card_type: 'artifact', element: 'water', cost: 4, description: 'Water Spells cost 1 less. Gain 1 Shard every time you play a Water Spell.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/80a223747_02xCrownofNeptune.png' },
];

// Wind Deck
export const WIND_DECK = [
  // Controllers
  { id: 'WD0002', name: 'Wind Knight', card_type: 'controller', element: 'wind', cost: 4, ch: 12, ap: 1, description: 'On Play: Gale Force: Your Wind creatures gain Haste. Active (3): Ronin Strike: Target ally can attack twice this turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/864aa6ea9_Wind_Knight.png' },
  { id: 'WD0003', name: 'Wind Witch', card_type: 'controller', element: 'wind', cost: 5, ch: 12, ap: 1, description: 'On Play: Sky Blessing: First Wind Spell each turn costs 1 less. Active (2): Mirage Veil: Target ally cannot be targeted by spells for 1 turn.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/2abf56ff5_Wind_Witch.png' },
  { id: 'WD0004', name: 'Spirit of the Wind', card_type: 'controller', element: 'wind', cost: 6, ch: 12, ap: 1, description: 'Passive: Cyclonic Flow: Gain 1 Shard when a card is Recalled. Active: Ghost Strike: If Smoke Body is active, can attack Controllers directly.', keywords: [], is_unique: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/23e8d7a3f_Spirit_of_the_Wind.png' },
  
  // Creatures
  { id: 'WD0005', name: 'Wind Dragon', card_type: 'creature', element: 'wind', cost: 6, ap: 7, ch: 9, description: 'Passive: Attacks deal 2 splash damage to all other enemies. Protects your board from Sweeping Wind.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/63b0f5281_Wind_Dragon.png' },
  { id: 'WD0006', name: 'Wind Golem', card_type: 'creature', element: 'wind', cost: 5, ap: 3, ch: 11, description: 'Passive: Reduces incoming non-magical damage by 3. Taunt. Summoned by Wind Mirage.', keywords: ['Guardian'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/26a5bddc6_Wind_Golem.png' },
  { id: 'WD0007', name: 'Wind Ronin', card_type: 'creature', element: 'wind', cost: 4, ap: 5, ch: 5, description: 'Double Strike.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/e11a24011_Wind_Ronin.png' },
  { id: 'WD0008', name: 'Wind Warrior', card_type: 'creature', element: 'wind', cost: 4, ap: 4, ch: 6, description: 'On Play: Give an ally +2 AP. Passive: Gains +2 AP per Wind ally if your side holds a creature via Wind Control.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b7f8c0d2c_Wind_Warrior.png' },
  { id: 'WD0009', name: 'Wind Warlock', card_type: 'creature', element: 'wind', cost: 3, ap: 3, ch: 5, description: 'Passive: Arcane Anchor: While on field, Dark Infusion becomes a searcher. If in Controller slot, Spell Release becomes a board-wipe.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/dc56a9386_Wind_Warlock.png' },
  { id: 'WD0010', name: 'Wind Keeper', card_type: 'creature', element: 'wind', cost: 3, ap: 2, ch: 7, description: "Passive: Artifacts can't be destroyed. If holding Wind Sword, attacks return enemies to hand (1x/turn).", keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f2f198200_Wind_Keeper.png' },
  { id: 'WD0011', name: 'Wind Pack', card_type: 'creature', element: 'wind', cost: 3, ap: 3, ch: 3, description: 'On Play: Summon another Wind Pack from deck for 0 cost.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6f574a9fa_Wind_Pack.png' },
  
  // Spells
  { id: 'WD0012', name: 'Wind Control', card_type: 'spell', element: 'wind', cost: 4, description: 'Take an enemy for 2 turns, then destroy it. Buffs Wind Warrior based on your Wind allies.', keywords: [], is_persistent: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/4f8e203a2_Wind_Control.png' },
  { id: 'WD0013', name: 'Sweeping Wind', card_type: 'spell', element: 'wind', cost: 5, description: 'Recall all creatures. If Dragon is out, only hits enemies. Draw 1: if Spell, play; if Creature, shuffle.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/39eadf38f_Sweeping_Wind.png' },
  { id: 'WD0014', name: 'Spell Release', card_type: 'spell', element: 'wind', cost: 3, description: "Destroy 1 target Spell. If Warlock is Controller, destroy all enemy Spells/Persistent Spells.", keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b64e2e489_Spell_Release.png' },
  { id: 'WD0015', name: 'Dark Infusion', card_type: 'spell', element: 'wind', cost: 3, description: 'Search for Wind Control if Warlock is out, or deal 3 damage to enemy Controller.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/5b96e9259_Dark_Infusion.png' },
  { id: 'WD0016', name: 'Wind Protection', card_type: 'spell', element: 'wind', cost: 3, description: 'If you have 2+ Wind allies, they cannot be attacked for 3 turns.', keywords: [], is_persistent: true, image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/d1b71d78c_Wind_Protection.png' },
  { id: 'WD0017', name: 'Wind Mirage', card_type: 'spell', element: 'wind', cost: 3, description: 'Stops an attack on Controller; summons a defensive Wind Golem (cannot attack).', keywords: ['Reaction'], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/1d4295042_Wind_Mirage.png' },
  { id: 'WD0018', name: 'Smoke Body', card_type: 'spell', element: 'wind', cost: 2, description: 'Target is invulnerable/untargetable. Enables Spirit of the Wind direct attacks.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/2b9d1365d_Smoke_Body.png' },
  { id: 'WD0001', name: 'Tempest', card_type: 'spell', element: 'wind', cost: 4, description: 'For each enemy creature that was Recalled or returned to hand this turn, deal 1 damage to an enemy Controller. If 3+ were Recalled/returned, draw 1 card.', keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a0f807f9f_Elemental_Convergence.png' },
  
  // Artifacts
  { id: 'WD0019', name: 'Wind Orb', card_type: 'artifact', element: 'wind', cost: 2, description: '+1 AP/+1 CH to all Wind allies. Draw 1 card when a Wind ally is Recalled.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f22199c29_Wind_Orb.png' },
  { id: 'WD0020', name: 'Wind Staff', card_type: 'artifact', element: 'wind', cost: 3, description: 'Equipped: When this card attacks, opponent discards 1 card.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/17d39f9da_Wind_Staff.png' },
  { id: 'WD0021', name: 'Wind Sword', card_type: 'artifact', element: 'wind', cost: 3, description: 'Equipped: +2 AP/+2 CH. On Wind Keeper, attacks bounce enemies to hand.', is_persistent: true, keywords: [], image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/0f349e884_Wind_Sword.png' },
];

const DECKS = {
  fire: { 
    name: 'Fire', 
    cards: FIRE_DECK, 
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b5102c3fb_02xFlameOrb.png',
    gradient: 'from-orange-600 to-red-600',
    emoji: '🔥'
  },
  water: { 
    name: 'Water', 
    cards: WATER_DECK, 
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/3c15b8b15_02xCrownofNeptune.png',
    gradient: 'from-blue-600 to-cyan-600',
    emoji: '💧'
  },
  earth: { 
    name: 'Earth', 
    cards: EARTH_DECK, 
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ed4dda5dd_02xEarthStaff.png',
    gradient: 'from-green-600 to-emerald-700',
    emoji: '🌿'
  },
  wind: { 
    name: 'Wind', 
    cards: WIND_DECK, 
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f22199c29_Wind_Orb.png',
    gradient: 'from-teal-600 to-cyan-600',
    emoji: '💨'
  },
  blood: { 
    name: 'Blood', 
    cards: BLOOD_DECK, 
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/98f11f3d4_Blood_Pendant.png',
    gradient: 'from-red-600 to-rose-800',
    emoji: '🩸'
  },
  light: { 
    name: 'Light', 
    cards: LIGHT_DECK, 
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a12822863_02xBlessingofLight.png',
    gradient: 'from-amber-400 to-yellow-600',
    emoji: '☀️'
  },
  shadow: { 
    name: 'Shadow', 
    cards: SHADOW_DECK, 
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a4a46b103_02xDarkOrb.png',
    gradient: 'from-purple-900 to-indigo-950',
    emoji: '🌑'
  },
  electric: { 
    name: 'Electric', 
    cards: ELECTRIC_DECK, 
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/c93b665d1_01xLightningWielder.png',
    gradient: 'from-yellow-500 to-amber-600',
    emoji: '⚡'
  },
  cryo: { 
    name: 'Cryo', 
    cards: CRYO_DECK, 
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6d2dd9a8c_02xEnchantedIceCrystal.png',
    gradient: 'from-cyan-400 to-blue-500',
    emoji: '❄️'
  }
};

function createSampleDeck(deckCards) {
  const deck = [];
  
  // Add 2 copies of each non-unique creature
  const creatures = deckCards.filter(c => c.card_type === 'creature');
  creatures.forEach(creature => {
    deck.push({ ...creature });
    if (!creature.is_unique) {
      deck.push({ ...creature });
    }
  });
  
  // Add 2 copies of each non-unique spell
  const spells = deckCards.filter(c => c.card_type === 'spell');
  spells.forEach(spell => {
    deck.push({ ...spell });
    if (!spell.is_unique) {
      deck.push({ ...spell });
    }
  });
  
  // Add 1 copy of each artifact
  const artifacts = deckCards.filter(c => c.card_type === 'artifact');
  artifacts.forEach(artifact => {
    deck.push({ ...artifact });
  });
  
  return deck;
}

export default function TCG() {
  const [gameState, setGameState] = useState(null);
  const [showMenu, setShowMenu] = useState(true);
  const [winner, setWinner] = useState(null);
  const [selectedDeck, setSelectedDeck] = useState('fire');
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [gameMode, setGameMode] = useState(null); // 'ai', 'pvp-create', 'pvp-join'
  const [showLobby, setShowLobby] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [unlockedDecks, setUnlockedDecks] = useState(['fire', 'water', 'earth', 'wind']);
  const [tutorialMode, setTutorialMode] = useState(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialActionCompleted, setTutorialActionCompleted] = useState(false);
  const [aiActionLog, setAiActionLog] = useState([]);

  useEffect(() => {
    base44.auth.me().then(user => setCurrentUser(user)).catch(() => {});
    
    // Check for tutorial mode in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tutorialLesson = urlParams.get('tutorial');
    if (tutorialLesson) {
      setTutorialMode(tutorialLesson);
      setTutorialStep(0);
      startAIGame('fire');
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    base44.entities.PlayerProgress.filter({ user_email: currentUser.email }).then(async progs => {
      if (progs.length > 0) {
        const starterDecks = ['fire', 'water', 'earth', 'wind'];
        const allDecks = ['fire', 'water', 'earth', 'wind', 'blood', 'light', 'shadow', 'electric', 'cryo'];

        // Admins get all decks unlocked
        if (progs[0].admin_mode_active) {
          setUnlockedDecks(allDecks);
        } else {
          // Reset to only starter decks if needed
          if (JSON.stringify(progs[0].unlocked_decks?.sort()) !== JSON.stringify(starterDecks.sort())) {
            await base44.entities.PlayerProgress.update(progs[0].id, {
              unlocked_decks: starterDecks
            });
            setUnlockedDecks(starterDecks);
          } else {
            setUnlockedDecks(progs[0].unlocked_decks || starterDecks);
          }
        }
      }
    });
  }, [currentUser]);

  const { data: openGames } = useQuery({
    queryKey: ['open-games'],
    queryFn: () => base44.entities.GameState.filter({ status: 'waiting' }),
    enabled: showLobby,
    refetchInterval: 3000
  });

  const updateStats = useCallback(async (won, deckType) => {
    if (!currentUser) return;

    const profiles = await base44.entities.UserProfile.filter({ user_email: currentUser.email });
    if (profiles.length === 0) return;

    const profile = profiles[0];

    await base44.entities.UserProfile.update(profile.id, {
      wins: profile.wins + (won ? 1 : 0),
      losses: profile.losses + (won ? 0 : 1),
      games_played: profile.games_played + 1
    });

    // Award tokens for wins
    const progs = await base44.entities.PlayerProgress.filter({ user_email: currentUser.email });
    if (progs.length > 0) {
      const prog = progs[0];
      const tokensEarned = won ? (gameMode === 'pvp' ? 30 : 10) : 5;
      await base44.entities.PlayerProgress.update(prog.id, {
        tokens: prog.tokens + tokensEarned,
        total_wins: prog.total_wins + (won ? 1 : 0),
        ai_wins: prog.ai_wins + (won && gameMode === 'ai' ? 1 : 0),
        pvp_wins: prog.pvp_wins + (won && gameMode === 'pvp' ? 1 : 0)
      });
    }
  }, [currentUser, gameMode]);

  const startAIGame = useCallback(async (deckType) => {
    const playerDeckData = DECKS[deckType];
    const playerControllers = playerDeckData.cards.filter(c => c.card_type === 'controller');
    const playerDeck = createSampleDeck(playerDeckData.cards);
    
    // AI picks random deck
    const availableDecks = Object.keys(DECKS).filter(d => d !== deckType);
    const opponentDeckType = availableDecks[Math.floor(Math.random() * availableDecks.length)];
    const opponentDeckData = DECKS[opponentDeckType];
    const opponentControllers = opponentDeckData.cards.filter(c => c.card_type === 'controller');
    const opponentDeck = createSampleDeck(opponentDeckData.cards);
    
    const player1State = GameEngine.createInitialPlayerState(playerDeck, playerControllers);
    const player2State = GameEngine.createInitialPlayerState(opponentDeck, opponentControllers);

    setGameState({
      turnNumber: 1,
      phase: 'draw',
      isMyTurn: true,
      playerState: player1State,
      opponentState: player2State,
      firstTurnNoCombat: true,
      opponentHadTurn: false,
      deckName: playerDeckData.name,
      gameMode: 'ai',
      playerDeckType: deckType
    });
    
    setShowMenu(false);
    setWinner(null);

    // Track deck usage at game start
    if (currentUser) {
      const profiles = await base44.entities.UserProfile.filter({ user_email: currentUser.email });
      if (profiles.length > 0) {
        const profile = profiles[0];
        const newDeckUsage = { ...(profile.deck_usage || { blood: 0, fire: 0, wind: 0, light: 0, shadow: 0, electric: 0, cryo: 0, earth: 0, water: 0 }) };
        newDeckUsage[deckType] = (newDeckUsage[deckType] || 0) + 1;

        await base44.entities.UserProfile.update(profile.id, {
          deck_usage: newDeckUsage
        });
      }
    }
  }, [currentUser]);

  const createPvPGame = useCallback(async (deckType) => {
    if (!currentUser) return;
    
    const playerDeckData = DECKS[deckType];
    const playerControllers = playerDeckData.cards.filter(c => c.card_type === 'controller');
    const playerDeck = createSampleDeck(playerDeckData.cards);
    const player1State = GameEngine.createInitialPlayerState(playerDeck, playerControllers);

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const game = await base44.entities.GameState.create({
      player1_id: currentUser.email,
      current_turn_player: currentUser.email,
      turn_number: 1,
      phase: 'summon',
      player1_state: player1State,
      player2_state: null,
      stack: [],
      game_type: 'pvp',
      status: 'waiting',
      invite_code: code,
      player1_deck: deckType
    });

    setInviteCode(code);
    setGameId(game.id);
    setShowLobby(true);

    // Poll for player 2 joining
    const interval = setInterval(async () => {
      const updated = await base44.entities.GameState.filter({ id: game.id });
      if (updated[0]?.status === 'active' && updated[0].player2_state) {
        clearInterval(interval);
        setGameState({
          turnNumber: 1,
          phase: 'summon',
          isMyTurn: true,
          playerState: updated[0].player1_state,
          opponentState: updated[0].player2_state,
          firstTurnNoCombat: true,
          gameMode: 'pvp',
          gameId: game.id,
          playerId: currentUser.email,
          playerDeckType: deckType
          });
        setShowLobby(false);
        setShowMenu(false);
      }
    }, 2000);
  }, [currentUser]);

  const joinPvPGame = useCallback(async (code, deckType) => {
    if (!currentUser) return;

    const games = await base44.entities.GameState.filter({ 
      invite_code: code.toUpperCase(), 
      status: 'waiting' 
    });
    
    if (games.length === 0) {
      alert('Game not found');
      return;
    }

    const game = games[0];
    const playerDeckData = DECKS[deckType];
    const playerControllers = playerDeckData.cards.filter(c => c.card_type === 'controller');
    const playerDeck = createSampleDeck(playerDeckData.cards);
    const player2State = GameEngine.createInitialPlayerState(playerDeck, playerControllers);

    await base44.entities.GameState.update(game.id, {
      player2_id: currentUser.email,
      player2_state: player2State,
      player2_deck: deckType,
      status: 'active'
    });

    setGameState({
      turnNumber: 1,
      phase: 'summon',
      isMyTurn: false,
      playerState: player2State,
      opponentState: game.player1_state,
      firstTurnNoCombat: true,
      gameMode: 'pvp',
      gameId: game.id,
      playerId: currentUser.email,
      playerDeckType: deckType
    });

    setShowLobby(false);
    setShowMenu(false);

    // Track deck usage at game start
    const profiles = await base44.entities.UserProfile.filter({ user_email: currentUser.email });
    if (profiles.length > 0) {
      const profile = profiles[0];
      const newDeckUsage = { ...(profile.deck_usage || { blood: 0, fire: 0, wind: 0, light: 0, shadow: 0, electric: 0, cryo: 0, earth: 0, water: 0 }) };
      newDeckUsage[deckType] = (newDeckUsage[deckType] || 0) + 1;

      await base44.entities.UserProfile.update(profile.id, {
        deck_usage: newDeckUsage
      });
    }
  }, [currentUser]);

  const joinOpenGame = useCallback(async (game, deckType) => {
    if (!currentUser) return;

    const playerDeckData = DECKS[deckType];
    const playerControllers = playerDeckData.cards.filter(c => c.card_type === 'controller');
    const playerDeck = createSampleDeck(playerDeckData.cards);
    const player2State = GameEngine.createInitialPlayerState(playerDeck, playerControllers);

    await base44.entities.GameState.update(game.id, {
      player2_id: currentUser.email,
      player2_state: player2State,
      player2_deck: deckType,
      status: 'active'
    });

    setGameState({
      turnNumber: 1,
      phase: 'summon',
      isMyTurn: false,
      playerState: player2State,
      opponentState: game.player1_state,
      firstTurnNoCombat: true,
      gameMode: 'pvp',
      gameId: game.id,
      playerId: currentUser.email,
      playerDeckType: deckType
    });

    setShowLobby(false);
    setShowMenu(false);

    // Track deck usage at game start
    const profiles = await base44.entities.UserProfile.filter({ user_email: currentUser.email });
    if (profiles.length > 0) {
      const profile = profiles[0];
      const newDeckUsage = { ...(profile.deck_usage || { blood: 0, fire: 0, wind: 0, light: 0, shadow: 0, electric: 0, cryo: 0, earth: 0, water: 0 }) };
      newDeckUsage[deckType] = (newDeckUsage[deckType] || 0) + 1;

      await base44.entities.UserProfile.update(profile.id, {
        deck_usage: newDeckUsage
      });
    }
  }, [currentUser]);

  // Sync game state for PvP
  useEffect(() => {
    if (gameState?.gameMode !== 'pvp' || !gameState?.gameId) return;

    const interval = setInterval(async () => {
      const games = await base44.entities.GameState.filter({ id: gameState.gameId });
      if (games[0]) {
        const game = games[0];
        const isPlayer1 = game.player1_id === currentUser?.email;
        
        setGameState(prev => ({
          ...prev,
          playerState: isPlayer1 ? game.player1_state : game.player2_state,
          opponentState: isPlayer1 ? game.player2_state : game.player1_state,
          isMyTurn: game.current_turn_player === currentUser?.email,
          phase: game.phase,
          turnNumber: game.turn_number
        }));

        if (game.winner) {
          setWinner(game.winner === currentUser?.email ? 'player' : 'opponent');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.gameId, gameState?.gameMode, currentUser]);

  const handleControllerSelect = useCallback((controllerIndex) => {
    if (!gameState || !gameState.isMyTurn || gameState.phase !== 'main') return;

    const newPlayerState = GameEngine.activateRestingController(gameState.playerState, controllerIndex, null);
    if (newPlayerState === gameState.playerState) return; // Couldn't activate

    setGameState({
      ...gameState,
      playerState: newPlayerState
    });

    // Tutorial progress
    if (tutorialMode && tutorialStep === 1) {
      setTutorialActionCompleted(true);
    }
  }, [gameState, tutorialMode, tutorialStep]);

  const handleCardPlay = useCallback(async (card, slotType, slotIndex) => {
    if (!gameState || !gameState.isMyTurn || gameState.phase !== 'main') return;

    // Cannot play cards if no controller is active
    const hasActiveController = gameState.playerState.controllers.some(c => c && c.isActive);
    if (!hasActiveController) {
      return;
    }

    // Show spell casting animation for instant spells
    if (card.card_type === 'spell' && !card.is_persistent) {
      // Temporarily show spell being cast
      const tempState = {
        ...gameState,
        castingSpell: card
      };
      setGameState(tempState);
      
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const { playerState, opponentState } = GameEngine.playCard(
      gameState.playerState, 
      card, 
      slotType, 
      slotIndex,
      gameState.opponentState
    );
    
    const newState = {
      ...gameState,
      playerState,
      opponentState: opponentState || gameState.opponentState,
      castingSpell: null
    };
    
    setGameState(newState);

    // Tutorial progress
    if (tutorialMode && tutorialStep === 4 && card.card_type === 'creature') {
      setTutorialActionCompleted(true);
    }

    // Sync to database for PvP
    if (gameState.gameMode === 'pvp' && gameState.gameId) {
      const isPlayer1 = gameState.playerId === (await base44.entities.GameState.filter({ id: gameState.gameId }))[0].player1_id;
      await base44.entities.GameState.update(gameState.gameId, {
        player1_state: isPlayer1 ? playerState : opponentState || gameState.opponentState,
        player2_state: isPlayer1 ? opponentState || gameState.opponentState : playerState
      });
    }

    // Check win condition - only after opponent has had a turn
    if (opponentState && gameState.opponentHadTurn && GameEngine.checkWinCondition(opponentState)) {
      setWinner('player');
      if (gameState.gameMode === 'pvp') {
        await base44.entities.GameState.update(gameState.gameId, { 
          winner: gameState.playerId,
          status: 'completed'
        });
      }
      await updateStats(true, gameState.playerDeckType || selectedDeck);
    }
  }, [gameState, updateStats, selectedDeck]);

  const handleControllerAbility = useCallback((targetIndex = null) => {
    if (!gameState || !gameState.isMyTurn) return;

    const { playerState, opponentState } = GameEngine.activateControllerAbility(
      gameState.playerState,
      gameState.opponentState,
      'active',
      targetIndex
    );

    setGameState({
      ...gameState,
      playerState,
      opponentState
    });

    // Check win condition - only after opponent has had a turn
    if (gameState.opponentHadTurn && GameEngine.checkWinCondition(opponentState)) {
      setWinner('player');
    }
  }, [gameState]);

  const handleAttack = useCallback((attackerIndex, targetIndex, attackerType = 'creature') => {
    if (!gameState || !gameState.isMyTurn || gameState.phase !== 'combat') return;

    const result = GameEngine.performAttack(
      gameState.playerState,
      gameState.opponentState,
      targetIndex,
      attackerIndex,
      attackerType
    );

    // Check if attack was blocked
    if (result.blocked) {
      alert(result.message);
      return;
    }

    setGameState({
      ...gameState,
      playerState: result.attackerState,
      opponentState: result.defenderState
    });

    // Tutorial progress
    if (tutorialMode && tutorialStep === 6) {
      setTutorialActionCompleted(true);
    }

    // Check win condition - only after opponent has had a turn
    if (gameState.opponentHadTurn && GameEngine.checkWinCondition(result.defenderState)) {
      setWinner('player');
      if (gameState.gameMode === 'pvp' && gameState.gameId) {
        base44.entities.GameState.update(gameState.gameId, { 
          winner: gameState.playerId,
          status: 'completed'
        });
      }
      updateStats(true, gameState.playerDeckType || selectedDeck);
    }
  }, [gameState, tutorialMode, tutorialStep, selectedDeck, updateStats]);

  const handleEndPhase = useCallback(async () => {
    if (!gameState || !gameState.isMyTurn) return;

    // Phase transitions
    if (gameState.phase === 'draw') {
      // Draw card
      const drawnState = GameEngine.drawCard(gameState.playerState);
      setGameState({
        ...gameState,
        playerState: drawnState,
        phase: 'energy'
      });
      return;
    }

    if (gameState.phase === 'energy') {
      // Gain shard
      const newPlayerState = {
        ...gameState.playerState,
        shards: gameState.playerState.shards + 1
      };
      setGameState({
        ...gameState,
        playerState: newPlayerState,
        phase: 'main'
      });
      return;
    }

    if (gameState.phase === 'main') {
      // CRITICAL: Check if a controller is active on first turn
      if (gameState.turnNumber === 1 && !gameState.playerState.controllers.some(c => c && c.isActive)) {
        alert('⚠️ CRITICAL: You must activate a Controller on your first turn or you instantly lose the duel! Click on a Controller in your resting zone (bottom left) to activate it.');
        return;
      }
      
      // Move to combat
      setGameState({
        ...gameState,
        phase: 'combat'
      });
      return;
    }

    if (gameState.phase === 'combat') {
      // Move to end phase
      setGameState({
        ...gameState,
        phase: 'end'
      });
      return;
    }

    // CRITICAL: Check if player has no active controllers (instant loss)
    if (!gameState.playerState.controllers.some(c => c && c.isActive)) {
      alert('💀 DEFEAT: You have no active Controllers! You lose the duel.');
      setWinner('opponent');
      if (gameState.gameMode === 'pvp' && gameState.gameId) {
        const game = (await base44.entities.GameState.filter({ id: gameState.gameId }))[0];
        const opponentId = gameState.playerId === game.player1_id ? game.player2_id : game.player1_id;
        await base44.entities.GameState.update(gameState.gameId, { 
          winner: opponentId,
          status: 'completed'
        });
        }
        await updateStats(false, gameState.playerDeckType || selectedDeck);
        return;
        }
    
    // End turn, switch to opponent
    const newOpponentState = GameEngine.startNewTurn(gameState.opponentState);
    
    const newState = {
      ...gameState,
      turnNumber: gameState.turnNumber + 1,
      phase: 'draw',
      isMyTurn: gameState.gameMode === 'pvp' ? false : false,
      opponentState: newOpponentState,
      firstTurnNoCombat: false,
      opponentHadTurn: true
    };

    setGameState(newState);

    // Sync to database for PvP
    if (gameState.gameMode === 'pvp' && gameState.gameId) {
      const game = (await base44.entities.GameState.filter({ id: gameState.gameId }))[0];
      const isPlayer1 = gameState.playerId === game.player1_id;
      const nextPlayer = isPlayer1 ? game.player2_id : game.player1_id;
      
      await base44.entities.GameState.update(gameState.gameId, {
        player1_state: isPlayer1 ? newState.playerState : newState.opponentState,
        player2_state: isPlayer1 ? newState.opponentState : newState.playerState,
        current_turn_player: nextPlayer,
        phase: newState.phase,
        turn_number: newState.turnNumber
      });
    }

    // AI turn for AI mode
    if (gameState.gameMode === 'ai') {
      setTimeout(() => {
        handleAITurn(newState);
      }, 1500);
    }
  }, [gameState]);

  const handleAITurn = useCallback((currentState) => {
    let aiState = { ...currentState };
    const actions = [];

    // Draw phase
    aiState.phase = 'draw';
    setGameState({ ...aiState });
    actions.push('Drawing card...');
    setAiActionLog(['Drawing card...']);
    
    setTimeout(() => {
      const drawnState = GameEngine.drawCard(aiState.opponentState);
      aiState.opponentState = drawnState;
      
      // Energy phase - gain shard
      aiState.phase = 'energy';
      aiState.opponentState.shards = aiState.opponentState.shards + 1;
      setGameState({ ...aiState });
      setAiActionLog(['Gained 1 Shard']);
      
      setTimeout(() => {
        // Main phase - play cards
        aiState.phase = 'main';
        const mainActions = [];

        // Priority 1: Activate all resting controllers ASAP for defense
        while (aiState.opponentState.restingControllers.length > 0) {
          const controllerIndex = 0;
          const controller = aiState.opponentState.restingControllers[controllerIndex];
          if (aiState.opponentState.shards < controller.cost) break;

          const newOpponentState = GameEngine.activateRestingController(aiState.opponentState, controllerIndex, null);
          if (newOpponentState === aiState.opponentState) break; // Can't activate

          aiState.opponentState = newOpponentState;
          mainActions.push(`Activated ${controller.name}`);
        }

        // Priority 2: Play defensive creatures first (Guardian, high CH)
        if (aiState.opponentState.controllers.some(c => c && c.isActive)) {
          let cardsPlayed = 0;
          const maxCardsToPlay = 4;

          while (cardsPlayed < maxCardsToPlay && aiState.opponentState.shards > 0) {
            const playableCards = aiState.opponentState.hand.filter(
              c => c.cost <= aiState.opponentState.shards
            );

            if (playableCards.length === 0) break;

            // Smart prioritization: Guardians > High CH creatures > Other creatures > Spells
            let cardToPlay = playableCards.find(c => c.card_type === 'creature' && c.keywords?.includes('Guardian')) ||
                            playableCards.filter(c => c.card_type === 'creature').sort((a, b) => (b.ch || 0) - (a.ch || 0))[0] ||
                            playableCards.find(c => c.card_type === 'spell') ||
                            playableCards[0];

            const { playerState, opponentState } = GameEngine.playCard(
              aiState.opponentState, 
              cardToPlay, 
              'auto', 
              null,
              aiState.playerState
            );
            aiState.opponentState = playerState;
            aiState.playerState = opponentState || aiState.playerState;
            mainActions.push(`Played ${cardToPlay.name}`);
            cardsPlayed++;
          }
        }

        setAiActionLog(mainActions.length > 0 ? mainActions : ['No cards played']);
        setGameState({ ...aiState });

        if (GameEngine.checkWinCondition(aiState.playerState)) {
          setWinner('opponent');
          setGameState(aiState);
          updateStats(false, aiState.playerDeckType || selectedDeck);
          return;
        }

        setTimeout(() => {
          // Combat phase
          aiState.phase = 'combat';
          const combatActions = [];
          
          // Attack with all available creatures
          const attackers = aiState.opponentState.creatures
            .map((c, i) => ({ creature: c, index: i }))
            .filter(({ creature }) => creature && creature.canAttack && !creature.hasAttacked);
          
          attackers.forEach(({ creature, index: attackerIndex }) => {
            const playerCreatures = aiState.playerState.creatures
              .map((c, i) => ({ creature: c, index: i }))
              .filter(({ creature }) => creature !== null);
            
            // Smart targeting: attack weakest creature or go for controller
            let targetIndex = -1;
            let targetName = 'Controller';
            
            if (playerCreatures.length > 0) {
              // Target creature with lowest CH that can be killed
              const killableTarget = playerCreatures.find(({ creature: c }) => c.currentCH <= creature.currentAP);
              if (killableTarget) {
                targetIndex = killableTarget.index;
                targetName = killableTarget.creature.card.name;
              } else {
                // Otherwise attack weakest
                const weakest = playerCreatures.reduce((min, curr) => 
                  curr.creature.currentCH < min.creature.currentCH ? curr : min
                );
                targetIndex = weakest.index;
                targetName = weakest.creature.card.name;
              }
            }
            
            const { attackerState, defenderState } = GameEngine.performAttack(
              aiState.opponentState,
              aiState.playerState,
              targetIndex,
              attackerIndex
            );
            aiState.opponentState = attackerState;
            aiState.playerState = defenderState;
            combatActions.push(`${creature.card.name} → ${targetName}`);
          });

          setAiActionLog(combatActions.length > 0 ? combatActions : ['No attacks']);
          setGameState({ ...aiState });

          if (GameEngine.checkWinCondition(aiState.playerState)) {
            setWinner('opponent');
            setGameState(aiState);
            updateStats(false, aiState.playerDeckType || selectedDeck);
            return;
          }

          setTimeout(() => {
            // End phase
            aiState.phase = 'end';
            setAiActionLog(['Ending turn...']);
            setGameState({ ...aiState });
            
            setTimeout(() => {
              const newPlayerState = GameEngine.startNewTurn(aiState.playerState);
              setAiActionLog([]);

              setGameState({
                ...aiState,
                playerState: newPlayerState,
                turnNumber: aiState.turnNumber + 1,
                phase: 'draw',
                isMyTurn: true
              });
            }, 800);
          }, 1200);
        }, 1200);
      }, 800);
    }, 800);
  }, [updateStats, selectedDeck]);



  // Join Code Modal
  if (gameMode === 'pvp-join') {
    return (
      <div className="h-screen relative flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950 via-purple-950 to-orange-950" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 bg-slate-900/95 p-8 rounded-2xl border-2 border-cyan-500 max-w-md w-full"
        >
          <h2 className="text-2xl font-bold mb-6 text-cyan-400">Join Game</h2>
          <input
            type="text"
            placeholder="Enter Invite Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 mb-4 bg-slate-800 border-2 border-slate-700 rounded-lg text-white uppercase text-center text-xl tracking-widest"
            maxLength={6}
          />
          <div className="flex gap-3">
            <Button
              onClick={() => joinPvPGame(joinCode, selectedDeck)}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600"
              disabled={joinCode.length !== 6}
            >
              Join Game
            </Button>
            <Button
              onClick={() => {
                setGameMode(null);
                setJoinCode('');
              }}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Lobby Modal
  if (showLobby) {
    return (
      <div className="h-screen relative flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950 via-purple-950 to-orange-950" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 bg-slate-900/95 p-8 rounded-2xl border-2 border-purple-500 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        >
          {inviteCode ? (
            <>
              <h2 className="text-2xl font-bold mb-6 text-purple-400">Waiting for Opponent...</h2>
              <div className="p-6 bg-slate-800 rounded-lg border-2 border-purple-600 mb-6">
                <p className="text-slate-400 mb-2">Share this code:</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-4xl font-bold text-center tracking-widest text-purple-400">
                    {inviteCode}
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    size="icon"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => {
                  setShowLobby(false);
                  setInviteCode('');
                  setGameMode(null);
                  if (gameId) {
                    base44.entities.GameState.delete(gameId);
                  }
                }}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-6 text-purple-400">Open Games</h2>
              <div className="space-y-3 mb-6">
                {openGames?.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No open games available</p>
                ) : (
                  openGames?.map(game => (
                    <div key={game.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{game.player1_id}</p>
                        <p className="text-sm text-slate-400">{DECKS[game.player1_deck]?.name}</p>
                      </div>
                      <Button
                        onClick={() => joinOpenGame(game, selectedDeck)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        Join Game
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <Button
                onClick={() => setShowLobby(false)}
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  if (showMenu || !gameState) {
    return (
      <div className="h-screen relative flex items-center justify-center p-4 overflow-hidden">
        {/* Logo Background */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f8062dfb3_Fateboundlogo.png"
              alt="Fatebound Logo"
              className="w-full h-full object-contain opacity-40"
            />
          </motion.div>
        </div>

        {/* Gradient Overlay - matches logo colors */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-indigo-950/95 to-slate-950/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-600/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-orange-600/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-700/20 via-transparent to-transparent" />

        {/* Floating magical particles - logo colors */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: i % 3 === 0 ? 'rgba(34, 211, 238, 0.6)' : i % 3 === 1 ? 'rgba(251, 146, 60, 0.6)' : 'rgba(168, 85, 247, 0.5)',
                boxShadow: i % 3 === 0 ? '0 0 12px rgba(34, 211, 238, 0.9)' : i % 3 === 1 ? '0 0 12px rgba(251, 146, 60, 0.9)' : '0 0 12px rgba(168, 85, 247, 0.9)',
              }}
              animate={{
                y: [0, -40, 0],
                x: [0, Math.random() * 20 - 10, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center relative z-10"
        >
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-400 to-orange-400 mb-2 leading-tight drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]">
              FATEBOUND:<br />Shards of Dominion
            </h1>
            <p className="text-cyan-300/80 text-sm uppercase tracking-[0.3em] font-semibold">
              Official Card Game
            </p>
          </div>

          <div className="space-y-4 max-w-md">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Link to={createPageUrl('Profile')}>
                <Button variant="outline" className="w-full border-purple-500/50 bg-purple-950/30 hover:bg-purple-900/50 text-purple-200 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Link to={createPageUrl('Shop')}>
                <Button variant="outline" className="w-full border-amber-500/60 bg-amber-950/30 hover:bg-amber-900/50 text-amber-300 hover:border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                  <Flame className="w-4 h-4 mr-2" />
                  Shop
                </Button>
              </Link>
              <Link to={createPageUrl('DeckBuilder')}>
                <Button variant="outline" className="w-full border-violet-500/50 bg-violet-950/30 hover:bg-violet-900/50 text-violet-200 hover:border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                  <Menu className="w-4 h-4 mr-2" />
                  Builder
                </Button>
              </Link>
              <Link to={createPageUrl('Tutorial')}>
                <Button variant="outline" className="w-full border-purple-500/60 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Tutorial
                </Button>
              </Link>
            </div>

            <a href="https://www.paypal.com/donate/?business=9BX7PPHZK5BGC&no_recurring=0&item_name=Fatebound%3A+Shards+of+Dominion+Development&currency_code=USD" target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full border-emerald-500/60 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Heart className="w-4 h-4 mr-2" />
                Support Development
              </Button>
            </a>

            <div className="text-amber-300/80 text-sm mb-2 font-semibold tracking-wider">Select Your Deck:</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2 mb-4">
              {Object.entries(DECKS).map(([key, deck]) => {
                const isLocked = !unlockedDecks.includes(key);
                return (
                  <Button
                    key={key}
                    onClick={() => !isLocked && setSelectedDeck(key)}
                    variant={selectedDeck === key ? "default" : "outline"}
                    disabled={isLocked}
                    className={`h-20 flex flex-col gap-1 p-2 relative ${
                      isLocked ? 'opacity-50 cursor-not-allowed' :
                      selectedDeck === key 
                        ? `bg-gradient-to-r ${deck.gradient} hover:opacity-90 border-2` 
                        : 'border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded">
                        <span className="text-xl">🔒</span>
                      </div>
                    )}
                    <span className="text-2xl">{deck.emoji}</span>
                    <span className="text-[10px] font-semibold leading-tight">{deck.name}</span>
                  </Button>
                );
              })}
            </div>

            <div className="mb-4 p-4 bg-gradient-to-r from-amber-950/40 to-purple-950/40 border-2 border-amber-500/60 rounded-lg text-center shadow-[0_0_20px_rgba(251,191,36,0.2)]">
              <p className="text-amber-300 text-sm font-semibold">
                Win rewards: <span className="font-bold text-amber-200">AI: 10 tokens</span> • <span className="font-bold text-purple-300">PvP: 30 tokens</span>
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => startAIGame(selectedDeck)}
                size="lg"
                className={`w-full bg-gradient-to-r ${DECKS[selectedDeck].gradient} hover:opacity-90 text-lg py-6 font-bold shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] border-2 border-white/20`}
              >
                <Swords className="w-5 h-5 mr-2" />
                Play vs AI
              </Button>

              <Button
                onClick={() => {
                  setGameMode('pvp-create');
                  createPvPGame(selectedDeck);
                }}
                size="lg"
                variant="outline"
                className="w-full border-2 border-purple-500/60 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 text-lg py-6 font-semibold shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)]"
              >
                <Users className="w-5 h-5 mr-2" />
                Create PvP Game
              </Button>

              <Button
                onClick={() => {
                  setGameMode('pvp-join');
                }}
                size="lg"
                variant="outline"
                className="w-full border-2 border-violet-500/60 bg-violet-950/40 hover:bg-violet-900/60 text-violet-200 text-lg py-6 font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
              >
                <Zap className="w-5 h-5 mr-2" />
                Join PvP Game
              </Button>

              <Button
                onClick={() => {
                  setShowLobby(true);
                }}
                size="lg"
                variant="outline"
                className="w-full border-2 border-indigo-600/60 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-200 text-lg py-6 font-semibold shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
              >
                Browse Open Games
              </Button>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-950/60 to-indigo-950/60 rounded-lg border-2 border-purple-500/40 text-left text-sm text-purple-100 shadow-[0_0_15px_rgba(147,51,234,0.2)]">
              <h3 className="font-bold mb-2 text-amber-300 tracking-wide">Quick Guide:</h3>
              <ul className="space-y-1 text-xs">
                <li>• Destroy all 3 enemy Controllers to win</li>
                <li>• 10 Shards to spend, +1 per turn</li>
                <li>• Drag cards from hand to play</li>
                <li>• Clear creatures before attacking Controllers</li>
                <li>• Guardian creatures must be attacked first</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }



  return (
    <>
      {/* Pause Menu Button */}
      <button
        onClick={() => setShowPauseMenu(true)}
        className="fixed top-4 left-4 z-30 p-3 bg-slate-900/90 hover:bg-slate-800 rounded-lg border-2 border-slate-700 shadow-lg transition-colors"
      >
        <Menu className="w-6 h-6 text-slate-300" />
      </button>

      <GameBoard
        gameState={gameState}
        isPlayer={true}
        onCardPlay={handleCardPlay}
        onAttack={handleAttack}
        onEndPhase={handleEndPhase}
        onControllerAbility={handleControllerAbility}
        onControllerActivate={handleControllerSelect}
        aiActionLog={aiActionLog}
      />

      {/* Tutorial Overlay */}
      {tutorialMode && (
        <TutorialOverlay
          lessonType={tutorialMode}
          currentStep={tutorialStep}
          actionCompleted={tutorialActionCompleted}
          onNext={() => {
            setTutorialStep(tutorialStep + 1);
            setTutorialActionCompleted(false);
          }}
          onPrev={() => {
            setTutorialStep(Math.max(0, tutorialStep - 1));
            setTutorialActionCompleted(false);
          }}
          onSkip={async () => {
            setTutorialMode(null);
            setTutorialStep(0);
            // Remove tutorial param from URL
            window.history.replaceState({}, '', createPageUrl('TCG'));
          }}
          onComplete={async () => {
            // Mark lesson as completed and award tokens
            if (currentUser) {
              const progs = await base44.entities.TutorialProgress.filter({ user_email: currentUser.email });
              if (progs.length > 0) {
                const prog = progs[0];
                const completed = [...(prog.completed_lessons || [])];
                const isNewCompletion = !completed.includes(tutorialMode);
                
                if (isNewCompletion) {
                  completed.push(tutorialMode);
                  await base44.entities.TutorialProgress.update(prog.id, {
                    completed_lessons: completed,
                    tutorial_completed: completed.length >= 5
                  });

                  // Award tokens
                  const playerProgs = await base44.entities.PlayerProgress.filter({ user_email: currentUser.email });
                  if (playerProgs.length > 0) {
                    const playerProg = playerProgs[0];
                    const isFirstLesson = completed.length === 1;
                    const allCompleted = completed.length >= 5;
                    
                    let tokensEarned = isFirstLesson ? 50 : 30;
                    if (allCompleted) tokensEarned += 100; // Bonus for completing all
                    
                    await base44.entities.PlayerProgress.update(playerProg.id, {
                      tokens: playerProg.tokens + tokensEarned
                    });
                  }
                }
              }
            }
            setTutorialMode(null);
            setTutorialStep(0);
            window.history.replaceState({}, '', createPageUrl('TCG'));
          }}
        />
      )}

      {/* Pause Menu Modal */}
      <AnimatePresence>
        {showPauseMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center p-8 rounded-2xl bg-slate-900/95 border-2 border-purple-500 max-w-md mx-4"
            >
              <h2 className="text-3xl font-bold mb-6 text-purple-400">PAUSED</h2>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setShowPauseMenu(false)}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                >
                  Resume Game
                </Button>
                <Button
                  onClick={() => {
                    setShowPauseMenu(false);
                    setShowMenu(true);
                    setGameState(null);
                    setWinner(null);
                  }}
                  variant="outline"
                  className="border-slate-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restart Match
                </Button>
                <Button
                  onClick={() => {
                    setShowPauseMenu(false);
                    setShowMenu(true);
                    setGameState(null);
                  }}
                  variant="outline"
                  className="border-slate-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Exit to Menu
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win/Loss Modal */}
      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center p-8 rounded-2xl bg-slate-900/90 border-2 border-purple-500 max-w-md mx-4"
            >
              <div className="text-6xl mb-4">
                {winner === 'player' ? '🏆' : '💀'}
              </div>
              <h2 className={`text-4xl font-bold mb-3 ${
                winner === 'player' ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {winner === 'player' ? 'VICTORY!' : 'DEFEAT'}
              </h2>
              <p className="text-slate-300 mb-6">
                {winner === 'player' 
                  ? 'All enemy Controllers destroyed!'
                  : 'Your Controllers have fallen...'}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => startAIGame(selectedDeck)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Play Again
                </Button>
                <Button
                  onClick={() => setShowMenu(true)}
                  variant="outline"
                  className="flex-1 border-slate-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Menu
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}