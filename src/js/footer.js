export class footer(){
    constructor(){
        this.container ="footer";
        this.render();
    }
}
render(){
    this.container.innerHTML = `
     <footer>
      &copy;2025 ⛺ SleepOutside ⛺ WDD 330 ⛺ BYU-Idaho for BYU-Pathway
      Worldwide Online
    </footer>
  </body>`
}