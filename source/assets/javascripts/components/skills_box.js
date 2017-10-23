const SkillsBox = function(parent, creature) {
  const SKILLS = [
    'athletics',
    'acrobatics',
    'sleight of hand',
    'stealth',
    'arcana',
    'history',
    'investigation',
    'nature',
    'religion',
    'animal handling',
    'insight',
    'medicine',
    'perception',
    'survival',
    'deception',
    'intimidation',
    'performance',
    'persuasion'
  ]

  this.render = () => {
    let el = document.createElement('div')

    let creatureSkills = []

    SKILLS.forEach((skill) => {
      if(creature[skill] !== undefined)
        creatureSkills.push(`${skill.capitalize()} +${creature[skill]}`)
    })
    
    if(creatureSkills.length > 0) {
      el.appendChild(new ParagraphComponent(creatureSkills.join(', '), "Skills"))
    }

    return el
  }

  return this.render()
}