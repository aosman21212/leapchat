import { useRouter } from 'next/navigation';

export const handleAuthError = (error: any) => {
  // Check if the error is related to invalid/expired token
  if (error.message?.includes('Invalid token') || 
      error.message?.includes('Token expired') ||
      error.message?.includes('No authentication token found')) {
    // Clear all auth-related data
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Redirect to login page
    window.location.href = '/';
    return true;
  }
  return false;
};

export const validateToken = async (token: string | null): Promise<boolean> => {
  if (!token) return false;
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/validate-token', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}; 