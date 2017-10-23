const Agent = function(id, name, initiative, ac, hp, status) {
  this.PROPERTIES = ['initiative', 'ac', 'hp', 'status']

  this.id     = id
  this.name   = name || "Untitled Creature"
  this.initiative = initiative || Roll("1d20")
  this.ac     = ac || 10
  this.hp     = hp || 0
  this.status = status || ""

  this.isKilled = () => {
    return this.hp < 0
  }
}
;
