import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-edit-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopNavbarComponent],
  templateUrl: './edit-account.component.html',
  styleUrls: ['./edit-account.component.css']
})
export class EditAccountComponent implements OnInit {
  accountForm!: FormGroup;
  accountId!: number;
  originalAccount: any = null;
  pendingRequestId: number | null = null;
  isResubmit = false;

  showMessageModal = false;
  modalMessage = '';
  showConfirmModal = false;

  private pendingUrl = '/api/pending';
  private apiUrl = '/api/accounts';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.cancel();
      return;
    }
    this.accountId = Number(idParam);
    
    const pendingIdParam = this.route.snapshot.queryParamMap.get('pendingRequestId');
    if (pendingIdParam) {
      this.pendingRequestId = Number(pendingIdParam);
      this.isResubmit = true;
    }

    this.accountForm = this.fb.group({
      customerDisplay: [{value: '', disabled: true}],
      accountNumber: [{value: '', disabled: true}],
      accountType: [{value: '', disabled: true}],
      currency: ['', Validators.required],
      balance: ['', Validators.required],
      creditLimit: ['', Validators.required],
      billingCycle: ['', Validators.required],
      interestRate: ['', Validators.required],
      openDate: [{value: '', disabled: true}],
      status: ['', Validators.required]
    });

    this.loadAccount();
  }

  loadAccount(): void {
    this.http.get<any>(`${this.apiUrl}/${this.accountId}`, { withCredentials: true }).subscribe({
      next: (account) => {
        this.originalAccount = account;

        const customerDisplay = account.customer ? `${account.customer.customerNo} - ${account.customer.name}` : 'N/A';
        this.accountForm.patchValue({
          customerDisplay: customerDisplay,
          accountNumber: account.accountNumber || 'N/A',
          accountType: 'CREDIT',
          currency: account.currency || 'USD',
          balance: account.balance !== null ? account.balance : '',
          creditLimit: account.creditLimit !== null ? account.creditLimit : '',
          billingCycle: account.billingCycle || '',
          interestRate: account.interestRate !== null ? account.interestRate : '',
          openDate: account.openDate || 'N/A',
          status: account.status || 'ACTIVE'
        });

        if (this.isResubmit && this.pendingRequestId) {
          this.loadPendingRequestData();
        }
      },
      error: (err) => console.error('Error loading account:', err)
    });
  }

  loadPendingRequestData(): void {
    this.http.get<any>(`${this.pendingUrl}`, { withCredentials: true }).subscribe({
      next: (requests: any[]) => {
        const req = requests.find((r) => r.id === this.pendingRequestId);
        if (req && req.payload) {
          try {
            const payloadData = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
            this.accountForm.patchValue({
              currency: payloadData.currency !== undefined ? payloadData.currency : this.accountForm.get('currency')?.value,
              balance: payloadData.balance !== undefined ? payloadData.balance : this.accountForm.get('balance')?.value,
              creditLimit: payloadData.creditLimit !== undefined ? payloadData.creditLimit : this.accountForm.get('creditLimit')?.value,
              billingCycle: payloadData.billingCycle !== undefined ? payloadData.billingCycle : this.accountForm.get('billingCycle')?.value,
              interestRate: payloadData.interestRate !== undefined ? payloadData.interestRate : this.accountForm.get('interestRate')?.value,
              status: payloadData.status !== undefined ? payloadData.status : this.accountForm.get('status')?.value,
            });
          } catch (e) {
            console.error('Error parsing pending request payload', e);
          }
        }
      },
      error: (err) => console.error('Error loading pending request:', err)
    });
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }
    this.showConfirmModal = true;
  }

  confirmProceed(): void {
    this.showConfirmModal = false;

    const formValue = this.accountForm.getRawValue();

    const payload: any = {
      id: this.accountId,
      accountType: formValue.accountType,
      currency: formValue.currency,
      balance: formValue.balance,
      creditLimit: formValue.creditLimit,
      billingCycle: formValue.billingCycle,
      interestRate: formValue.interestRate,
      status: formValue.status
    };

    if (this.isResubmit && this.pendingRequestId) {
      payload.originalRequestId = this.pendingRequestId;
    }

    const pendingRequest: any = {
      entityType: 'ACCOUNT',
      operation: 'UPDATE',
      payload: JSON.stringify(payload)
    };
    
    this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
      next: () => {
        if (this.isResubmit) {
          this.modalMessage = 'Account update request resubmitted for manager approval.';
        } else {
          this.modalMessage = 'Account update request submitted for approval.';
        }
        this.showMessageModal = true;
      },
      error: (err) => console.error('Error submitting update request:', err)
    });
  }

  cancelConfirm(): void {
    this.showConfirmModal = false;
  }

  closeMessage(): void {
    this.showMessageModal = false;
    this.router.navigate(['/accounts']);
  }

  cancel(): void {
    this.router.navigate(['/accounts']);
  }
}
