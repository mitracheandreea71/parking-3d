import { API_URL } from "../config";

export async function api(path, { method = "GET", token, body } = {}) {
  // Log request info (vizibil și în terminal dacă rulezi cu Node/Expo)
  const logMsg = `[API] ${method} ${API_URL}${path} token=${!!token} body=${body ? JSON.stringify(body) : "-"}`;
  if (typeof window === "undefined" && typeof process !== "undefined") {
    process.stdout.write(logMsg + "\n");
  } else {
    console.log(logMsg);
  }
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
      if (typeof window === "undefined" && typeof process !== "undefined") {
        process.stderr.write(errMsg + "\n");
      } else {
        console.error(errMsg);
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const respMsg = `[API] RESPONSE ${method} ${path}: ${JSON.stringify(json).slice(0, 300)}`;
    if (typeof window === "undefined" && typeof process !== "undefined") {
      process.stdout.write(respMsg + "\n");
    } else {
      console.log(respMsg);
    }
    return json;
  } catch (err) {
    const errMsg = `[API] FETCH ERROR for ${method} ${path}: ${err && err.message}`;
    if (typeof window === "undefined" && typeof process !== "undefined") {
      process.stderr.write(errMsg + "\n");
    } else {
      console.error(errMsg);
    }
    throw err;
  }
}
