export function isLoggedIn() {
  return !!localStorage.getItem('username');
}

export function getToken() {
  return null;
}

export async function logout() {
  localStorage.removeItem('username');
  localStorage.removeItem('isAdmin');
  try {
    await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include' 
    });
  } catch (err) {
    console.error('Logout error:', err);
  }
}
