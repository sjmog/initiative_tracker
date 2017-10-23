const ImageComponent = function(parent, creature) {
  this.render = () => {
    let el = document.createElement('img')
    el.className = "image"
    el.src = "/assets/images/default.png"

    return el
  }

  return this.render()
}
;
