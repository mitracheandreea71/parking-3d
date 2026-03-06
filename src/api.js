import { api } from "./lib/api";

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
  return api(path, { method: "GET", token });
}

export async function apiPost(path, body) {
  const token = getToken();
  return api(path, { method: "POST", token, body });
}

export { getToken };
