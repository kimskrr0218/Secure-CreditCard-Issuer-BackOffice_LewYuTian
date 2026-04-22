import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-edit-rejected-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopNavbarComponent],
  templateUrl: './edit-rejected-card.component.html',
  styleUrls: ['./edit-rejected-card.component.css']
})
export class EditRejectedCardComponent implements OnInit {
  cardForm!: FormGroup;
  showMessageModal = false;
  modalMessage = '';
  modalSuccess = false;
  showConfirmModal = false;
  pendingRequestId: string | null = null;
  loading = true;

  accounts: any[] = [];

  // Read-only display values
  accountDisplay = '';
  customerDisplay = '';
  cardNumberDisplay = 'N/A';
  rejectionReason = '';

  private pendingUrl = '/api/pending';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cardForm = this.fb.group({
      accountId: ['', Validators.required],
      cardType: ['', Validators.required],
      cardBrand: ['', Validators.required],
      cardMode: ['PHYSICAL', Validators.required],
      cardHolderName: ['', Validators.required]
    });

    this.pendingRequestId = this.route.snapshot.paramMap.get('id');

    // Load accounts, THEN pre-fill the form
    this.http.get<any[]>('/api/accounts', { withCredentials: true }).subscribe({
      next: (data) => {
        this.accounts = data;
        this.prefillForm();
      },
      error: (err) => {
        console.error('Error loading accounts:', err);
        this.prefillForm();
      }
    });
  }

  private prefillForm(): void {
    // Fast path: data passed via router state from cards.component
    const stateData = history.state?.requestData;
    if (stateData && (stateData.accountId || stateData.cardType)) {
      this.applyFormData(stateData);
      return;
    }

    // Fallback: fetch the pending request by ID from the API
    if (this.pendingRequestId) {
      this.http.get<any[]>(this.pendingUrl, { withCredentials: true }).subscribe({
        next: (data) => {
          const req = data.find(r => String(r.id) === this.pendingRequestId);
          if (req?.payload) {
            try {
              const payload = typeof req.payload === 'string'
                ? JSON.parse(req.payload)
                : req.payload;
              this.applyFormData({
                accountId:      payload.accountId      || payload.account?.id   || '',
                cardType:       payload.cardType        || '',
                cardBrand:      payload.cardBrand       || '',
                cardMode:       payload.cardMode        || 'PHYSICAL',
                cardHolderName: payload.cardHolderName  || '',
                cardNumber:     payload.cardNumber      || '',
                accountNumber:  payload.accountNumber   || '',
                accountCurrency: payload.accountCurrency || '',
                customerNo:     payload.customerNo      || '',
                customerName:   payload.customerName    || '',
                rejectionReason: req.rejectionReason     || req.reason || ''
              });
            } catch (e) {
              console.error('Error parsing pending request payload:', e);
              this.loading = false;
            }
          } else {
            this.loading = false;
          }
        },
        error: (err) => {
          console.error('Error loading pending request:', err);
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
    }
  }

  private applyFormData(data: any): void {
    const accountId = data.accountId ? Number(data.accountId) : '';

    // Card number (only available for non-CREATE rejected requests)
    this.cardNumberDisplay = data.cardNumber ? this.maskCardNumber(data.cardNumber) : 'N/A';

    // Rejection reason
    this.rejectionReason = data.rejectionReason || '';

    // Build read-only display text for Account and Customer
    if (accountId) {
      const account = this.accounts.find(a => a.id === accountId);
      if (account) {
        this.accountDisplay = `${account.accountNumber} (${account.currency})`;
        if (account.customer) {
          this.customerDisplay = `${account.customer.customerNo} - ${account.customer.name}`;
        }
      } else {
        // Fallback: use enriched fields from the pending request payload
        const acctNum = data.accountNumber || '';
        const acctCur = data.accountCurrency || '';
        this.accountDisplay = acctNum ? `${acctNum}${acctCur ? ' (' + acctCur + ')' : ''}` : `Account #${accountId}`;
        const custNo   = data.customerNo   || '';
        const custName = data.customerName || '';
        this.customerDisplay = custNo && custName ? `${custNo} - ${custName}` : (custNo || custName || '');
      }
    }

    // Patch form values
    this.cardForm.patchValue({
      accountId:      accountId,
      cardType:       data.cardType        || '',
      cardBrand:      data.cardBrand       || '',
      cardMode:       data.cardMode        || 'PHYSICAL',
      cardHolderName: data.cardHolderName  || ''
    });

    this.loading = false;
  }

  onResubmit(): void {
    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      return;
    }
    this.showConfirmModal = true;
  }

  confirmProceed(): void {
    this.showConfirmModal = false;

    const formValue = this.cardForm.value;

    const payload = {
      accountId:         formValue.accountId,
      cardType:          formValue.cardType,
      cardBrand:         formValue.cardBrand,
      cardMode:          formValue.cardMode,
      cardHolderName:    formValue.cardHolderName,
      originalRequestId: this.pendingRequestId ? Number(this.pendingRequestId) : null
    };

    const pendingRequest = {
      entityType: 'CARD',
      operation:  'CREATE',
      payload:    JSON.stringify(payload)
    };

    this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = '✅ Card request resubmitted for manager approval.';
        this.modalSuccess = true;
        this.showMessageModal = true;
      },
      error: (err) => {
        const msg = err?.error?.message || err?.error?.error || 'An unexpected error occurred.';
        this.modalMessage = '❌ ' + msg;
        this.modalSuccess = false;
        this.showMessageModal = true;
      }
    });
  }

  cancelConfirm(): void {
    this.showConfirmModal = false;
  }

  maskCardNumber(number: string): string {
    if (!number || number.length < 16) return number;
    return number.substring(0, 4) + ' **** **** ' + number.substring(number.length - 4);
  }

  cancel(): void {
    this.router.navigate(['/cards']);
  }

  closeMessage(): void {
    this.showMessageModal = false;
    if (this.modalSuccess) {
      this.router.navigate(['/cards']);
    }
  }
}
