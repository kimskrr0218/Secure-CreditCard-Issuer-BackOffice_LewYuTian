import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const role = localStorage.getItem('role');
  if (!role) {
    router.navigate(['/login']);
    return false;
  }

  const requiredRole = route.data['role'] as string;
  if (requiredRole && role !== requiredRole) {
    alert('Access denied!');
    router.navigate(['/login']);
    return false;
  }

  return true;
};
