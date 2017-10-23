const TrackerComponent = function(parent, tracker) {
  this.render = () => {
    let el = document.createElement('tbody')
    tracker.index().forEach((agent) => {
      el.appendChild(new AgentComponent(this, agent))
    })
    el.appendChild(new AgentComponent(this, new Agent, "agent--new"))

    return el
  }

  this.change = (agent) => {
    tracker.upsert(agent)

    parent.change()
  }

  this.hover = (agent) => {
    parent.hover(agent)
  }

  return this.render()
}
;
