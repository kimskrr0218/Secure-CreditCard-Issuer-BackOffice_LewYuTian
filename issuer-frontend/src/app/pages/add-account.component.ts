import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-add-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopNavbarComponent],
  templateUrl: './add-account.component.html',
  styleUrls: ['./add-account.component.css'] // using the exact same classes copied earlier
})
export class AddAccountComponent implements OnInit {
  accountForm!: FormGroup;
  showMessageModal = false;
  modalMessage = '';
  showConfirmModal = false;
  customers: any[] = [];

  private pendingUrl = '/api/pending';
  private customerApi = '/api/customers';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Generate unique 10-digit number
    const uniqueAccountNo = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const today = new Date().toISOString().split('T')[0];

    this.accountForm = this.fb.group({
      customerId: ['', Validators.required],
      accountNumber: [{value: uniqueAccountNo, disabled: true}],
      accountType: ['CREDIT', Validators.required],
      currency: ['USD', Validators.required],
      balance: ['', Validators.required],
      creditLimit: ['', Validators.required],
      billingCycle: ['1st of Month', Validators.required],
      interestRate: [18.0, Validators.required],
      openDate: [{value: today, disabled: true}]
    });

    this.loadCustomers();
  }

  loadCustomers(): void {
    this.http.get<any[]>(this.customerApi, { withCredentials: true }).subscribe({
      next: (data) => (this.customers = data),
      error: (err) => console.error('Error loading customers:', err)
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
    const selectedCustomer = this.customers.find(c => c.id == formValue.customerId);
    const payload = {
      customer: {
        id: formValue.customerId,
        customerNo: selectedCustomer?.customerNo || '',
        name: selectedCustomer?.name || ''
      },
      accountNumber: formValue.accountNumber,
      accountType: formValue.accountType,
      currency: formValue.currency,
      balance: formValue.balance,
      creditLimit: formValue.creditLimit,
      billingCycle: formValue.billingCycle,
      interestRate: formValue.interestRate,
      openDate: formValue.openDate
    };

    const pendingRequest = {
      entityType: 'ACCOUNT',
      operation: 'CREATE',
      payload: JSON.stringify(payload)
    };

    this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = 'Account creation request submitted for approval.';
        this.showMessageModal = true;
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.message || 'Failed to submit request.';
        this.modalMessage = '❌ ' + msg;
        this.showMessageModal = true;
      }
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
