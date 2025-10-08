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
  users: any[] = [];
  username = '';
  password = '';
  role = 'STAFF'; // Default value
  currentUser = '';
  currentRole = '';

  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadUsers();

    //  Display logged in user info
    this.currentUser = localStorage.getItem('username') || '';
    this.currentRole = localStorage.getItem('role') || '';
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
    if (!this.username || !this.password || !this.role) {
      alert('⚠️ Please fill in all fields before creating a user.');
      return;
    }

    const body = {
      username: this.username.trim(),
      password: this.password.trim(),
      role: { name: this.role.toUpperCase() } // Match backend format
    };

    this.http.post(this.apiUrl, body, { responseType: 'text' }).subscribe({
      next: (res) => {
        alert(res || '✅ User created successfully!');
        this.username = '';
        this.password = '';
        this.role = 'STAFF';
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error creating user:', err);
        alert('❌ Failed to create user.\nDetails: ' + (err.error || err.message));
      }
    });
  }

  //  Update role
  updateRole(user: any): void {
    if (!user.newRole) {
      alert('⚠️ Please select a new role before updating.');
      return;
    }

    const body = { name: user.newRole.toUpperCase() };

    this.http.put(`${this.apiUrl}/${user.id}/role`, body, { responseType: 'text' }).subscribe({
      next: (res) => {
        alert(res || '✅ Role updated successfully!');
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error updating role:', err);
        alert('❌ Failed to update role.\nDetails: ' + (err.error || err.message));
      }
    });
  }

  //  Add logout function to match HTML
  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
