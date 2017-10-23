const HeaderComponent = function(content) {
  this.render = () => {
    let el = document.createElement('h2')
    el.appendChild(document.createTextNode(content))
    
    return el
  }

  return this.render()
}
;
