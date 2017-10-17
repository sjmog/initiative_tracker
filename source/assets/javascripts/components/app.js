const AppComponent = function(rootElement, tracker) {
  const HEADERS = ['Creature', 'Initiative', 'AC', 'Health', 'Status']

  this.render = () => {
    let el = document.createElement('table')

    el.id = 'app'
    el.className = 'table'

    el.appendChild(this._headers())
    el.appendChild(new TrackerComponent(this, tracker))

    if(previous = document.getElementById('app'))
      rootElement.replaceChild(el, previous)
    else
      rootElement.appendChild(el)
  }

  this._headers = () => {
    let headers = document.createElement('thead')

    HEADERS.forEach((header) => {
      let headerElement = document.createElement('td')
      let text = document.createTextNode(header)
      headerElement.appendChild(text)
      headers.appendChild(headerElement)
    })

    return headers
  }

  return this.render()
}