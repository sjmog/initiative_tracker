const PropertyComponent = function(parent, agent, property) {
  this.render = () => {
    let el = document.createElement("td")
    el.className = "property"
    el.onblur = () => { this._change(el.textContent) }
    el.onfocus = () => { el.textContent = '' }
    el.oninput = (event) => { this._handleEnter(event, el) }
    el.contentEditable = true
    el.appendChild(document.createTextNode(agent[property]))

    return el
  }

  this._change = (value) => {
    parent.changeProperty(property, value)
  }

  this._handleEnter = (event, el) => {
    if (event.inputType == 'insertText' && event.data == null)
      el.blur()
  }

  return this.render()
}
;
