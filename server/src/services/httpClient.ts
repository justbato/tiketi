const axios = {
  async request(method: string, url: string, body?: unknown, cfg: any = {}) {
    const res = await fetch(url, {
      method,
      headers: cfg.headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text }; }
    if (!res.ok) {
      const err: any = new Error(data?.message || `HTTP ${res.status}`);
      err.response = { status: res.status, data };
      throw err;
    }
    return { data };
  },
  get(url: string, cfg?: any) { return this.request('GET', url, undefined, cfg); },
  post(url: string, body?: unknown, cfg?: any) { return this.request('POST', url, body, cfg); },
  put(url: string, body?: unknown, cfg?: any) { return this.request('PUT', url, body, cfg); },
};
export default axios;
