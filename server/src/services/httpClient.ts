const axios = {
  async request(method: string, url: string, body?: unknown, cfg: any = {}) {
    const timeout = cfg?.timeout || 15000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        method,
        headers: cfg.headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
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
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const abortErr: any = new Error(`Request timed out after ${timeout}ms`);
        abortErr.response = { status: 408, data: { message: `Request timed out after ${timeout}ms` } };
        throw abortErr;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },
  get(url: string, cfg?: any) { return this.request('GET', url, undefined, cfg); },
  post(url: string, body?: unknown, cfg?: any) { return this.request('POST', url, body, cfg); },
  put(url: string, body?: unknown, cfg?: any) { return this.request('PUT', url, body, cfg); },
};
export default axios;

