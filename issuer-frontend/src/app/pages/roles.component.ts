import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.css']
})
export class RolesComponent implements OnInit {
  showMessageModal = false;
  modalMessage = "";

  closeMessage() {
    this.showMessageModal = false;
  }

  users: any[] = [];
  pendingRequests: any[] = [];
  username = '';
  email = '';
  password = '';
  role = 'STAFF'; // Default value
  currentUser = '';
  currentRole = '';

  private apiUrl = 'http://localhost:8080/api/users';
  private pendingApiUrl = 'http://localhost:8080/api/pending';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadPendingRequests();

    //  Display logged in user info
    this.currentUser = localStorage.getItem('username') || '';
    this.currentRole = localStorage.getItem('role') || '';
  }

  // Load pending user registration requests
  loadPendingRequests(): void {
    this.http.get<any[]>(`${this.pendingApiUrl}/user`, { withCredentials: true }).subscribe({
      next: (data) => (this.pendingRequests = data),
      error: (err) => console.error('⚠️ Error loading pending requests:', err)
    });
  }

  getPayload(request: any): any {
    try {
      return JSON.parse(request.payload);
    } catch (e) {
      return {};
    }
  }

  approveRequest(id: number): void {
    this.http.put(`${this.pendingApiUrl}/${id}/approve`, {}, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = "Registration request approved successfully.";
        this.showMessageModal = true;
        this.loadPendingRequests();
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error approving request:', err);
        this.modalMessage = "Failed to approve request.";
        this.showMessageModal = true;
      }
    });
  }

  rejectRequest(id: number): void {
    this.http.put(`${this.pendingApiUrl}/${id}/reject`, { reason: 'Rejected by Admin' }, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = "Registration request rejected.";
        this.showMessageModal = true;
        this.loadPendingRequests();
      },
      error: (err) => {
        console.error('Error rejecting request:', err);
        this.modalMessage = "Failed to reject request.";
        this.showMessageModal = true;
      }
    });
  }

  //  Load all users
  loadUsers(): void {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => (this.users = data),
      error: (err) => console.error('⚠️ Error loading users:', err)
    });
  }

  //  Create user
  createUser(): void {
    if (!this.username || !this.email || !this.password || !this.role) {
      this.modalMessage = '⚠️ Please fill in all fields before creating a user.';
          this.showMessageModal = true;
      return;
    }

    const body = {
      username: this.username.trim(),
      email: this.email.trim(),
      password: this.password.trim(),
      role: { name: this.role.toUpperCase() } // Match backend format
    };

    this.http.post(this.apiUrl, body, { responseType: 'text' }).subscribe({
      next: (res) => {
        this.modalMessage = res || '✅ User created successfully!';
          this.showMessageModal = true;
        this.username = '';
        this.email = '';
        this.password = '';
        this.role = 'STAFF';
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error creating user:', err);
        this.modalMessage = '❌ Failed to create user.\nDetails: ' + (err.error || err.message);
          this.showMessageModal = true;
      }
    });
  }

  //  Update role
  updateRole(user: any): void {
    if (!user.newRole) {
      this.modalMessage = '⚠️ Please select a new role before updating.';
          this.showMessageModal = true;
      return;
    }

    const body = { name: user.newRole.toUpperCase() };

    this.http.put(`${this.apiUrl}/${user.id}/role`, body, { responseType: 'text' }).subscribe({
      next: (res) => {
        this.modalMessage = res || '✅ Role updated successfully!';
          this.showMessageModal = true;
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error updating role:', err);
        this.modalMessage = '❌ Failed to update role.\nDetails: ' + (err.error || err.message);
          this.showMessageModal = true;
      }
    });
  }

  //  Add logout function to match HTML
  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
