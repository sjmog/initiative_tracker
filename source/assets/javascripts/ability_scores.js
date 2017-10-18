const AbilityScores = function() {
  const ABILITY_SCORES = [
    "strength", 
    "dexterity", 
    "constitution", 
    "intelligence", 
    "wisdom", 
    "charisma"
  ]

  this.short = () => {
    return ABILITY_SCORES.map((score) => score.slice(0, 3).capitalize())
  }

  this.full = () => {
    return ABILITY_SCORES
  }

  return {
    short: this.short(),
    full: this.full()
  }
}()