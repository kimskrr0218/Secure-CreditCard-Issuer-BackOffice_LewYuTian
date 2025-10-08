import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {
  accounts: any[] = [];
  customers: any[] = [];
  accountForm!: FormGroup;
  isEditing = false;
  editId: number | null = null;
  loading = true;

  private apiUrl = 'http://localhost:8080/api/accounts';
  private customerApi = 'http://localhost:8080/api/customers';
  private pendingUrl = 'http://localhost:8080/api/pending'; 

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.accountForm = this.fb.group({
      customerId: ['', Validators.required],
      accountType: ['', Validators.required],
      balance: [0, Validators.required]
    });

    this.loadAccounts();
    this.loadCustomers();
  }

  //  Logout button
  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  //  Load all accounts
  loadAccounts(): void {
    this.loading = true;
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.accounts = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading accounts:', err);
        this.loading = false;
      }
    });
  }

  //  Load all customers for dropdown
  loadCustomers(): void {
    this.http.get<any[]>(this.customerApi).subscribe({
      next: (data) => (this.customers = data),
      error: (err) => console.error('Error loading customers:', err)
    });
  }

  //  Create / Update based on role
  onSubmit(): void {
    if (this.accountForm.invalid) return;

    const { customerId, accountType, balance } = this.accountForm.value;
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    const body = {
      customer: { id: customerId },
      accountType,
      balance
    };

    // --- STAFF → pending table ---
    if (role === 'STAFF') {
      const pendingRequest = {
        entityType: 'ACCOUNT',
        operation: this.isEditing ? 'UPDATE' : 'CREATE',
        requestedBy: username,
        payload: JSON.stringify({
          id: this.editId,
          customer: { id: customerId },
          accountType,
          balance
        })
      };

      this.http.post(this.pendingUrl, pendingRequest).subscribe({
        next: () => {
          alert('✅ Request submitted for manager approval.');
          this.cancelEdit();
          this.accountForm.reset();
        },
        error: (err) => console.error('Error submitting pending request:', err)
      });
      return;
    }

    // --- MANAGER / ADMIN → direct ---
    if (this.isEditing && this.editId !== null) {
      this.http.put(`${this.apiUrl}/${this.editId}`, body).subscribe({
        next: () => {
          alert('✅ Account updated successfully.');
          this.cancelEdit();
          this.loadAccounts();
        },
        error: (err) => console.error('Error updating account:', err)
      });
    } else {
      this.http.post(this.apiUrl, body).subscribe({
        next: () => {
          alert('✅ Account created successfully.');
          this.accountForm.reset();
          this.loadAccounts();
        },
        error: (err) => console.error('Error creating account:', err)
      });
    }
  }

  //  Edit account
  edit(account: any): void {
    this.isEditing = true;
    this.editId = account.id ?? null;
    this.accountForm.patchValue({
      customerId: account.customer?.id,
      accountType: account.accountType,
      balance: account.balance
    });
  }

  //  Cancel edit
  cancelEdit(): void {
    this.isEditing = false;
    this.editId = null;
    this.accountForm.reset();
  }

  //  Delete with role check
  delete(id: number): void {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    if (confirm('Are you sure you want to delete this account?')) {
      // --- STAFF → pending table ---
      if (role === 'STAFF') {
        const pendingRequest = {
          entityType: 'ACCOUNT',
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

      // --- MANAGER / ADMIN → direct ---
      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: () => {
          alert('✅ Account deleted successfully.');
          this.loadAccounts();
        },
        error: (err) => console.error('Error deleting account:', err)
      });
    }
  }
}
