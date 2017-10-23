const SavingThrowsBox = function(parent, creature) {
  this.render = () => {
    let throws = []

    AbilityScores.full.forEach((abilityScore) => {
      let save
      if(save = creature[`${abilityScore}_save`])
        throws.push(`${abilityScore.slice(0, 3).capitalize()} +${save}`)
    })

    if(throws.length > 0)
      return this._paragraph(throws.join(", "), "Saving Throws")
    
    return document.createElement('spacer') 
  }

  this._paragraph = (content, label) => {
    let paragraph = document.createElement('p')
    if(label) 
      paragraph.appendChild(this._bold(label))
    paragraph.appendChild(document.createTextNode(content))
    return paragraph
  }

  this._bold = (content) => {
    let bold = document.createElement('span')
    bold.className = 'label--strong'
    bold.appendChild(document.createTextNode(content))
    return bold
  }

  return this.render()
}
;
