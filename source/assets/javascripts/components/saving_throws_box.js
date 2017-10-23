const SavingThrowsBox = function(parent, creature) {
  this.render = () => {
    let throws = []

    AbilityScores.full.forEach((abilityScore) => {
      let save
      if(save = creature[`${abilityScore}_save`])
        throws.push(`${abilityScore.slice(0, 3).capitalize()} +${save}`)
    })

    if(throws.length > 0)
      return new ParagraphComponent(throws.join(", "), "Saving Throws")
    
    return document.createElement('spacer') 
  }

  return this.render()
}