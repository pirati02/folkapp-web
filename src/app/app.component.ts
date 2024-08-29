import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MediaController } from './services/media.controller';

interface MenuItem {
  title: string,
  link: string,
  id: number,
  isSelected: boolean
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink]
})
export class AppComponent {
  menu: MenuItem[] = [
    <MenuItem>{
      id: 2,
      title: 'ანსამბლები',
      link: '/artists/2',
      isSelected: true
    },
    <MenuItem>{
      id: 1,
      title: 'ძველი ჩანაწერები',
      link: '/artists/1',
      isSelected: false
    }
  ]

  selectedMenuItem: MenuItem = this.menu[0];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public mediaController: MediaController
  ){
   
  } 

  navigate(menuItem: MenuItem){
    this.menu.forEach(item => item.isSelected = false);
    menuItem.isSelected = true;
    this.selectedMenuItem = menuItem;
    this.router.navigate([menuItem.link]);
  }
}
