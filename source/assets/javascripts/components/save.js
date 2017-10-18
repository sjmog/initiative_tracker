const SaveComponent = function(parent) {
  this.render = () => {
    let el = document.createElement('button')
    el.appendChild(document.createTextNode('Save'))
    el.className = 'btn btn-info btn--save'
    el.onclick = () => { this.save() }
    return el
  }

  this.save = () => {
    parent.save()
  }

  return this.render()
}