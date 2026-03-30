import { Routes } from '@angular/router';

import { CustomersComponent } from './pages/customers.component';
import { AddCustomerComponent } from './pages/add-customer.component';
import { ViewCustomerComponent } from './pages/view-customer.component';
import { EditCustomerComponent } from './pages/edit-customer.component';
import { EditRejectedComponent } from './pages/edit-rejected.component';
import { AddAccountComponent } from './pages/add-account.component';
import { AccountsComponent } from './pages/accounts.component';
import { EditAccountComponent } from './pages/edit-account.component';
import { ViewAccountComponent } from './pages/view-account.component';
import { CardsComponent } from './pages/cards.component';
import { AddCardComponent } from './pages/add-card.component';
import { ViewCardComponent } from './pages/view-card.component';
import { EditCardComponent } from './pages/edit-card.component';
import { EditRejectedCardComponent } from './pages/edit-rejected-card.component';
import { RolesComponent } from './pages/roles.component';
import { DashboardComponent } from './pages/dashboard.component';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { PendingComponent } from './pages/pending.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Dashboard (all authenticated users)
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard] 
  },

  // STAFF
  {
    path: 'customers/edit/:id',
    component: EditCustomerComponent,
    canActivate: [authGuard],
    data: { role: 'STAFF' }
  },
  {
    path: 'customers/edit-rejected/:id',
    component: EditRejectedComponent,
    canActivate: [authGuard],
    data: { roles: ['STAFF','MANAGER','ADMIN'] }
  },
  {
    path: 'customers/view/:id',
    component: ViewCustomerComponent,
    canActivate: [authGuard],
    data: { roles: ['STAFF','MANAGER','ADMIN'] }
  },
  {
    path: 'customers/add',
    component: AddCustomerComponent,
    canActivate: [authGuard],
    data: { roles: ['STAFF','MANAGER','ADMIN'] }
  },
  { 
    path: 'customers', 
    component: CustomersComponent, 
    canActivate: [authGuard], 
    data: { roles: ['STAFF','MANAGER','ADMIN'] } 
  },
  { 
    path: 'accounts', 
    component: AccountsComponent, 
    canActivate: [authGuard], 
    data: { roles: ['STAFF','MANAGER','ADMIN'] } 
  },
  { 
    path: 'cards', 
    component: CardsComponent, 
    canActivate: [authGuard], 
    data: { roles: ['STAFF','MANAGER','ADMIN'] } 
  },
  {
    path: 'cards/edit/:id',
    component: EditCardComponent,
    canActivate: [authGuard],
    data: { roles: ['STAFF','ADMIN'] }
  },
  {
    path: 'cards/edit-rejected/:id',
    component: EditRejectedCardComponent,
    canActivate: [authGuard],
    data: { roles: ['STAFF','ADMIN'] }
  },
  {
    path: 'cards/add',
    component: AddCardComponent,
    canActivate: [authGuard],
    data: { role: 'STAFF' }
  },
  {
    path: 'cards/view/:id',
    component: ViewCardComponent,
    canActivate: [authGuard],
    data: { roles: ['STAFF','MANAGER','ADMIN'] }
  },
  {
    path: 'accounts/add',
    component: AddAccountComponent,
    canActivate: [authGuard],
    data: { role: 'STAFF' }
  },
  {
    path: 'accounts/:id/edit',
    component: EditAccountComponent,
    canActivate: [authGuard],
    data: { roles: ['STAFF','MANAGER','ADMIN'] } // Or whatever role needed
  },
  {
    path: 'accounts/view/:id',
    component: ViewAccountComponent,
    canActivate: [authGuard],
    data: { roles: ['STAFF','MANAGER','ADMIN'] }
  },

  {
    path: 'pending',
    component: PendingComponent,
    canActivate: [authGuard],
    data: { roles: ['STAFF','MANAGER','ADMIN'] }
  },

  // ADMIN ONLY
  { 
    path: 'roles', 
    component: RolesComponent, 
    canActivate: [authGuard], 
    data: { roles: ['ADMIN'] } 
  },

  { path: '**', redirectTo: 'login' }
];