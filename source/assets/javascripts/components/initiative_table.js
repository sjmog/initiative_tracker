const InitiativeTable = function(parent, tracker) {
  this.render = () => {
    let el = document.createElement('table')
    el.className = 'table initiative-table'

    el.appendChild(new HeadersComponent(this, ['Creature', 'Initiative', 'AC', 'Health', 'Status']))
    el.appendChild(new TrackerComponent(this, tracker))

    return el
  }

  this.change = () => {
    parent.render()
  }

  this.hover = (agent) => {
    parent.hover(agent)
  }

  return this.render()
}