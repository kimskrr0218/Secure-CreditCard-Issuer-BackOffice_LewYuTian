import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService, ModalData } from '../services/modal.service';

@Component({
  selector: 'app-global-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="activeModal">
      <div class="modal-content" style="width: 400px;">
        
        <div class="modal-header">
          <h3>{{ getTitle() }}</h3>
          <button class="close-btn" (click)="close()">&times;</button>
        </div>

        <div style="padding: 10px 0; font-size: 16px; color: #333; margin-bottom: 20px;">
          {{ activeModal.message }}
        </div>

        <div *ngIf="activeModal.type === 'PROMPT'" style="margin-bottom: 20px;">
          <input type="text" [(ngModel)]="promptValue" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" autofocus />
        </div>

        <div class="modal-actions">
          <ng-container *ngIf="activeModal.type === 'ALERT'">
            <button class="submit-btn" style="background-color: #0062cc;" (click)="confirm()">OK</button>
          </ng-container>

          <ng-container *ngIf="activeModal.type === 'CONFIRM' || activeModal.type === 'PROMPT'">
            <button class="cancel-btn" style="background-color: white; border: 1px solid #ccc;" (click)="close()">Cancel</button>
            <button class="submit-btn" style="background-color: #0062cc;" (click)="confirm()">OK</button>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background-color: rgba(0, 0, 0, 0.5); display: flex;
      align-items: center; justify-content: center; z-index: 10000;
    }
    .modal-content {
      background: white; padding: 25px; border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;
    }
    .modal-header h3 { margin: 0; font-size: 18px; color: #333; }
    .close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #888; margin-top: -5px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
    button { padding: 8px 16px; cursor: pointer; border-radius: 4px; font-weight: bold; }
    .submit-btn { color: white; border: none; }
    .cancel-btn { color: #333; }
  `]
})
export class GlobalModalComponent implements OnInit {
  activeModal: ModalData | null = null;
  promptValue: string = '';

  constructor(private modalService: ModalService) {}

  ngOnInit() {
    this.modalService.modalState$.subscribe(data => {
      this.activeModal = data;
      this.promptValue = '';
    });
  }

  getTitle() {
    if (!this.activeModal) return '';
    if (this.activeModal.type === 'ALERT') return 'Notification';
    if (this.activeModal.type === 'CONFIRM') return 'Confirm Action';
    if (this.activeModal.type === 'PROMPT') return 'Input Required';
    return '';
  }

  close() {
    if (this.activeModal) {
      if (this.activeModal.type === 'CONFIRM') {
        this.activeModal.resolve(false);
      } else if (this.activeModal.type === 'PROMPT') {
        this.activeModal.resolve(null);
      } else {
        this.activeModal.resolve();
      }
    }
    this.activeModal = null;
  }

  confirm() {
    if (this.activeModal) {
      if (this.activeModal.type === 'CONFIRM') {
        this.activeModal.resolve(true);
      } else if (this.activeModal.type === 'PROMPT') {
        this.activeModal.resolve(this.promptValue);
      } else {
        this.activeModal.resolve();
      }
    }
    this.activeModal = null;
  }
}
