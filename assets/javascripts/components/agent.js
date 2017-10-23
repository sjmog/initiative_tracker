const AgentComponent = function(parent, agent, classes = []) {
  this.render = () => {
    let el = document.createElement('tr')
    el.className = `agent ${this._classes()}`

    el.appendChild(new CreatureSelectorComponent(this, agent))

    agent.PROPERTIES.forEach((property) => {
      el.appendChild(new PropertyComponent(this, agent, property))
    })

    el.onmouseenter = () => { this._hover() }

    return el
  }

  this._classes = () => {
    if (agent.isKilled())
      classes.push('agent--killed')
    return classes
  }

  this.change = (creature) => {
    agent.name       = creature.name
    agent.initiative = parseInt(agent.initiative + Modifier(creature.dexterity || 10))
    agent.ac         = parseInt(creature.armor_class)
    agent.hp         = parseInt(creature.hit_points)

    parent.change(agent)
  }

  this.changeProperty = (property, value) => {
    agent[property] = value

    parent.change(agent)
  }

  this._hover = () => {
    parent.hover(agent)
  }

  return this.render()
}
;
