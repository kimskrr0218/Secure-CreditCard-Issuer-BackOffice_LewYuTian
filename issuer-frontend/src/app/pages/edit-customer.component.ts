import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';
import { NATIONALITIES } from '../constants/nationalities';

@Component({
  selector: 'app-edit-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopNavbarComponent],
  templateUrl: './edit-customer.component.html',
  styleUrls: ['./edit-customer.component.css']
})
export class EditCustomerComponent implements OnInit {
  customerForm!: FormGroup;
  showMessageModal = false;
  modalMessage = '';
  showConfirmModal = false;
  customerId: string | null = null;
  loading: boolean = true;
  readonly nationalities = NATIONALITIES;

  private apiUrl = '/api/customers';
  private pendingUrl = '/api/pending';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.customerForm = this.fb.group({
      // Customer Info
      customerNo: [''],
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z]+$/)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z]+$/)]],
      gender: ['', Validators.required],
      nationality: ['', Validators.required],
      companyName: [''],
      dob: ['', [Validators.required, this.ageValidator]],
      idNumber: [''],

      // Contact Info
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],

      // Address Info
      homeAddress: ['', [Validators.required, Validators.minLength(10)]],

      // Financial Info
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

    this.customerId = this.route.snapshot.paramMap.get('id');
    if (this.customerId) {
      this.http.get(`${this.apiUrl}/${this.customerId}`, { withCredentials: true }).subscribe({
        next: (data: any) => {
          this.customerForm.patchValue(data);
          // idNumber & phoneNumber are @JsonIgnore — use masked values for display
          if (data.maskedIdNumber) {
            this.customerForm.patchValue({ idNumber: data.maskedIdNumber });
          }
          if (data.maskedPhoneNumber) {
            this.customerForm.patchValue({ phoneNumber: data.maskedPhoneNumber });
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching customer for edit:', err);
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
    }
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
    if (this.customerForm.invalid || !this.customerId) {
      this.customerForm.markAllAsTouched();
      return;
    }
    this.showConfirmModal = true;
  }

  confirmProceed(): void {
    this.showConfirmModal = false;

    const payload = { ...this.customerForm.value };
    payload.id = this.customerId;
    payload.name = `${payload.firstName} ${payload.lastName}`.trim();

    if (payload.idNumber && payload.idNumber.includes('*')) {
      delete payload.idNumber;
    }
    if (payload.phoneNumber && payload.phoneNumber.includes('*')) {
      delete payload.phoneNumber;
    }

    const role = localStorage.getItem('role');

    if (role === 'STAFF') {
      const pendingRequest = {
        entityType: 'CUSTOMER',
        operation: 'UPDATE',
        payload: JSON.stringify(payload)
      };

      this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
        next: () => {
          this.modalMessage = '✅ Update request submitted for approval.';
          this.showMessageModal = true;
        },
        error: (err) => console.error('Error submitting update request:', err)
      });
      return;
    }

    this.http.put(`${this.apiUrl}/${this.customerId}`, payload, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = '✅ Customer updated successfully.';
        this.showMessageModal = true;
      },
      error: (err) => {
        if (err.error?.errors) {
          this.modalMessage = '❌ Validation errors:\n' + err.error.errors.join('\n');
          this.showMessageModal = true;
        } else {
          console.error('Error updating customer:', err);
        }
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
    this.router.navigate(['/customers']);
  }
}
