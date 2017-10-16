const PropertyComponent = function(parent, agent, property) {
  this.render = () => {
    let el = document.createElement("td")
    el.className = "property"
    el.onblur = () => { this.change(el.textContent) }
    el.onfocus = () => { el.textContent = '' }
    el.contentEditable = true
    el.appendChild(document.createTextNode(agent[property]))

    return el
  }

  this.change = (value) => {
    parent.change(property, value)
  }
}