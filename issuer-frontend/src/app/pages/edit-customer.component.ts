import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      gender: ['', Validators.required],
      nationality: ['', Validators.required],
      companyName: [''],
      dob: ['', Validators.required],
      idNumber: [''],
      
      // Contact Info
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],

      // Address Info
      homeAddress: ['', Validators.required],

      // Financial Info
      annualIncome: ['', Validators.required],
      employerName: ['', Validators.required],
      employmentStatus: ['', Validators.required],

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

  onSubmit(): void {
    if (this.customerForm.invalid || !this.customerId) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const payload = { ...this.customerForm.value };
    payload.id = this.customerId;
    // Derive 'name' from firstName + lastName for backward compatibility
    payload.name = `${payload.firstName} ${payload.lastName}`.trim();

    // Don't send masked values back — only send if user typed a real new value
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

    // Direct CRUD for Manager/Admin
    this.http.put(`${this.apiUrl}/${this.customerId}`, payload, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = '✅ Customer updated successfully.';
        this.showMessageModal = true;
      },
      error: (err) => console.error('Error updating customer:', err)
    });
  }

  cancel(): void {
    this.router.navigate(['/customers']);
  }

  closeMessage(): void {
    this.showMessageModal = false;
    this.router.navigate(['/customers']);
  }
}
