import { api } from "./lib/api";

// Token handling: prefer sessionStorage, never persist in localStorage
let memoryToken = null;
function getToken() {
  const url = new URL(window.location.href);
  const tokenFromUrl = url.searchParams.get("token");
  if (tokenFromUrl) {
    // Store in sessionStorage and memory only
    sessionStorage.setItem("access_token", tokenFromUrl);
    memoryToken = tokenFromUrl;
    // Clean token from URL
    url.searchParams.delete("token");
    window.history.replaceState({}, document.title, url.pathname + url.search);
    return tokenFromUrl;
  }
  // Prefer memory, then sessionStorage
  if (memoryToken) return memoryToken;
  const sessionToken = sessionStorage.getItem("access_token");
  if (sessionToken) {
    memoryToken = sessionToken;
    return sessionToken;
  }
  return null;
}

export async function apiGet(path) {
  const token = getToken();
  if (!token) {
    throw new Error("Missing access token for protected parking API");
  }
  return api(path, { method: "GET", token });
}

export async function apiPost(path, body) {
  const token = getToken();
  if (!token) {
    throw new Error("Missing access token for protected parking API");
  }
  return api(path, { method: "POST", token, body });
}

export { getToken };
