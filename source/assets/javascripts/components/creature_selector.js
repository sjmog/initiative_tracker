const CreatureSelectorComponent = function(parent, agent) {
  this.render = () => {
    let el = document.createElement('td')
    el.className = 'property creature-selector'

    let select = document.createElement('select')

    // required for placeholders
    select.appendChild(document.createElement('option'))

    Creatures.data.forEach((creature) => {
      let option = document.createElement('option')
      option.appendChild(document.createTextNode(creature.name))
      if(creature.name == agent.name)
        option.selected = true

      select.appendChild(option)
    })

    select.onchange = () => { this._change(select.value) }

    el.appendChild(select)

    $(select).select2({
      placeholder: "Select or create creature",
      tags: true
    })

    return el
  }

  this._change = (name) => {
    parent.change(Creatures.findOrCreateBy(name))
  }

  return this.render()
}