import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';
import { ModalService } from '../services/modal.service';

@Component({
  selector: 'app-edit-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopNavbarComponent],
  templateUrl: './edit-card.component.html',
  styleUrls: ['./edit-card.component.css']
})
export class EditCardComponent implements OnInit {
  cardForm!: FormGroup;
  showMessageModal = false;
  modalMessage = '';
  showConfirmModal = false;
  cardId: string | null = null;
  loading: boolean = true;
  card: any = null;

  private cardsUrl = '/api/cards';
  private pendingUrl = '/api/pending';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.cardForm = this.fb.group({
      cardHolderName: ['', Validators.required],
      cardType: ['', Validators.required],
      cardBrand: ['', Validators.required],
      cardMode: ['PHYSICAL', Validators.required]
    });

    this.cardId = this.route.snapshot.paramMap.get('id');
    if (this.cardId) {
      this.http.get(`${this.cardsUrl}/${this.cardId}`, { withCredentials: true }).subscribe({
        next: (data: any) => {
          this.card = data;
          this.cardForm.patchValue({
            cardHolderName: data.cardHolderName,
            cardType: data.cardType,
            cardBrand: data.cardBrand || '',
            cardMode: data.cardMode || 'PHYSICAL'
          });
          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching card for edit:', err);
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
    }
  }

  onSubmit(): void {
    if (this.cardForm.invalid || !this.cardId) {
      this.cardForm.markAllAsTouched();
      return;
    }
    this.showConfirmModal = true;
  }

  confirmProceed(): void {
    this.showConfirmModal = false;

    const payload = this.cardForm.value;
    payload.id = this.cardId;

    const pendingRequest = {
      entityType: 'CARD',
      operation: 'UPDATE',
      payload: JSON.stringify(payload)
    };

    this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = '✅ Card update request submitted for approval.';
        this.showMessageModal = true;
      },
      error: (err) => {
        console.error('Error submitting update request:', err);
        this.modalMessage = '❌ Failed to submit update request.';
        this.showMessageModal = true;
      }
    });
  }

  cancelConfirm(): void {
    this.showConfirmModal = false;
  }

  cancel(): void {
    this.router.navigate(['/cards']);
  }

  closeMessage(): void {
    this.showMessageModal = false;
    this.router.navigate(['/cards']);
  }
}
