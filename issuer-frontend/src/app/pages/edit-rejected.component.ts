import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';
import { NATIONALITIES } from '../constants/nationalities';

@Component({
  selector: 'app-edit-rejected',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopNavbarComponent],
  templateUrl: './edit-rejected.component.html',
  styleUrls: ['./edit-rejected.component.css']
})
export class EditRejectedComponent implements OnInit {
  customerForm!: FormGroup;
  showMessageModal = false;
  modalMessage = '';
  showConfirmModal = false;
  pendingRequestId: string | null = null;
  loading = true;
  readonly nationalities = NATIONALITIES;

  private pendingUrl = '/api/pending';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.customerForm = this.fb.group({
      customerNo: [''],
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z]+$/)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z]+$/)]],
      name: [''],
      gender: ['', Validators.required],
      nationality: ['', Validators.required],
      companyName: [''],
      dob: ['', [Validators.required, this.ageValidator]],
      idNumber: ['', [Validators.required, Validators.minLength(9)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(10), Validators.maxLength(12)]],
      homeAddress: ['', [Validators.required, Validators.minLength(10)]],
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

    this.pendingRequestId = this.route.snapshot.paramMap.get('id');

    // Try to load from router state (passed from customers page)
    const stateData = history.state?.requestData;
    if (stateData) {
      this.customerForm.patchValue(stateData);
      this.loading = false;
    } else if (this.pendingRequestId) {
      // Fallback: fetch the pending request directly
      this.http.get<any[]>(this.pendingUrl, { withCredentials: true }).subscribe({
        next: (data) => {
          const req = data.find(r => String(r.id) === this.pendingRequestId);
          if (req) {
            try {
              const payload = JSON.parse(req.payload);
              this.customerForm.patchValue(payload);
            } catch (e) {}
          }
          this.loading = false;
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

  ageValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const dob = new Date(control.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age < 18 ? { underage: true } : null;
  }

  onResubmit(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }
    this.showConfirmModal = true;
  }

  confirmProceed(): void {
    this.showConfirmModal = false;

    const payload = {
      ...this.customerForm.value,
      originalRequestId: this.pendingRequestId ? Number(this.pendingRequestId) : null
    };
    payload.name = `${payload.firstName} ${payload.lastName}`.trim();

    const pendingRequest = {
      entityType: 'CUSTOMER',
      operation: 'CREATE',
      payload: JSON.stringify(payload)
    };

    this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = '✅ Customer update request resubmitted for manager approval.';
        this.showMessageModal = true;
      },
      error: (err) => console.error('Error resubmitting request:', err)
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
