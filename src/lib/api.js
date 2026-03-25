import { API_URL } from "../config";

export async function api(path, { method = "GET", token, body } = {}) {
  // Log request info (browser-safe)
  const logMsg = `[API] ${method} ${API_URL}${path} token=${!!token} body=${body ? JSON.stringify(body) : "-"}`;
  console.log(logMsg);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errMsg = `[API] ERROR HTTP ${res.status} for ${method} ${path}`;
      console.error(errMsg);
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const respMsg = `[API] RESPONSE ${method} ${path}: ${JSON.stringify(json).slice(0, 300)}`;
    console.log(respMsg);
    return json;
  } catch (err) {
    const errMsg = `[API] FETCH ERROR for ${method} ${path}: ${err && err.message}`;
    console.error(errMsg);
    throw err;
  }
}
