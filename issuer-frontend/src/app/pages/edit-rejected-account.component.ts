import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-edit-rejected-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopNavbarComponent],
  templateUrl: './edit-rejected-account.component.html',
  styleUrls: ['./edit-rejected-account.component.css']
})
export class EditRejectedAccountComponent implements OnInit {
  accountForm!: FormGroup;
  showMessageModal = false;
  modalMessage = '';
  modalSuccess = false;
  showConfirmModal = false;
  pendingRequestId: string | null = null;
  loading = true;

  customers: any[] = [];

  // Read-only display
  customerDisplay = '';
  accountNumberDisplay = '';
  rejectionReason = '';

  private pendingUrl = '/api/pending';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.accountForm = this.fb.group({
      customerId: ['', Validators.required],
      accountNumber: [{ value: '', disabled: true }],
      accountType: [{ value: 'CREDIT', disabled: true }],
      currency: ['USD', Validators.required],
      balance: ['', Validators.required],
      creditLimit: ['', Validators.required],
      billingCycle: ['1st of Month', Validators.required],
      interestRate: [18.0, Validators.required],
      openDate: [{ value: '', disabled: true }]
    });

    this.pendingRequestId = this.route.snapshot.paramMap.get('id');

    // Load customers, THEN pre-fill the form
    this.http.get<any[]>('/api/customers', { withCredentials: true }).subscribe({
      next: (data) => {
        this.customers = data;
        this.prefillForm();
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.prefillForm();
      }
    });
  }

  private prefillForm(): void {
    const stateData = history.state?.requestData;
    if (stateData && (stateData.customerId || stateData.currency)) {
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
                customerId: payload.customer?.id || payload.customerId || '',
                accountNumber: payload.accountNumber || '',
                currency: payload.currency || 'USD',
                balance: payload.balance ?? '',
                creditLimit: payload.creditLimit ?? '',
                billingCycle: payload.billingCycle || '1st of Month',
                interestRate: payload.interestRate ?? 18.0,
                openDate: payload.openDate || '',
                customerNo: payload.customerNo || req.customerNo || '',
                customerName: payload.customerName || '',
                rejectionReason: req.rejectionReason || req.reason || ''
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
    const customerId = data.customerId ? Number(data.customerId) : '';

    this.accountNumberDisplay = data.accountNumber || 'Will be generated';
    this.rejectionReason = data.rejectionReason || '';

    // Build customer display
    if (customerId) {
      const customer = this.customers.find(c => c.id === customerId);
      if (customer) {
        this.customerDisplay = `${customer.customerNo} - ${customer.name}`;
      } else {
        const custNo = data.customerNo || '';
        const custName = data.customerName || '';
        this.customerDisplay = custNo && custName ? `${custNo} - ${custName}` : (custNo || custName || `Customer #${customerId}`);
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const uniqueAccountNo = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    this.accountForm.patchValue({
      customerId: customerId,
      accountNumber: uniqueAccountNo,
      accountType: 'CREDIT',
      currency: data.currency || 'USD',
      balance: data.balance ?? '',
      creditLimit: data.creditLimit ?? '',
      billingCycle: data.billingCycle || '1st of Month',
      interestRate: data.interestRate ?? 18.0,
      openDate: data.openDate || today
    });

    this.loading = false;
  }

  onResubmit(): void {
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
      customer: { id: formValue.customerId },
      accountNumber: formValue.accountNumber,
      accountType: formValue.accountType,
      currency: formValue.currency,
      balance: formValue.balance,
      creditLimit: formValue.creditLimit,
      billingCycle: formValue.billingCycle,
      interestRate: formValue.interestRate,
      openDate: formValue.openDate,
      originalRequestId: this.pendingRequestId ? Number(this.pendingRequestId) : null
    };

    const pendingRequest = {
      entityType: 'ACCOUNT',
      operation: 'CREATE',
      payload: JSON.stringify(payload)
    };

    this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = '✅ Account request resubmitted for manager approval.';
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

  cancel(): void {
    this.router.navigate(['/accounts']);
  }

  closeMessage(): void {
    this.showMessageModal = false;
    if (this.modalSuccess) {
      this.router.navigate(['/accounts']);
    }
  }
}
