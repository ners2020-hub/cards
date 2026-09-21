import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';

const TRIGGERS = ['onPlay', 'onDeath', 'onAttack', 'onDamaged', 'onDestroy', 'onSummon', 'passive', 'active'];

const EFFECT_TYPES = [
  { value: 'modifyStats', label: 'Modify Stats (AP/CH)', params: ['stat', 'amount'] },
  { value: 'applyStatus', label: 'Apply Status (Freeze)', params: ['status'] },
  { value: 'spellRelease', label: 'Spell Release (Remove Effects)', params: [] },
  { value: 'returnToHand', label: 'Return to Hand', params: ['scope'] },
  { value: 'banish', label: 'Banish (Permanent Void)', params: [] },
  { value: 'temporaryExile', label: 'Temporary Exile', params: ['turns', 'returnTo'] },
  { value: 'resurrect', label: 'Resurrect from Graveyard', params: ['type', 'amount'] },
  { value: 'summonTokens', label: 'Summon Tokens', params: ['card_code', 'amount'] },
  { value: 'sacrifice', label: 'Sacrifice', params: [] },
  { value: 'modifyCost', label: 'Modify Cost', params: ['affects', 'amount'] },
  { value: 'draw', label: 'Draw Cards', params: ['count'] },
  { value: 'damage', label: 'Deal Damage', params: ['amount'] },
  { value: 'heal', label: 'Heal', params: ['amount'] },
  { value: 'gainShards', label: 'Gain Shards', params: ['amount'] },
  { value: 'search', label: 'Search Deck/Graveyard', params: ['cardType', 'element', 'location'] },
  { value: 'summon', label: 'Summon Specific Card', params: ['cardId'] },
  { value: 'aura', label: 'Aura (Passive Buff)', params: ['apBonus', 'element'] },
  { value: 'battleImmunity', label: 'Cannot Be Destroyed by Battle', params: [] },
  { value: 'spellImmunity', label: 'Cannot Be Destroyed by Spells', params: [] },
  { value: 'takeControl', label: 'Take Control of Creature', params: [] },
];

const TARGET_TYPES = [
  { value: 'none', label: 'No Target' },
  { value: 'self', label: 'Self' },
  { value: 'ally_controller', label: 'Ally Controller' },
  { value: 'enemy_controller', label: 'Enemy Controller' },
  { value: 'ally_creature', label: 'Ally Creature' },
  { value: 'enemy_creature', label: 'Enemy Creature' },
  { value: 'ally_artifact', label: 'Ally Artifact' },
  { value: 'enemy_artifact', label: 'Enemy Artifact' },
  { value: 'ally_spell', label: 'Ally Spell' },
  { value: 'enemy_spell', label: 'Enemy Spell' },
  { value: 'all_allies', label: 'All Allies' },
  { value: 'all_ally_creatures', label: 'All Ally Creatures' },
  { value: 'all_ally_controllers', label: 'All Ally Controllers' },
  { value: 'all_enemies', label: 'All Enemies' },
  { value: 'all_enemy_creatures', label: 'All Enemy Creatures' },
  { value: 'all_enemy_controllers', label: 'All Enemy Controllers' },
  { value: 'all_creatures', label: 'All Creatures' },
];

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function makeDefaultAbility() {
  return {
    trigger: 'onPlay',
    action: 'damage',
    target: { type: 'enemy_creature' },
    cost: { shards: 0, ch: 0 },
    params: {},
    condition: null
  };
}

export default function StrictAbilityBuilder({ abilities = [], onChange, tokenCards = [] }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [error, setError] = useState('');
  const [currentAbility, setCurrentAbility] = useState(makeDefaultAbility());

  // Defensive: older cards / partial data can contain null/undefined entries.
  // Normalize to a predictable shape so the UI never crashes.
  const safeAbilities = useMemo(() => {
    if (!Array.isArray(abilities)) return [];
    return abilities
      .filter(Boolean)
      .map((a) => ({ ...makeDefaultAbility(), ...(a || {}) }));
  }, [abilities]);

  const tokenOptions = useMemo(
    () => tokenCards.map(t => ({ code: t.code, name: t.name })),
    [tokenCards]
  );

  const resetForm = () => {
    setCurrentAbility(makeDefaultAbility());
    setError('');
  };

  const updateAction = (action) => {
    let defaultParams = {};

    if (action === 'applyStatus') {
      // If you only support frozen for now, keep it locked.
      defaultParams = { status: 'frozen', duration: 3, blocks: ['attack', 'abilities'] };
    } else if (action === 'damage') {
      defaultParams = { amount: 1 };
    } else if (action === 'heal') {
      defaultParams = { amount: 1 };
    } else if (action === 'draw') {
      defaultParams = { count: 1 };
    } else if (action === 'gainShards') {
      defaultParams = { amount: 1 };
    } else if (action === 'modifyStats') {
      defaultParams = { stat: 'ap', amount: 1 };
    } else if (action === 'summonTokens') {
      defaultParams = { card_code: '', amount: 1 };
    } else if (action === 'temporaryExile') {
      defaultParams = { turns: 2, returnTo: 'battlefield' };
    } else if (action === 'resurrect') {
      defaultParams = { source: 'graveyard', type: 'creature', amount: 1 };
    } else if (action === 'returnToHand') {
      defaultParams = { scope: 'single' };
    } else if (action === 'modifyCost') {
      defaultParams = { affects: 'spells', amount: -1 };
    } else if (action === 'aura') {
      defaultParams = { apBonus: 1, element: null };
    }

    setCurrentAbility(prev => ({
      ...prev,
      action,
      params: defaultParams
    }));
  };

  const validateCurrent = () => {
    if (!currentAbility?.trigger) return 'Missing trigger';
    if (!currentAbility?.action) return 'Missing action';
    const t = currentAbility?.target?.type;
    if (!t || t === 'none') return 'Target type is required (pick No Target only if the engine supports "none")';

    // Small safety: summonTokens must pick a token
    if (currentAbility.action === 'summonTokens' && !currentAbility.params?.card_code) {
      return 'Summon Tokens requires a token card_code';
    }

    return '';
  };

  const addOrUpdate = () => {
    const msg = validateCurrent();
    if (msg) {
      setError(msg);
      return;
    }

    // DB-master friendliness: store minimal target shape
    const normalized = {
      ...currentAbility,
      target: { type: currentAbility.target.type },
      condition: currentAbility.condition ? deepClone(currentAbility.condition) : null
    };

    const safeAbility = deepClone(normalized);

    if (editingIndex !== null) {
      const updated = [...safeAbilities];
      updated[editingIndex] = safeAbility;
      onChange(updated);
      setEditingIndex(null);
    } else {
      onChange([...safeAbilities, safeAbility]);
    }

    resetForm();
  };

  const removeAbility = (idx) => {
    onChange(safeAbilities.filter((_, i) => i !== idx));
  };

  const editAbility = (idx) => {
    // Clone to prevent mutating list objects while editing
    const cloned = deepClone(safeAbilities[idx] || makeDefaultAbility());
    // Ensure expected shape exists
    if (!cloned.target) cloned.target = { type: 'enemy_creature' };
    if (!cloned.cost) cloned.cost = { shards: 0, ch: 0 };
    if (!cloned.params) cloned.params = {};
    if (!('condition' in cloned)) cloned.condition = null;

    setCurrentAbility(cloned);
    setEditingIndex(idx);
    setError('');
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-purple-400 uppercase tracking-wide">Abilities</div>

      {/* Ability List */}
      <div className="space-y-2">
          {safeAbilities.map((ab, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 p-2 bg-slate-800/50 rounded border border-purple-500/30"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-cyan-300">
                {ab.trigger} → {ab.action}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Target: {ab.target?.type || 'none'}
              </div>
            </div>

            <Button type="button" onClick={() => editAbility(idx)} variant="ghost" size="sm" className="h-6 px-2 text-blue-400">
              Edit
            </Button>

            <Button type="button" onClick={() => removeAbility(idx)} variant="ghost" size="sm" className="h-6 px-2 text-red-400">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Ability Builder */}
      <div className="p-4 bg-slate-800/30 rounded-lg border border-purple-500/50 space-y-3">
        <div className="text-xs font-bold text-amber-400 uppercase">
          {editingIndex !== null ? 'Edit Ability' : 'Add New Ability'}
        </div>

        {error && (
          <div className="text-[11px] text-red-300 bg-red-950/30 border border-red-500/30 rounded p-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Trigger</label>
            <Select
              value={currentAbility.trigger}
              onValueChange={(v) => setCurrentAbility(prev => ({ ...prev, trigger: v }))}
            >
              <SelectTrigger className="bg-slate-900 border-purple-500/30 text-white h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
                {TRIGGERS.map(t => (
                  <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Effect Type</label>
            <Select value={currentAbility.action} onValueChange={updateAction}>
              <SelectTrigger className="bg-slate-900 border-purple-500/30 text-white h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
                {EFFECT_TYPES.map(e => (
                  <SelectItem key={e.value} value={e.value} className="text-xs text-white">{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Target</label>
          <Select
            value={currentAbility.target?.type || 'none'}
            onValueChange={(v) => setCurrentAbility(prev => ({ ...prev, target: { type: v } }))}
          >
            <SelectTrigger className="bg-slate-900 border-purple-500/30 text-white h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
              {TARGET_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Shard Cost</label>
            <Input
              type="number"
              value={currentAbility.cost?.shards ?? 0}
              onChange={(e) => setCurrentAbility(prev => ({
                ...prev,
                cost: { ...(prev.cost || { shards: 0, ch: 0 }), shards: Number(e.target.value) || 0 }
              }))}
              className="bg-slate-900 border-purple-500/30 text-white h-8"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">CH Cost</label>
            <Input
              type="number"
              value={currentAbility.cost?.ch ?? 0}
              onChange={(e) => setCurrentAbility(prev => ({
                ...prev,
                cost: { ...(prev.cost || { shards: 0, ch: 0 }), ch: Number(e.target.value) || 0 }
              }))}
              className="bg-slate-900 border-purple-500/30 text-white h-8"
            />
          </div>
        </div>

        {/* Dynamic params */}
        <div className="space-y-2 p-2 bg-slate-900/50 rounded border border-purple-500/20">
          <div className="text-[10px] text-purple-400 font-bold">Effect Parameters</div>

          {currentAbility.action === 'damage' && (
            <Input
              type="number"
              placeholder="Damage Amount"
              value={currentAbility.params?.amount ?? 1}
              onChange={(e) => setCurrentAbility(prev => ({
                ...prev,
                params: { ...(prev.params || {}), amount: Number(e.target.value) || 1 }
              }))}
              className="bg-slate-900 border-purple-500/30 text-white h-8"
            />
          )}

          {currentAbility.action === 'heal' && (
            <Input
              type="number"
              placeholder="Heal Amount"
              value={currentAbility.params?.amount ?? 1}
              onChange={(e) => setCurrentAbility(prev => ({
                ...prev,
                params: { ...(prev.params || {}), amount: Number(e.target.value) || 1 }
              }))}
              className="bg-slate-900 border-purple-500/30 text-white h-8"
            />
          )}

          {currentAbility.action === 'draw' && (
            <Input
              type="number"
              placeholder="Cards to Draw"
              value={currentAbility.params?.count ?? 1}
              onChange={(e) => setCurrentAbility(prev => ({
                ...prev,
                params: { ...(prev.params || {}), count: Number(e.target.value) || 1 }
              }))}
              className="bg-slate-900 border-purple-500/30 text-white h-8"
            />
          )}

          {currentAbility.action === 'gainShards' && (
            <Input
              type="number"
              placeholder="Shards to Gain"
              value={currentAbility.params?.amount ?? 1}
              onChange={(e) => setCurrentAbility(prev => ({
                ...prev,
                params: { ...(prev.params || {}), amount: Number(e.target.value) || 1 }
              }))}
              className="bg-slate-900 border-purple-500/30 text-white h-8"
            />
          )}

          {currentAbility.action === 'modifyStats' && (
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={currentAbility.params?.stat || 'ap'}
                onValueChange={(v) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), stat: v }
                }))}
              >
                <SelectTrigger className="bg-slate-900 border-purple-500/30 text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
                  <SelectItem value="ap" className="text-white">AP</SelectItem>
                  <SelectItem value="ch" className="text-white">CH</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Amount"
                value={currentAbility.params?.amount ?? 1}
                onChange={(e) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), amount: Number(e.target.value) || 1 }
                }))}
                className="bg-slate-900 border-purple-500/30 text-white h-8"
              />
            </div>
          )}

          {currentAbility.action === 'applyStatus' && (
            <div className="p-2 bg-cyan-900/20 rounded border border-cyan-500/30">
              <div className="text-[10px] text-cyan-300 font-bold">⚠️ Freeze Rules</div>
              <div className="text-[9px] text-cyan-200">Duration: 3 turns (locked)</div>
              <div className="text-[9px] text-cyan-200">Blocks: Attack + Abilities</div>
            </div>
          )}

          {currentAbility.action === 'summonTokens' && (
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={currentAbility.params?.card_code || ''}
                onValueChange={(v) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), card_code: v }
                }))}
              >
                <SelectTrigger className="bg-slate-900 border-purple-500/30 text-white h-8 text-xs">
                  <SelectValue placeholder="Select Token" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
                  {tokenOptions.map(t => (
                    <SelectItem key={t.code} value={t.code} className="text-xs text-white">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Amount"
                value={currentAbility.params?.amount ?? 1}
                onChange={(e) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), amount: Number(e.target.value) || 1 }
                }))}
                className="bg-slate-900 border-purple-500/30 text-white h-8"
              />
            </div>
          )}

          {currentAbility.action === 'temporaryExile' && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Turns"
                value={currentAbility.params?.turns ?? 2}
                onChange={(e) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), turns: Number(e.target.value) || 2 }
                }))}
                className="bg-slate-900 border-purple-500/30 text-white h-8"
              />
              <Select
                value={currentAbility.params?.returnTo || 'battlefield'}
                onValueChange={(v) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), returnTo: v }
                }))}
              >
                <SelectTrigger className="bg-slate-900 border-purple-500/30 text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
                  <SelectItem value="battlefield" className="text-white">Return to Field</SelectItem>
                  <SelectItem value="hand" className="text-white">Return to Hand</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {currentAbility.action === 'resurrect' && (
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={currentAbility.params?.type || 'creature'}
                onValueChange={(v) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), type: v }
                }))}
              >
                <SelectTrigger className="bg-slate-900 border-purple-500/30 text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
                  <SelectItem value="creature" className="text-white">Creature</SelectItem>
                  <SelectItem value="artifact" className="text-white">Artifact</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Amount"
                value={currentAbility.params?.amount ?? 1}
                onChange={(e) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), amount: Number(e.target.value) || 1 }
                }))}
                className="bg-slate-900 border-purple-500/30 text-white h-8"
              />
            </div>
          )}

          {currentAbility.action === 'returnToHand' && (
            <Select
              value={currentAbility.params?.scope || 'single'}
              onValueChange={(v) => setCurrentAbility(prev => ({
                ...prev,
                params: { ...(prev.params || {}), scope: v }
              }))}
            >
              <SelectTrigger className="bg-slate-900 border-purple-500/30 text-white h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
                <SelectItem value="single" className="text-white">Single Target</SelectItem>
                <SelectItem value="all" className="text-white">All Matching</SelectItem>
              </SelectContent>
            </Select>
          )}

          {currentAbility.action === 'modifyCost' && (
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={currentAbility.params?.affects || 'spells'}
                onValueChange={(v) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), affects: v }
                }))}
              >
                <SelectTrigger className="bg-slate-900 border-purple-500/30 text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
                  <SelectItem value="spells" className="text-white">Spells</SelectItem>
                  <SelectItem value="creatures" className="text-white">Creatures</SelectItem>
                  <SelectItem value="all" className="text-white">All Cards</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Amount (-1 = reduce)"
                value={currentAbility.params?.amount ?? -1}
                onChange={(e) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), amount: Number(e.target.value) || -1 }
                }))}
                className="bg-slate-900 border-purple-500/30 text-white h-8"
              />
            </div>
          )}

          {currentAbility.action === 'aura' && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="AP Bonus"
                value={currentAbility.params?.apBonus ?? 1}
                onChange={(e) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), apBonus: Number(e.target.value) || 1 }
                }))}
                className="bg-slate-900 border-purple-500/30 text-white h-8"
              />
              <Input
                placeholder="Element Filter (optional)"
                value={currentAbility.params?.element ?? ''}
                onChange={(e) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), element: e.target.value ? e.target.value : null }
                }))}
                className="bg-slate-900 border-purple-500/30 text-white h-8"
              />
            </div>
          )}

          {currentAbility.action === 'search' && (
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Card Type"
                value={currentAbility.params?.cardType ?? ''}
                onChange={(e) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), cardType: e.target.value }
                }))}
                className="bg-slate-900 border-purple-500/30 text-white h-8"
              />
              <Input
                placeholder="Element"
                value={currentAbility.params?.element ?? ''}
                onChange={(e) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), element: e.target.value }
                }))}
                className="bg-slate-900 border-purple-500/30 text-white h-8"
              />
              <Select
                value={currentAbility.params?.location || 'deck'}
                onValueChange={(v) => setCurrentAbility(prev => ({
                  ...prev,
                  params: { ...(prev.params || {}), location: v }
                }))}
              >
                <SelectTrigger className="bg-slate-900 border-purple-500/30 text-white h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
                  <SelectItem value="deck" className="text-white">Deck</SelectItem>
                  <SelectItem value="graveyard" className="text-white">Graveyard</SelectItem>
                  <SelectItem value="hand" className="text-white">Hand</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {currentAbility.action === 'summon' && (
            <Input
              placeholder="Card ID/Code to Summon"
              value={currentAbility.params?.cardId ?? ''}
              onChange={(e) => setCurrentAbility(prev => ({
                ...prev,
                params: { ...(prev.params || {}), cardId: e.target.value }
              }))}
              className="bg-slate-900 border-purple-500/30 text-white h-8"
            />
          )}
        </div>

        {/* Condition Builder */}
        <div className="space-y-2 p-2 bg-slate-900/50 rounded border border-amber-500/20">
          <div className="text-[10px] text-amber-400 font-bold">Conditions (Optional)</div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentAbility.condition?.type === 'ifOnField'}
              onChange={(e) => setCurrentAbility(prev => ({
                ...prev,
                condition: e.target.checked ? { type: 'ifOnField' } : null
              }))}
              className="w-3 h-3"
            />
            <span className="text-[10px] text-slate-300">If card is on field</span>
          </label>

          {currentAbility.condition?.type === 'ifOnField' && (
            <div className="text-[9px] text-amber-300 p-1 bg-amber-900/10 rounded">
              ✓ Effect only triggers if this card is still on the battlefield
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="button" onClick={addOrUpdate} variant="default" size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700 h-8">
            <Plus className="w-3 h-3 mr-1" />
            {editingIndex !== null ? 'Update' : 'Add'} Ability
          </Button>

          {editingIndex !== null && (
            <Button type="button"
              onClick={() => { setEditingIndex(null); resetForm(); }}
              variant="outline"
              size="sm"
              className="border-slate-700 h-8"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
