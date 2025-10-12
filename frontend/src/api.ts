export const API_URL = "http://localhost:8000";

export const Api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`Error fetching ${endpoint}: ${response.statusText}`);
    }
    return response.json();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: async <T>(endpoint: string, body?: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`Error posting to ${endpoint}: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postRaw: async (endpoint: string, body?: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response;
  }
};
