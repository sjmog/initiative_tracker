const AppComponent = function(rootElement, tracker) {
  this.render = () => {
    this.el = document.createElement('div')
    this.el.id = 'app'

    this.infoBox = new InfoBox(this)

    this.el.appendChild(new ButtonBar(this))
    this.el.appendChild(new InitiativeTable(this, tracker))
    this.el.appendChild(this.infoBox)

    if(previous = document.getElementById('app'))
      rootElement.replaceChild(this.el, previous)
    else
      rootElement.appendChild(this.el)
  }

  this.save = () => {
    Persistence.save(tracker)
  }

  this.load = () => {
    App = Persistence.load()
  }

  this.hover = (agent) => {
    this.infoBox = new InfoBox(this, agent)
    this.el.replaceChild(new InfoBox(this, agent), document.getElementById('info-box'))
  }

  return this.render()
}
;
