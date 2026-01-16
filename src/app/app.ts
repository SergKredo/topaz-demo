import { Component, signal } from '@angular/core';
import { SignatureComponent } from './signature/signature';

@Component({
  selector: 'app-root',
  imports: [SignatureComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('topaz-demo');
}
