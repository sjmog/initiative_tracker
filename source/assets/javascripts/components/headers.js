const HeadersComponent = function(parent) {
  const HEADERS = ['Creature', 'Initiative', 'AC', 'Health', 'Status']

  this.render = () => {
    let el = document.createElement('thead')

    HEADERS.forEach((header) => {
      let headerElement = document.createElement('td')
      headerElement.appendChild(document.createTextNode(header))
      el.appendChild(headerElement)
    })

    return el
  }

  return this.render();
}