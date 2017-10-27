const Creatures = function() {
  this.init = () => {
    this.data = Persistence.loadCreatures() || DEFAULT_CREATURES

    return this
  }

  this.add = (creature) => {
    this.data.push(creature)
    Persistence.save('creatures', this.data)

    return creature
  }

  this.find = (name) => {
    return this.data.filter((creature) => creature.name == name)[0]
  }

  this.findOrCreateBy = (name) => {
    return this.find(name) || this.add(this._defaultCreature(name))
  }

  this._defaultCreature = (name) => {
    return {
      "name": name,
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 10,
      "hit_points": Roll("1d8"),
      "hit_dice": "1d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 10,
      "constitution": 10,
      "intelligence": 10,
      "wisdom": 10,
      "charisma": 10,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "any one language (usually Common)",
      "challenge_rating": "1/6",
      "special_abilities": [],
      "actions": [
        {
          "name": "Longsword",
          "desc": "Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 4 (1d8) slashing damage.",
          "attack_bonus": 1,
          "damage_dice": "1d8"
        }
      ]
    }
  }

  return {
    add: this.add,
    find: this.find,
    findOrCreateBy: this.findOrCreateBy,
    init: this.init,
    data: this.data
  }.init()
}()