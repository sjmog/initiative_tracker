const AppComponent = function(rootElement, tracker) {
  const HEADERS = ['Name', 'Initiative', 'AC', 'Health', 'Status']

  this.render = () => {
    let previous = document.getElementById('app')

    let el = document.createElement('table')
    el.id = 'app'
    el.className = 'table'

    let headers = document.createElement('thead')

    HEADERS.forEach((header) => {
      let headerElement = document.createElement('td')
      let text = document.createTextNode(header)
      headerElement.appendChild(text)
      headers.appendChild(headerElement)
    })

    el.appendChild(headers)
    el.appendChild(this._children())

    if (previous)
      rootElement.replaceChild(el, previous)
    else
      rootElement.appendChild(el)
  }

  this._children = () => {
    const component = new TrackerComponent(this, tracker)
    return component.render()
  }
}