// A curated mixed-element deck, not a new card element. Original card rules apply.
export const dragonController = 'Golden Dragon King';
export const dragonKing = {
  id: 'CTRL_DRG_0001', name: dragonController, element: 'light', archetype: 'dragon',
  card_type: 'controller', cost: 5, ap: 1, ch: 12, is_unique: true, startingOnly: true,
  keywords: [], image_url: '/cards/golden-dragon-king.png',
  description: 'Commands the mixed-element Dragon deck. Royal Command (2 shards): Give an allied Dragon or Wyrm creature +2 AP until End Phase. Once per turn.',
};
export const dragonDeck = [
  'Frost Wyrm', 'Frost Wyrm', 'Moss Dragon', 'Moss Dragon',
  "Emperor's Fire Dragon", "Emperor's Fire Dragon", 'Flame Dragon', 'Flame Dragon',
  'Light Dragon', 'Light Dragon', 'Supreme Water Dragon', 'Supreme Water Dragon',
  'Wind Dragon', 'Wind Dragon',
  'Ice Breath', 'White Out', "Dragon's Tsunami", 'Whirlpool',
  'Burning Blast', 'Light Bind', "Nature's Blade", 'Soul Siphon',
  'Dark Dimension', 'Wolf Lightning Strike', 'Spell Release', 'Creature Recall',
  'Earth Staff', 'Blood Pendant', 'Spark Knight Blade', 'Wind Sword',
];
