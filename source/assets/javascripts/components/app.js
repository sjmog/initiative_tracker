const AppComponent = function(rootElement, tracker) {
  this.render = () => {
    let el = document.createElement('div')
    el.id = 'app'

    el.appendChild(this._buttonBar())
    el.appendChild(this._table())

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

  this._buttonBar = () => {
    let buttonBar = document.createElement('aside')
    buttonBar.className = 'btn-toolbar'

    buttonBar.appendChild(new SaveComponent(this))
    buttonBar.appendChild(new LoadComponent(this))

    return buttonBar
  }

  this._table = () => {
    let table = document.createElement('table')
    table.className = 'table'

    table.appendChild(new HeadersComponent(this))
    table.appendChild(new TrackerComponent(this, tracker))

    return table
  }

  return this.render()
}