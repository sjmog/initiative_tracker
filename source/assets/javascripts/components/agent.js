const AgentComponent = function(parent, agent, classes = []) {
  this.render = () => {
      return `
      <tr class="agent ${this._classes()}">
        ${this._child(agent, 'name')}
        ${this._child(agent, 'initiative')}
        ${this._child(agent, 'ac')}
        ${this._child(agent, 'hp')}
        ${this._child(agent, 'status')}
      </tr>
    `
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