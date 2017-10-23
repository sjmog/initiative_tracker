const HeadersComponent = function(parent, headers) {
  this.render = () => {
    let el = document.createElement('thead')

    headers.forEach((header) => {
      let headerElement = document.createElement('td')
      headerElement.appendChild(document.createTextNode(header))
      el.appendChild(headerElement)
    })

    return el
  }

  return this.render();
}
;
