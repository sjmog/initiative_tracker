const CreatureOptionComponent = function(parent, creature, selected) {
  this.render = () => {
    let el = document.createElement('option')
    el.appendChild(document.createTextNode(creature.name))
    el.selected = selected

    return el
  }

  return this.render()
}
;
