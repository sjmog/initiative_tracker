const InfoBox = function(parent, agent) {
  this.render = () => {
    let el = document.createElement('aside')
    el.id = 'info-box'
    el.className = 'info-box'

    if(agent) {
      const creature = Creatures.find(agent.name)
      el.appendChild(new HeaderComponent(`${agent.name}${agent.isKilled() ? ' (killed)' : ''}`))

      if(creature) {
        // uncomment to render an image for this creature
        // el.appendChild(new ImageComponent(this, creature))

        el.appendChild(new ParagraphComponent(`${creature.size} ${creature.type}${creature.subtype.length > 0 ? ` (${creature.subtype})` : ''}, ${creature.alignment}`))
        el.appendChild(new ParagraphComponent(creature.armor_class, 'Armor Class'))
        el.appendChild(new ParagraphComponent(`${agent.hp} (${creature.hit_dice}${ creature.constitution > 10 ? ` + ${ Dice.number(creature.hit_dice) * Modifier(creature.constitution)}` : '' })`, 'Hit Points'))
        el.appendChild(new ParagraphComponent(creature.speed, 'Speed'))

        el.appendChild(new AbilityScoresBox(this, creature))
        el.appendChild(new SavingThrowsBox(this, creature))
        el.appendChild(new SkillsBox(this, creature))
        el.appendChild(new ParagraphComponent(creature.senses, 'Senses'))
        el.appendChild(new ParagraphComponent(creature.languages, 'Languages'))
        el.appendChild(new ParagraphComponent(`${creature.challenge_rating} (${ChallengeRatings[creature.challenge_rating]} XP)`, 'Challenge'))

        if(creature.special_abilities !== undefined) {
          el.appendChild(document.createElement('hr'))
          creature.special_abilities.forEach((ability) => {
            el.appendChild(new ParagraphComponent(ability.desc, `${ability.name}.`))
          })
        }

        if(creature.actions !== undefined) {
          el.appendChild(new SubheaderComponent('Actions'))
          creature.actions.forEach((action) => {
            el.appendChild(new ParagraphComponent(action.desc, `${action.name}.`))
          })
        }
        

        if(creature.legendary_actions !== undefined) {
          el.appendChild(new SubheaderComponent('Legendary Actions'))
          creature.legendary_actions.forEach((action) => {
            el.appendChild(new ParagraphComponent(action.desc, `${action.name}.`))
          })
        }
      }
    }

    return el
  }

  return this.render()
}