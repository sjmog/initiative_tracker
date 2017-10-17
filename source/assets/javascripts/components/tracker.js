const TrackerComponent = function(parent, tracker) {
  this.render = () => {
    let el = document.createElement('tbody')
    tracker.index().forEach((agent) => {
      el.appendChild(new AgentComponent(this, agent))
    })
    el.appendChild(new AgentComponent(this, new Agent, "agent--new"))

    return el
  }

  this.change = (agent, property, value) => {
    agent[property] = value
    tracker.upsert(agent)
    parent.render()
  }

  return this.render()
}