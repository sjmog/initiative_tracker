const ButtonBar = function(parent) {
  this.render = () => {
    let el = document.createElement('aside')
    el.className = 'btn-toolbar'

    el.appendChild(new SaveComponent(this))
    el.appendChild(new LoadComponent(this))

    return el
  }

  this.save = () => {
    parent.save()
  }

  this.load = () => {
    parent.load()
  }

  return this.render()
}
;
