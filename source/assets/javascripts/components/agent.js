const AgentComponent = function(parent, agent, classes = []) {
  this.render = () => {
    let el = document.createElement('tr')
    el.className = `agent ${this._classes()}`

    agent.PROPERTIES.forEach((property) => {
      el.appendChild(this._child(agent, property))
    })

    return el
  }

  this._child = (agent, property) => {
    const component = new PropertyComponent(this, agent, property)
    return component.render()
  }

  this._classes = () => {
    if (agent.isKilled())
      classes.push('agent--killed')
    return classes
  }

  this.change = (property, value) => {
    parent.change(agent, property, value)
  }
}