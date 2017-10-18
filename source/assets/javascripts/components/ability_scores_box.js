const AbilityScoresBox = function(parent, creature) {
  this.render = () => {
    let el = document.createElement('table')
    el.className = 'table table--ability-scores'

    el.appendChild(new HeadersComponent(this, AbilityScores.short))
    el.appendChild(this._tbody())

    return el
  }

  this._tbody = () => {
    let tbody = document.createElement('tbody')
    AbilityScores.full.forEach(function(abilityScore) {
      let cell = document.createElement('td')
      let score = creature[abilityScore]
      let modifier = Modifier(score)
      let modifierSign = Math.sign(modifier) == -1 ? "-" : "+"
      cell.appendChild(document.createTextNode(`${score} (${modifierSign}${Math.abs(modifier)})`))
      tbody.appendChild(cell)
    })

    return tbody
  }

  return this.render()
}