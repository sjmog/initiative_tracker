const CreatureSelectorComponent = function(parent, agent) {
  this.render = () => {
    let el = document.createElement('td')
    el.className = 'property creature-selector'

    let select = document.createElement('select')

    this._enablePlaceholders(select)

    Creatures.data.forEach((creature) => {
      select.appendChild(new CreatureOptionComponent(this, creature, creature.name == agent.name))
    })

    select.onchange = () => { this._change(select.value) }

    el.appendChild(select)

    $(select).select2({
      placeholder: "Select or create creature",
      tags: true
    })

    return el
  }

  this._enablePlaceholders = (select) => {
    select.appendChild(document.createElement('option'))
  }

  this._change = (name) => {
    parent.change(Creatures.findOrCreateBy(name))
  }

  return this.render()
}
;
