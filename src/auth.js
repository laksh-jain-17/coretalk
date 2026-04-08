export function isLoggedIn() {
  return !!localStorage.getItem('username');
}

export async function verifyAuth() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
      method: 'GET',
      credentials: 'include' 
    });
    
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('username', data.name || data.email);
      if (data.isAdmin) {
        localStorage.setItem('isAdmin', 'true');
      } else {
        localStorage.removeItem('isAdmin');
      }
      return true;
    } else {
      localStorage.removeItem('username');
      localStorage.removeItem('isAdmin');
      return false;
    }
  } catch (err) {
    console.error('Auth verify failed:', err);
    return false;
  }
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
