const SubheaderComponent = function(content) {
  this.render = () => {
    let el = document.createElement('h3')
    el.appendChild(document.createTextNode(content))
    
    return el
  }

  return this.render()
}
;
