const AgentComponent = function(agent) {
  this.render = () => {
      return `
      <tr>
        ${this._child(agent, 'name')}
        ${this._child(agent, 'initiative')}
        ${this._child(agent, 'ac')}
        ${this._child(agent, 'hp')}
        ${this._child(agent, 'status')}
      </tr>
    `
  }

  this._child = (agent, property) => {
    const component = new PropertyComponent(agent, property)
    return component.render()
  }
}