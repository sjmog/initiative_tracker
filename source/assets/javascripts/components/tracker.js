const TrackerComponent = function(parent, tracker) {
  this.render = () => {
    let el = document.createElement('tbody')
    this._agents().forEach((agent) => {
      el.appendChild(agent)
    })
    el.appendChild(this._newAgent())
    
    return el
  }

  this._agents = () => {
    return tracker.index().map((agent) => {
      const component = new AgentComponent(this, agent)
      return component.render()
    })
  }

  this._newAgent = () => {
    const component = new AgentComponent(this, new Agent, "agent--new")
    return component.render()
  }

  this.change = (agent, property, value) => {
    agent[property] = value
    tracker.upsert(agent)
    parent.render()
  }
}