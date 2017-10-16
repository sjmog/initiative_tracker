const AppComponent = function(rootElement, tracker) {
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

  this.render = () => {
    rootElement.html(`
      <table class="table">
        <thead>
          <td>Name</td>
          <td>Initiative</td>
          <td>AC</td>
          <td>Health</td>
          <td>Status</td>
        </thead>
        ${this._children()}
      </table>
    `)
  }

  this._children = () => {
    const component = new TrackerComponent(this, tracker)
    return component.render()
  }
}