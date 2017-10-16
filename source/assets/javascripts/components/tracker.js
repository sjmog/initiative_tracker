const TrackerComponent = function(parent, tracker) {
  this.render = () => {
    return `
      <tbody>
        ${this._agents()}
        ${this._newAgent()}
      </tbody>
    `
  }

  this._agents = () => {
    return tracker.index().map((agent) => {
      const component = new AgentComponent(this, agent)
      return component.render()
    })
  }

  this._newAgent = () => {
    const component = new AgentComponent(this, new Agent)
    return component.render()
  }

  this.change = (agent, property, value) => {
    agent[property] = value
    tracker.upsert(agent)
    parent.render()
  }
}