// TCG Game Engine - Core Logic

export function createInitialPlayerState(deck, controllers) {
  // Shuffle deck without controllers
  const shuffledDeck = shuffleArray([...deck]);

  // Draw starting hand
  const hand = shuffledDeck.slice(0, 5);
  const remainingDeck = shuffledDeck.slice(5);

  return {
    shards: 10,
    maxShards: 10,
    controllers: [null, null, null],
    restingControllers: controllers, // Controllers in resting zone
    creatures: [null, null, null, null, null],
    artifacts: [null, null, null],
    hand: hand,
    deckSize: remainingDeck.length,
    deck: remainingDeck,
    graveyard: [],
    void: []
  };
}

export function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function drawCard(playerState) {
  if (playerState.deck.length === 0) return playerState;
  
  const [drawnCard, ...remainingDeck] = playerState.deck;
  
  return {
    ...playerState,
    hand: [...playerState.hand, drawnCard],
    deck: remainingDeck,
    deckSize: remainingDeck.length
  };
}

export function activateRestingController(playerState, controllerIndex, targetSlot = null) {
  const controller = playerState.restingControllers[controllerIndex];
  if (!controller || playerState.shards < controller.cost) return playerState;
  
  let emptySlot = targetSlot;
  if (emptySlot === null) {
    emptySlot = playerState.controllers.findIndex(c => c === null);
  }
  
  if (emptySlot === -1 || playerState.controllers[emptySlot] !== null) return playerState;
  
  // Check if The Kraken is already on field BEFORE placing Neptune
  const hasKrakenOnField = controller.name === 'Neptune' && 
                           playerState.controllers.some(c => c && c.card.name === 'The Kraken');
  
  const newControllers = [...playerState.controllers];
  newControllers[emptySlot] = {
    card: controller,
    currentCH: controller.ch,
    maxCH: controller.ch,
    isActive: emptySlot === 0 || !playerState.controllers.some(c => c !== null)
  };
  
  const newRestingControllers = playerState.restingControllers.filter((_, i) => i !== controllerIndex);
  
  let newState = {
    ...playerState,
    controllers: newControllers,
    restingControllers: newRestingControllers,
    shards: playerState.shards - controller.cost
  };

  // Handle On Play effects
  if (controller.name === 'Neptune') {
    // Search deck for Water Safe
    const waterSafe = newState.deck.find(c => c.name === 'Water Safe') || 
                      newState.graveyard.find(c => c.name === 'Water Safe');
    
    if (waterSafe) {
      newState.hand = [...newState.hand, waterSafe];
      if (newState.deck.find(c => c.name === 'Water Safe')) {
        newState.deck = newState.deck.filter(c => c.name !== 'Water Safe' || c !== waterSafe);
        newState.deckSize = newState.deck.length;
      } else {
        newState.graveyard = newState.graveyard.filter(c => c !== waterSafe);
      }
    }
    
    // If The Kraken was already on field, add Kraken Slash
    if (hasKrakenOnField) {
      const krakenSlash = newState.deck.find(c => c.name === 'Kraken Slash') || 
                          newState.graveyard.find(c => c.name === 'Kraken Slash');
      
      if (krakenSlash) {
        newState.hand = [...newState.hand, krakenSlash];
        if (newState.deck.find(c => c.name === 'Kraken Slash')) {
          newState.deck = newState.deck.filter(c => c.name !== 'Kraken Slash' || c !== krakenSlash);
          newState.deckSize = newState.deck.length;
        } else {
          newState.graveyard = newState.graveyard.filter(c => c !== krakenSlash);
        }
      }
    }
  }
  
  return newState;
}

export function playCard(playerState, card, slotType, slotIndex, opponentState = null) {
  // Check cost
  if (playerState.shards < card.cost) return { playerState, opponentState };

  const newState = {
    ...playerState,
    shards: playerState.shards - card.cost,
    hand: playerState.hand.filter(c => c !== card)
  };

  let newOpponentState = opponentState ? { ...opponentState } : null;

  // Handle different card types
  if (card.card_type === 'creature') {
    const emptySlot = slotIndex ?? playerState.creatures.findIndex(c => c === null);
    if (emptySlot !== -1) {
      const newCreatures = [...playerState.creatures];
      const newCreature = {
        card: card,
        currentAP: card.ap,
        currentCH: card.ch,
        maxCH: card.ch,
        statusEffects: [],
        canAttack: card.keywords?.includes('Charge') || card.name === 'Fire Knight', // Charge: attack same turn
        hasAttacked: false,
        isZombified: false,
        attacksRemaining: 1,
        equippedArtifacts: []
      };
      
      newCreatures[emptySlot] = newCreature;
      newState.creatures = newCreatures;
      
      // Apply passive effects after summoning
      const stateWithPassives = applyPassiveEffects({ ...newState, creatures: newCreatures });
      newState.creatures = stateWithPassives.creatures;
      
      // Flame Wolf Pack: Play second one for 0 cost
      if (card.name === 'Flame Wolf' && playerState.hand.some(c => c.name === 'Flame Wolf')) {
        const secondWolf = playerState.hand.find(c => c.name === 'Flame Wolf');
        newState.packBonusCard = secondWolf;
      }

      // Trigger on-play effects
      if (newOpponentState) {
        newOpponentState = triggerOnPlayEffect(card, newOpponentState);
      }
    }
  } else if (card.card_type === 'artifact' || (card.card_type === 'spell' && card.is_persistent)) {
    const emptySlot = slotIndex ?? playerState.artifacts.findIndex(a => a === null);
    if (emptySlot !== -1) {
      const newArtifacts = [...playerState.artifacts];
      const artifactInstance = {
        card: card,
        turnsActive: 0,
        equippedTo: null // null means not equipped, or creature index
      };
      newArtifacts[emptySlot] = artifactInstance;
      newState.artifacts = newArtifacts;
    }
  } else if (card.card_type === 'spell') {
    // Instant spell - goes to graveyard after resolution
    newState.graveyard = [...playerState.graveyard, card];

    // Apply spell effects
    if (card.name === 'Black Spell') {
      // Summon 2 Tokens (2/2)
      const tokenCard = {
        id: 'token_shadow',
        name: 'Shadow Token',
        card_type: 'creature',
        element: 'shadow',
        cost: 0,
        ap: 2,
        ch: 2,
        description: 'A manifestation of shadow magic.',
        keywords: [],
        image_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/3a4d238fe_02xBlackSpell.png'
      };

      const newCreatures = [...newState.creatures];
      let tokensAdded = 0;

      // Add up to 2 tokens
      for (let i = 0; i < newCreatures.length && tokensAdded < 2; i++) {
        if (newCreatures[i] === null) {
          newCreatures[i] = {
            card: tokenCard,
            currentAP: 2,
            currentCH: 2,
            maxCH: 2,
            statusEffects: [],
            canAttack: false, // Cannot attack this turn
            hasAttacked: false,
            isZombified: false,
            attacksRemaining: 1,
            equippedArtifacts: []
          };
          tokensAdded++;
        }
      }

      newState.creatures = newCreatures;
    } else if (card.name === 'Dracos Inferno') {
      // Check requirements: Draco (creature) OR Draco Alec (controller)
      const hasDraco = playerState.creatures.some(c => c && c.card.name === 'Draco');
      const hasDracoAlec = playerState.controllers.some(c => c && c.card.name === 'Draco Alec');

      if (hasDraco || hasDracoAlec) {
        const bothPresent = hasDraco && hasDracoAlec;
        const damage = bothPresent ? 5 : 3;

        // Deal damage to all opponent non-controller creatures
        if (newOpponentState) {
          const newOpponentCreatures = newOpponentState.creatures.map(c => {
            if (!c) return null;

            const newCH = c.currentCH - damage;
            if (newCH <= 0) {
              newOpponentState.graveyard = [...newOpponentState.graveyard, c.card];
              return null;
            }

            return { ...c, currentCH: newCH };
          });

          newOpponentState.creatures = newOpponentCreatures;

          // Bonus: If both present, deal 2 damage to enemy controller
          if (bothPresent) {
            const activeCtrl = newOpponentState.controllers.find(c => c && c.isActive);
            if (activeCtrl) {
              const ctrlIdx = newOpponentState.controllers.indexOf(activeCtrl);
              const newControllers = [...newOpponentState.controllers];
              newControllers[ctrlIdx] = {
                ...activeCtrl,
                currentCH: activeCtrl.currentCH - 2
              };

              if (newControllers[ctrlIdx].currentCH <= 0) {
                newControllers[ctrlIdx] = null;
                const nextCtrl = newControllers.find(c => c !== null);
                if (nextCtrl) {
                  const nextIndex = newControllers.indexOf(nextCtrl);
                  newControllers[nextIndex] = { ...nextCtrl, isActive: true };
                }
              }

              newOpponentState.controllers = newControllers;
            }
          }
        }
      }
    } else if (card.name === 'Water Safe') {
      // Water Safe is persistent - already handled in playCard as artifact
    } else if (card.name === 'Blizzard') {
      // Freeze all non-Cryo creatures for 1 turn
      if (newOpponentState) {
        newOpponentState.creatures = newOpponentState.creatures.map(c => {
          if (!c || c.card.element === 'cryo') return c;
          return { ...c, statusEffects: [...(c.statusEffects || []), 'Freeze'], canAttack: false };
        });
      }
    } else if (card.name === 'Whirlpool') {
      // Opponent cannot play Spells next turn
      if (newOpponentState) {
        newOpponentState.cannotPlaySpells = true;
      }
    } else if (card.name === 'Tidal Wave') {
      // Return all non-Water creatures to owner's hands
      const newOpponentCreatures = [...newOpponentState.creatures];
      newOpponentState.creatures = newOpponentCreatures.map(c => {
        if (!c || c.card.element === 'water') return c;
        newOpponentState.hand = [...newOpponentState.hand, c.card];
        return null;
      });

      const newPlayerCreatures = [...newState.creatures];
      newState.creatures = newPlayerCreatures.map(c => {
        if (!c || c.card.element === 'water') return c;
        newState.hand = [...newState.hand, c.card];
        return null;
      });
    } else if (card.name === 'Enflamed') {
      // Requires target selection - for now implement basic version
      // Spirit Bonus: If Supreme Fire Spirit active, mark creature to explode
      const hasSupremeFireSpirit = playerState.controllers.some(c => c && c.card.name === 'Supreme Fire Spirit');

      if (hasSupremeFireSpirit && newOpponentState) {
        // Mark first enemy creature to explode (in full implementation, player would select target)
        const targetCreatureIndex = newOpponentState.creatures.findIndex(c => c !== null);
        if (targetCreatureIndex !== -1) {
          const targetCreature = newOpponentState.creatures[targetCreatureIndex];
          newOpponentState.creatures[targetCreatureIndex] = {
            ...targetCreature,
            markedForExplosion: true,
            explosionDamage: targetCreature.currentCH
          };
        }
      } else if (newOpponentState) {
        // Standard: Destroy first enemy creature
        const targetCreatureIndex = newOpponentState.creatures.findIndex(c => c !== null);
        if (targetCreatureIndex !== -1) {
          const targetCreature = newOpponentState.creatures[targetCreatureIndex];
          newOpponentState.graveyard = [...newOpponentState.graveyard, targetCreature.card];
          newOpponentState.creatures[targetCreatureIndex] = null;
        }
      }
    }
    }

  return { playerState: newState, opponentState: newOpponentState };
}

function triggerOnPlayEffect(card, opponentState) {
  // Sizzle effect: Deal 1 damage to enemy controller
  if (card.description?.includes('Sizzle')) {
    const activeControllers = opponentState.controllers.filter(c => c !== null);
    if (activeControllers.length > 0) {
      // Pick random controller
      const targetController = activeControllers[Math.floor(Math.random() * activeControllers.length)];
      const ctrlIndex = opponentState.controllers.indexOf(targetController);
      
      const newControllers = [...opponentState.controllers];
      newControllers[ctrlIndex] = {
        ...targetController,
        currentCH: Math.max(0, targetController.currentCH - 1)
      };

      // Check if controller is destroyed
      if (newControllers[ctrlIndex].currentCH <= 0) {
        newControllers[ctrlIndex] = null;
        // Activate next controller if available
        const nextCtrl = newControllers.find(c => c !== null && !c.isActive);
        if (nextCtrl) {
          const nextIndex = newControllers.indexOf(nextCtrl);
          newControllers[nextIndex] = { ...nextCtrl, isActive: true };
        }
      }

      return { ...opponentState, controllers: newControllers };
    }
  }

  return opponentState;
}

export function performAttack(attackerState, defenderState, targetIndex, attackerIndex, attackerType = 'creature') {
  let attacker;
  let attackerAP;
  let isControllerAttack = false;

  if (attackerType === 'controller') {
    attacker = attackerState.controllers[attackerIndex];
    if (!attacker || !attacker.isActive) {
      return { attackerState, defenderState };
    }
    attackerAP = attacker.card.ap;
    isControllerAttack = true;
  } else {
    attacker = attackerState.creatures[attackerIndex];
    if (!attacker || !attacker.canAttack || attacker.hasAttacked) {
      return { attackerState, defenderState };
    }
    attackerAP = attacker.currentAP;
  }

  // Check Water Safe protection
  const waterSafeActive = defenderState.artifacts.some(a => a && a.card.name === 'Water Safe');
  const attackerElement = isControllerAttack ? attacker.card.element : attacker.card.element;
  
  let targetDefender = null;
  let defenderIndex = targetIndex;
  
  if (waterSafeActive && attackerElement !== 'water') {
    // Check if target is water type
    if (targetIndex >= 0) {
      const targetCreature = defenderState.creatures[targetIndex];
      if (targetCreature && targetCreature.card.element === 'water') {
        return { 
          attackerState, 
          defenderState, 
          blocked: true, 
          message: '🛡️ Water Safe prevents non-Water attacks on Water creatures!' 
        };
      }
    } else {
      // Attacking controller
      const targetController = defenderState.controllers.find(c => c && c.isActive);
      if (targetController && targetController.card.element === 'water') {
        return { 
          attackerState, 
          defenderState, 
          blocked: true, 
          message: '🛡️ Water Safe prevents non-Water attacks on Water controllers!' 
        };
      }
    }
  }

  // Check if there are defending creatures with Guardian
  const guardianCreature = defenderState.creatures.find(c => c && c.card.keywords?.includes('Guardian'));

  if (guardianCreature) {
    // Must attack guardian first
    defenderIndex = defenderState.creatures.indexOf(guardianCreature);
    targetDefender = guardianCreature;
  } else if (targetIndex >= 0 && defenderState.creatures[targetIndex]) {
    targetDefender = defenderState.creatures[targetIndex];
  } else if (targetIndex === -1 || !defenderState.creatures.some(c => c !== null)) {
    // Direct controller attack (targetIndex -1 or no creatures on field)
    const activeController = defenderState.controllers.find(c => c && c.isActive);
    if (activeController) {
      const ctrlIndex = defenderState.controllers.indexOf(activeController);
      const newControllers = [...defenderState.controllers];
      newControllers[ctrlIndex] = {
        ...activeController,
        currentCH: activeController.currentCH - attackerAP
      };

      // Check if controller is destroyed
      if (newControllers[ctrlIndex].currentCH <= 0) {
        newControllers[ctrlIndex] = null;
        // Activate next controller if available
        const nextCtrl = newControllers.find(c => c !== null);
        if (nextCtrl) {
          const nextIndex = newControllers.indexOf(nextCtrl);
          newControllers[nextIndex] = { ...nextCtrl, isActive: true };
        }
      }

      // Mark attacker as having attacked
      if (isControllerAttack) {
        // Controllers don't exhaust from attacking, but track they attacked this turn
        return {
          attackerState: { ...attackerState },
          defenderState: { ...defenderState, controllers: newControllers }
        };
      } else {
        const newAttackerCreatures = [...attackerState.creatures];
        const remainingAttacks = (attacker.attacksRemaining || 1) - 1;
        newAttackerCreatures[attackerIndex] = {
          ...attacker,
          hasAttacked: remainingAttacks === 0,
          attacksRemaining: remainingAttacks
        };

        return {
          attackerState: { ...attackerState, creatures: newAttackerCreatures },
          defenderState: { ...defenderState, controllers: newControllers }
        };
      }
    }
  }

  // Combat between creatures (or controller vs creature)
  if (targetDefender) {
    const newDefenderCreatures = [...defenderState.creatures];
    const newAttackerCreatures = [...attackerState.creatures];
    const newAttackerControllers = [...attackerState.controllers];
    
    const attackerDealtDamage = attackerAP;
    const defenderDealtDamage = targetDefender.currentAP;
    
    // Check if defender will be destroyed
    const defenderWillDie = targetDefender.currentCH <= attackerDealtDamage;

    // Apply damage to defender
    targetDefender.currentCH -= attackerDealtDamage;
    
    // Controllers attacking creatures take recoil damage
    if (isControllerAttack) {
      const ctrlIndex = attackerState.controllers.indexOf(attacker);
      newAttackerControllers[ctrlIndex] = {
        ...attacker,
        currentCH: attacker.currentCH - defenderDealtDamage
      };
      
      // Check if controller died from recoil
      if (newAttackerControllers[ctrlIndex].currentCH <= 0) {
        newAttackerControllers[ctrlIndex] = null;
        const nextCtrl = newAttackerControllers.find(c => c !== null);
        if (nextCtrl) {
          const nextIndex = newAttackerControllers.indexOf(nextCtrl);
          newAttackerControllers[nextIndex] = { ...nextCtrl, isActive: true };
        }
      }
    } else {
      // First Strike: No recoil if attacker has higher AP and kills target
      const hasFirstStrike = attacker.card.name === 'Flame Samurai' && attacker.currentAP > targetDefender.currentAP && defenderWillDie;
      
      // Attacker takes recoil damage unless First Strike kills the target
      if (!hasFirstStrike) {
        attacker.currentCH -= defenderDealtDamage;
      }
    }

    // Check if defender died - trigger on-death effects
    if (targetDefender.currentCH <= 0) {
      defenderState.graveyard = [...defenderState.graveyard, targetDefender.card];
      newDefenderCreatures[defenderIndex] = null;
      
      // Fire Paladin: Holy Fire - heal controller when destroying enemy
      if (!isControllerAttack && attacker.card.name === 'Fire Paladin') {
        const activeCtrl = attackerState.controllers.find(c => c && c.isActive);
        if (activeCtrl) {
          const ctrlIdx = attackerState.controllers.indexOf(activeCtrl);
          newAttackerControllers[ctrlIdx] = {
            ...activeCtrl,
            currentCH: activeCtrl.currentCH + 2
          };
        }
      }
    } else {
      newDefenderCreatures[defenderIndex] = targetDefender;
    }

    // Check if attacker died (only creatures can die, not controllers in this context)
    if (!isControllerAttack && attacker.currentCH <= 0) {
      attackerState.graveyard = [...attackerState.graveyard, attacker.card];
      newAttackerCreatures[attackerIndex] = null;
      
      // Flaming Sword Bearer: On Death - search for equipment
      if (attacker.card.name === 'Flaming Sword Bearer') {
        const equipment = attackerState.deck.find(c => 
          c.name === 'Cursed Flame Sword' || c.name === 'Katana of Fate'
        );
        if (equipment) {
          attackerState.hand = [...attackerState.hand, equipment];
          attackerState.deck = attackerState.deck.filter(c => c !== equipment);
          attackerState.deckSize = attackerState.deck.length;
        } else {
          const equipmentGY = attackerState.graveyard.find(c => 
            c.name === 'Cursed Flame Sword' || c.name === 'Katana of Fate'
          );
          if (equipmentGY) {
            attackerState.hand = [...attackerState.hand, equipmentGY];
            attackerState.graveyard = attackerState.graveyard.filter(c => c !== equipmentGY);
          }
        }
      }
    } else if (!isControllerAttack) {
      const remainingAttacks = (attacker.attacksRemaining || 1) - 1;
      attacker.hasAttacked = remainingAttacks === 0;
      attacker.attacksRemaining = remainingAttacks;
      newAttackerCreatures[attackerIndex] = attacker;
    }

    return {
      attackerState: { ...attackerState, creatures: newAttackerCreatures, controllers: newAttackerControllers },
      defenderState: { ...defenderState, creatures: newDefenderCreatures }
    };
  }

  return { attackerState, defenderState };
}

export function applyPassiveEffects(playerState) {
  const activeController = playerState.controllers.find(c => c && c.isActive);
  if (!activeController) return playerState;

  const newCreatures = playerState.creatures.map(c => {
    if (!c) return null;
    
    let bonusAP = 0;
    
    // Draco Alec passive: All Fire creatures gain +1 AP
    if (activeController.card.name === 'Draco Alec' && c.card.element === 'fire') {
      bonusAP += 1;
    }
    
    // Supreme Fire Spirit passive: All Fire creatures gain +1 AP
    if (activeController.card.name === 'Supreme Fire Spirit' && c.card.element === 'fire') {
      bonusAP += 1;
    }
    
    // Draco Synergy: If Draco Alec is controller, Draco gains +2 AP
    if (c.card.name === 'Draco' && activeController.card.name === 'Draco Alec') {
      bonusAP += 2;
    }
    
    // Emperors Fire Dragon Boss: If Flame Emperor active, can attack twice
    if (c.card.name === 'Emperors Fire Dragon' && activeController.card.name === 'Flame Emperor') {
      bonusAP += 0; // Visual indicator, attacks handled separately
    }

    // Wind Ronin: Naturally attacks twice
    if (c.card.name === 'Wind Ronin') {
      c.attacksRemaining = 2;
    }
    
    // Apply artifact bonuses
    const equippedArtifacts = c.equippedArtifacts || [];
    equippedArtifacts.forEach(artifact => {
      if (artifact.card.name === "Draco's Slayer") {
        if (c.card.name === 'Draco') {
          bonusAP += 3;
        }
      } else if (artifact.card.name === 'Katana of Fate') {
        bonusAP += c.card.element === 'blood' ? 2 : 1;
      } else if (artifact.card.name === 'Cursed Flame Sword') {
        bonusAP += 3;
      } else if (artifact.card.name === 'Flame Orb') {
        // Overload: Double the Fire creature's AP
        if (c.card.element === 'fire') {
          bonusAP = c.card.ap; // This doubles the base AP (base + base = double)
          c.markedForMeltdown = true; // Mark for destruction at end phase
        }
      }
    });
    
    return {
      ...c,
      currentAP: c.card.ap + bonusAP
    };
  });

  return {
    ...playerState,
    creatures: newCreatures
  };
}

export function startNewTurn(playerState) {
  // Clear spell restrictions
  delete playerState.cannotPlaySpells;
  
  // Reset creatures and destroy marked ones
  const newCreatures = playerState.creatures.map(c => {
    if (!c) return null;
    
    // Clear status effects that last 1 turn
    const statusEffects = (c.statusEffects || []).filter(effect => {
      // Remove Freeze at turn start
      return effect !== 'Freeze';
    });
    
    // Enflamed Explosion: Destroy and deal damage to controller
    if (c.markedForExplosion) {
      const explosionDamage = c.explosionDamage || c.currentCH;
      playerState.graveyard = [...playerState.graveyard, c.card];
      
      // Deal damage to the controller who owns this creature
      const activeCtrl = playerState.controllers.find(ctrl => ctrl && ctrl.isActive);
      if (activeCtrl) {
        const ctrlIdx = playerState.controllers.indexOf(activeCtrl);
        playerState.controllers[ctrlIdx] = {
          ...activeCtrl,
          currentCH: activeCtrl.currentCH - explosionDamage
        };
        
        if (playerState.controllers[ctrlIdx].currentCH <= 0) {
          playerState.controllers[ctrlIdx] = null;
          const nextCtrl = playerState.controllers.find(c => c !== null);
          if (nextCtrl) {
            const nextIndex = playerState.controllers.indexOf(nextCtrl);
            playerState.controllers[nextIndex] = { ...nextCtrl, isActive: true };
          }
        }
      }
      return null;
    }
    
    // Flame Orb Meltdown: Destroy creature and deal 2 damage to all others
    if (c.markedForMeltdown) {
      playerState.graveyard = [...playerState.graveyard, c.card];
      // Deal 2 damage to all other creatures
      playerState.creatures.forEach((other, idx) => {
        if (other && other !== c) {
          other.currentCH -= 2;
          if (other.currentCH <= 0) {
            playerState.graveyard = [...playerState.graveyard, other.card];
            playerState.creatures[idx] = null;
          }
        }
      });
      return null;
    }
    
    // Destroy creatures marked for destruction
    if (c.markedForDestruction) {
      playerState.graveyard = [...playerState.graveyard, c.card];
      return null;
    }
    
    // Handle Draco's Slayer timer
    const newEquippedArtifacts = (c.equippedArtifacts || []).filter(artifact => {
      if (artifact.card.name === "Draco's Slayer" && c.card.name === 'Draco') {
        artifact.turnsActive = (artifact.turnsActive || 0) + 1;
        if (artifact.turnsActive >= 2) {
          // Destroy both artifact and Draco
          playerState.graveyard = [...playerState.graveyard, artifact.card, c.card];
          return false; // Remove artifact
        }
      }
      return true; // Keep artifact
    });
    
    // If Draco's Slayer destroyed Draco, return null
    if (c.card.name === 'Draco' && newEquippedArtifacts.length < (c.equippedArtifacts || []).length) {
      const hadDracoSlayer = (c.equippedArtifacts || []).some(a => a.card.name === "Draco's Slayer");
      if (hadDracoSlayer && newEquippedArtifacts.every(a => a.card.name !== "Draco's Slayer")) {
        return null;
      }
    }
    
    // Set attacks remaining based on card abilities
    let attacksRemaining = 1;
    
    // Wind Ronin naturally attacks twice
    if (c.card.name === 'Wind Ronin') {
      attacksRemaining = 2;
    }
    
    // Emperors Fire Dragon with Flame Emperor controller
    const activeController = playerState.controllers.find(ctrl => ctrl && ctrl.isActive);
    if (c.card.name === 'Emperors Fire Dragon' && activeController?.card.name === 'Flame Emperor') {
      attacksRemaining = 2;
    }
    
    return {
      ...c,
      canAttack: true,
      hasAttacked: false,
      attacksRemaining: attacksRemaining,
      equippedArtifacts: newEquippedArtifacts,
      statusEffects: statusEffects
    };
  });

  const newState = {
    ...playerState,
    shards: playerState.shards + 1,
    creatures: newCreatures
  };

  // Reapply passive effects
  return applyPassiveEffects(newState);
}

export function checkWinCondition(playerState) {
  return playerState.controllers.every(c => c === null);
}

export function activateControllerAbility(playerState, opponentState, abilityType, targetIndex = null) {
  const activeController = playerState.controllers.find(c => c && c.isActive);
  if (!activeController) return { playerState, opponentState };

  const card = activeController.card;
  
  // Draco Alec: Target 1 Fire creature to attack twice, destroy at end phase
  if (card.name === 'Draco Alec' && abilityType === 'active') {
    const target = playerState.creatures[targetIndex];
    if (!target || target.card.element !== 'fire') return { playerState, opponentState };
    
    const newCreatures = [...playerState.creatures];
    newCreatures[targetIndex] = {
      ...target,
      attacksRemaining: 2,
      markedForDestruction: true
    };
    
    return {
      playerState: { ...playerState, creatures: newCreatures },
      opponentState
    };
  }
  
  // Flame Emperor Passive: Pay 2 Shards to draw 1 card
  if (card.name === 'Flame Emperor' && abilityType === 'passive') {
    if (playerState.shards < 2 || playerState.deck.length === 0) {
      return { playerState, opponentState };
    }
    
    const drawnState = drawCard(playerState);
    return {
      playerState: { ...drawnState, shards: drawnState.shards - 2 },
      opponentState
    };
  }
  
  // Flame Emperor Active: Pay 2 Shards, deal 2 damage to enemy Controller
  if (card.name === 'Flame Emperor' && abilityType === 'active') {
    if (playerState.shards < 2) return { playerState, opponentState };
    
    const enemyController = opponentState.controllers.find(c => c && c.isActive);
    if (!enemyController) return { playerState, opponentState };
    
    const ctrlIndex = opponentState.controllers.indexOf(enemyController);
    const newControllers = [...opponentState.controllers];
    newControllers[ctrlIndex] = {
      ...enemyController,
      currentCH: Math.max(0, enemyController.currentCH - 2)
    };
    
    if (newControllers[ctrlIndex].currentCH <= 0) {
      newControllers[ctrlIndex] = null;
      const nextCtrl = newControllers.find(c => c !== null);
      if (nextCtrl) {
        const nextIndex = newControllers.indexOf(nextCtrl);
        newControllers[nextIndex] = { ...nextCtrl, isActive: true };
      }
    }
    
    return {
      playerState: { ...playerState, shards: playerState.shards - 2 },
      opponentState: { ...opponentState, controllers: newControllers }
    };
  }
  
  // Supreme Fire Spirit: Pay 3 Shards to destroy enemy creature with 4 CH or less
  if (card.name === 'Supreme Fire Spirit' && abilityType === 'active') {
    if (playerState.shards < 3) return { playerState, opponentState };
    
    const target = opponentState.creatures[targetIndex];
    if (!target || target.currentCH > 4) return { playerState, opponentState };
    
    const newOpponentCreatures = [...opponentState.creatures];
    opponentState.graveyard = [...opponentState.graveyard, target.card];
    newOpponentCreatures[targetIndex] = null;
    
    return {
      playerState: { ...playerState, shards: playerState.shards - 3 },
      opponentState: { ...opponentState, creatures: newOpponentCreatures }
    };
  }
  
  return { playerState, opponentState };
}

export function activateCreatureAbility(playerState, opponentState, creatureIndex, targetIndex = null) {
  const creature = playerState.creatures[creatureIndex];
  if (!creature) return { playerState, opponentState };
  
  // Emperors Fire Dragon: Pay 2 Shards to deal 3 damage to enemy creature
  if (creature.card.name === 'Emperors Fire Dragon') {
    if (playerState.shards < 2) return { playerState, opponentState };
    
    const target = opponentState.creatures[targetIndex];
    if (!target) return { playerState, opponentState };
    
    const newOpponentCreatures = [...opponentState.creatures];
    target.currentCH -= 3;
    
    if (target.currentCH <= 0) {
      opponentState.graveyard = [...opponentState.graveyard, target.card];
      newOpponentCreatures[targetIndex] = null;
    } else {
      newOpponentCreatures[targetIndex] = target;
    }
    
    return {
      playerState: { ...playerState, shards: playerState.shards - 2 },
      opponentState: { ...opponentState, creatures: newOpponentCreatures }
    };
  }
  
  // Flame Warlock: Sacrifice creature to deal 3 damage to enemy creature
  if (creature.card.name === 'Flame Warlock') {
    const target = opponentState.creatures[targetIndex];
    if (!target) return { playerState, opponentState };
    
    const newPlayerCreatures = [...playerState.creatures];
    const newOpponentCreatures = [...opponentState.creatures];
    
    // Sacrifice the warlock
    playerState.graveyard = [...playerState.graveyard, creature.card];
    newPlayerCreatures[creatureIndex] = null;
    
    // Deal 3 damage
    target.currentCH -= 3;
    if (target.currentCH <= 0) {
      opponentState.graveyard = [...opponentState.graveyard, target.card];
      newOpponentCreatures[targetIndex] = null;
    } else {
      newOpponentCreatures[targetIndex] = target;
    }
    
    return {
      playerState: { ...playerState, creatures: newPlayerCreatures },
      opponentState: { ...opponentState, creatures: newOpponentCreatures }
    };
  }
  
  return { playerState, opponentState };
}

export function applyStatusEffect(creature, effect) {
  const statusEffects = [...(creature.statusEffects || [])];
  
  if (!statusEffects.includes(effect)) {
    statusEffects.push(effect);
  }

  const updates = { statusEffects };

  // Apply effect
  switch (effect) {
    case 'Freeze':
    case 'Bind':
      updates.canAttack = false;
      break;
    case 'Paralyze':
      updates.skipNextAction = true;
      break;
  }

  return { ...creature, ...updates };
}