const TrackerComponent = function(tracker) {
  this.render = () => {
    return `
      <tbody>
        ${this._agents()}
      </tbody>
    `
  }

  this._agents = () => {
    return tracker.index().map((agent) => {
      const component = new AgentComponent(agent)
      return component.render()
    })
  }
}