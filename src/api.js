const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken() {
  const url = new URL(window.location.href);
  const tokenFromUrl = url.searchParams.get("token");
  if (tokenFromUrl) {
    localStorage.setItem("access_token", tokenFromUrl);
    return tokenFromUrl;
  }
  return localStorage.getItem("access_token");
}

export async function apiGet(path) {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}
