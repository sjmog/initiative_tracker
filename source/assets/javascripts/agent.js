const Agent = function(id, name, ac, hp, status) {
  this.PROPERTIES = ['initiative', 'ac', 'hp', 'status']

  this.id     = id
  this.name   = name
  this.initiative = Math.round(Math.random()*20)
  this.ac     = ac || 10
  this.hp     = hp || 0
  this.status = status || ""

  this.isKilled = () => {
    return this.hp < 0
  }
}