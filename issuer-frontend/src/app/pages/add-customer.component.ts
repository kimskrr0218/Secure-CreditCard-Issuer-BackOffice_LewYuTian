import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';
import { NATIONALITIES } from '../constants/nationalities';

@Component({
  selector: 'app-add-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopNavbarComponent],
  templateUrl: './add-customer.component.html',
  styleUrls: ['./add-customer.component.css']
})
export class AddCustomerComponent implements OnInit {
  customerForm!: FormGroup;
  showMessageModal = false;
  modalMessage = '';
  modalSuccess = false;
  showConfirmModal = false;
  readonly nationalities = NATIONALITIES;

  private apiUrl = '/api/customers';
  private pendingUrl = '/api/pending';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.customerForm = this.fb.group({
      // Personal Information
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z]+$/)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z]+$/)]],
      gender: ['', Validators.required],
      nationality: ['', Validators.required],
      companyName: [''],
      dob: ['', [Validators.required, this.ageValidator]],
      idNumber: ['', [Validators.required, Validators.minLength(9)]],

      // Contact Information
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(10), Validators.maxLength(12)]],

      // Address Information
      homeAddress: ['', [Validators.required, Validators.minLength(10)]],

      // Financial Information
      annualIncome: ['', [Validators.required, Validators.min(0.01)]],
      employerName: [''],
      employmentStatus: ['', Validators.required],
    });

    // Conditional validation: employerName required only when employed
    this.customerForm.get('employmentStatus')?.valueChanges.subscribe(status => {
      const employerCtrl = this.customerForm.get('employerName')!;
      if (status && status !== 'Unemployed') {
        employerCtrl.setValidators([Validators.required]);
      } else {
        employerCtrl.clearValidators();
      }
      employerCtrl.updateValueAndValidity();
    });
  }

  ageValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const dob = new Date(control.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age < 18 ? { underage: true } : null;
  }

  onSubmit(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }
    this.showConfirmModal = true;
  }

  confirmProceed(): void {
    this.showConfirmModal = false;

    const payload = this.customerForm.value;
    // Derive 'name' from firstName + lastName for backward compatibility
    payload.name = `${payload.firstName} ${payload.lastName}`.trim();
    const pendingRequest = {
      entityType: 'CUSTOMER',
      operation: 'CREATE',
      payload: JSON.stringify(payload)
    };

    this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = '✅ Request submitted for approval.';
        this.modalSuccess = true;
        this.showMessageModal = true;
      },
      error: (err) => {
        this.modalMessage = '❌ ' + (err.error?.error || err.error?.message || 'Failed to submit request.');
        this.modalSuccess = false;
        this.showMessageModal = true;
      }
    });
  }

  cancelConfirm(): void {
    this.showConfirmModal = false;
  }

  cancel(): void {
    this.router.navigate(['/customers']);
  }

  closeMessage(): void {
    this.showMessageModal = false;
    if (this.modalSuccess) {
      this.router.navigate(['/customers']);
    }
  }
}
