const LoadComponent = function(parent) {
  this.render = () => {
    let el = document.createElement('button')
    el.appendChild(document.createTextNode('Load'))
    el.className = 'btn btn-warning btn--load'
    el.onclick = () => { this.load() }
    return el
  }

  this.load = () => {
    parent.load()
  }

  return this.render()
}
;
