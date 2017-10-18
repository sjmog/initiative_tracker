const InitiativeTable = function(parent, tracker) {
  this.render = () => {
    let el = document.createElement('table')
    el.className = 'table'

    el.appendChild(new HeadersComponent(this))
    el.appendChild(new TrackerComponent(this, tracker))

    return el
  }

  this.change = () => {
    parent.render()
  }

  return this.render()
}