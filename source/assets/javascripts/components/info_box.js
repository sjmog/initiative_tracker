const InfoBox = function(parent, agent) {
  this.render = () => {
    let el = document.createElement('aside')
    el.id = 'info-box'
    el.className = 'info-box'

    if(agent) {
      const creature = Creatures.find(agent.name)
      el.appendChild(this._header(`${agent.name}${agent.isKilled() ? ' (killed)' : ''}`))

      if(creature) {
        // uncomment to render an image for this creature
        // el.appendChild(new ImageComponent(this, creature))

        el.appendChild(this._paragraph(`${creature.size} ${creature.type}${creature.subtype.length > 0 ? ` (${creature.subtype})` : ''}, ${creature.alignment}`))
        el.appendChild(this._paragraph(creature.armor_class, 'Armor Class'))
        el.appendChild(this._paragraph(`${agent.hp} (${creature.hit_dice}${ creature.constitution > 10 ? ` + ${ Dice.number(creature.hit_dice) * Modifier(creature.constitution)}` : '' })`, 'Hit Points'))
        el.appendChild(this._paragraph(creature.speed, 'Speed'))

        el.appendChild(new AbilityScoresBox(this, creature))
        el.appendChild(new SavingThrowsBox(this, creature))
      }
    }

    return el
  }

  this._header = (content) => {
    let header = document.createElement('h2')
    header.appendChild(document.createTextNode(content))
    return header
  }

  this._paragraph = (content, label) => {
    let paragraph = document.createElement('p')
    if(label) 
      paragraph.appendChild(this._bold(label))
    paragraph.appendChild(document.createTextNode(content))
    return paragraph
  }

  this._bold = (content) => {
    let bold = document.createElement('span')
    bold.className = 'label--strong'
    bold.appendChild(document.createTextNode(content))
    return bold
  }

  return this.render()
}