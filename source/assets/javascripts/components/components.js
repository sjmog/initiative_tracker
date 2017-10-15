const Components = function() {
  this.serial = 1
  this.components = []

  this.register = (component) => {
    const id = this.serial++

    this.components.push({
      id: id,
      component: component
    })

    return id
  }

  this.find = (id) => {
    const record = this.components.filter((component) => component.id == parseInt(id))[0]
    return record.component
  }
}

let components = new Components