const TrackerComponent = function(tracker) {
  this.render = () => {
    return `
      <tbody>
        ${this._children()}
      </tbody>
    `
  }

  this._children = () => {
    return tracker.index().map((agent) => {
      const component = new AgentComponent(agent)
      return component.render()
    })
  }
}