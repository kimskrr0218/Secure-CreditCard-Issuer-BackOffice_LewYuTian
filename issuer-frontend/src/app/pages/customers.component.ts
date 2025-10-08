import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  customers: any[] = [];
  customerForm!: FormGroup;
  isEditing = false;
  editId: number | null = null;
  loading = true;

  private apiUrl = 'http://localhost:8080/api/customers';
  private pendingUrl = 'http://localhost:8080/api/pending'; //  Correct endpoint

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.customerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    this.loadCustomers();
  }

  //  Load all customers
  loadCustomers(): void {
    this.loading = true;
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.customers = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.loading = false;
      }
    });
  }

  //  Handle Create / Update based on role
  onSubmit(): void {
    if (this.customerForm.invalid) return;

    const { name, email } = this.customerForm.value;
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    // --- STAFF: send request to pending table ---
    if (role === 'STAFF') {
      const pendingRequest = {
        entityType: 'CUSTOMER',
        operation: this.isEditing ? 'UPDATE' : 'CREATE',
        requestedBy: username,
        payload: JSON.stringify({
          id: this.editId,
          name,
          email
        })
      };

      this.http.post(this.pendingUrl, pendingRequest).subscribe({
        next: () => {
          alert('✅ Request submitted for manager approval.');
          this.cancelEdit();
          this.customerForm.reset();
        },
        error: (err) => console.error('Error submitting pending request:', err)
      });
      return;
    }

    // --- MANAGER / ADMIN: direct CRUD ---
    if (this.isEditing && this.editId !== null) {
      this.http.put(`${this.apiUrl}/${this.editId}`, { name, email }).subscribe({
        next: () => {
          alert('✅ Customer updated successfully.');
          this.cancelEdit();
          this.loadCustomers();
        },
        error: (err) => console.error('Error updating customer:', err)
      });
    } else {
      this.http.post(this.apiUrl, { name, email }).subscribe({
        next: () => {
          alert('✅ Customer created successfully.');
          this.customerForm.reset();
          this.loadCustomers();
        },
        error: (err) => console.error('Error creating customer:', err)
      });
    }
  }

  //  Edit existing customer
  edit(customer: any): void {
    this.isEditing = true;
    this.editId = customer.id ?? null;
    this.customerForm.patchValue({
      name: customer.name,
      email: customer.email
    });
  }

  //  Cancel edit
  cancelEdit(): void {
    this.isEditing = false;
    this.editId = null;
    this.customerForm.reset();
  }

  //  Delete customer (based on role)
  delete(id: number): void {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    if (confirm('Are you sure you want to delete this customer?')) {
      // STAFF → send pending delete request
      if (role === 'STAFF') {
        const pendingRequest = {
          entityType: 'CUSTOMER',
          operation: 'DELETE',
          requestedBy: username,
          payload: JSON.stringify({ id })
        };

        this.http.post(this.pendingUrl, pendingRequest).subscribe({
          next: () => alert('🕓 Delete request submitted for manager approval.'),
          error: (err) => console.error('Error submitting delete request:', err)
        });
        return;
      }

      // MANAGER / ADMIN → direct delete
      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: () => {
          alert('✅ Customer deleted successfully.');
          this.loadCustomers();
        },
        error: (err) => console.error('Error deleting customer:', err)
      });
    }
  }

  //  Logout
  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
