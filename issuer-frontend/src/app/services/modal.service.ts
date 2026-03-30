import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ModalData {
  type: 'ALERT' | 'CONFIRM' | 'PROMPT';
  message: string;
  resolve: (value?: any) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject = new Subject<ModalData>();
  modalState$ = this.modalSubject.asObservable();

  alert(message: string): void {
    this.modalSubject.next({
      type: 'ALERT',
      message,
      resolve: () => {}
    });
  }

  confirm(message: string): Promise<boolean> {
    return new Promise(resolve => {
      this.modalSubject.next({
        type: 'CONFIRM',
        message,
        resolve
      });
    });
  }
  
  prompt(message: string): Promise<string | null> {
    return new Promise(resolve => {
      this.modalSubject.next({
        type: 'PROMPT',
        message,
        resolve
      });
    });
  }
}
