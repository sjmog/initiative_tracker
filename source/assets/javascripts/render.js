const Render = function(elements, tracker) {
  this.tracker = () => {
    elements.main.html(this._tracker())
  }

  this._tracker = (element, content) => {
    return tracker.index().map((agent) => {
      return this._agent(agent)
    })
  }

  this._agent = (agent) => {
    return `
    <tr>
      <td>${agent.name}</td>
      <td>${agent.initiative}</td>
      <td>${agent.ac}</td>
      <td>${agent.hp}</td>
      <td>${agent.status}</td>
    </tr>
    `
  }
}