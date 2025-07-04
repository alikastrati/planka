export function getToken() {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === 'accessToken') {
      return value;
    }
  }
  return null;
}
