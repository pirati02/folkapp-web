import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {InstallPromptService} from '../../services/install-prompt.service';

/** A one-time card above the player suggesting to add the app to the home screen. */
@Component({
  selector: 'app-install-prompt',
  templateUrl: './install-prompt.component.html',
  styleUrls: ['./install-prompt.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class InstallPromptComponent {
  constructor(public installPrompt: InstallPromptService) {
  }
}
