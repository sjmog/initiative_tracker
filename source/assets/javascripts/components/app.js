const AppComponent = function(rootElement, tracker) {
  this.render = () => {
    let el = document.createElement('div')
    el.id = 'app'

    el.appendChild(new ButtonBar(this))
    el.appendChild(new InitiativeTable(this, tracker))

    if(previous = document.getElementById('app'))
      rootElement.replaceChild(el, previous)
    else
      rootElement.appendChild(el)
  }

  this.save = () => {
    Persistence.save(tracker)
  }

  this.load = () => {
    App = Persistence.load()
  }

  return this.render()
}