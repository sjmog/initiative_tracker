const ParagraphComponent = function(content, label) {
  this.render = () => {
    let el = document.createElement('p')

    if(label) 
      el.appendChild(this._bold(label))

    el.appendChild(document.createTextNode(content))

    return el
  }

  this._bold = (content) => {
    let bold = document.createElement('span')
    bold.className = 'label--strong'
    bold.appendChild(document.createTextNode(content))
    
    return bold
  }

  return this.render()
}