import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

interface MenuItem {
  title: string,
  link: string,
  id: number
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
      title: 'ანსამბლები',
      link: '/artists/2'
    },
    <MenuItem>{
      title: 'ძველი ჩანაწერები',
      link: '/artists/1'
    }
  ]
}
