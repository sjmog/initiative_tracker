const AgentComponent = function(parent, agent, classes = []) {
  this.render = () => {
    let el = document.createElement('tr')
    el.className = `agent ${this._classes()}`

    el.appendChild(new CreatureSelectorComponent(this, agent))

    agent.PROPERTIES.forEach((property) => {
      el.appendChild(new PropertyComponent(this, agent, property))
    })

    return el
  }

  this._classes = () => {
    if (agent.isKilled())
      classes.push('agent--killed')
    return classes
  }

  this.change = (property, value) => {
    parent.change(agent, property, value)
  }

  return this.render()
}