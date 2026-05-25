/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FetcherOptions extends RequestInit {
  body?: any;
}

export class Fetcher {
  private static getUserId(): string | null {
    return localStorage.getItem('nexus_user_id');
  }

  static async request(endpoint: string, options: FetcherOptions = {}) {
    const token = this.getUserId();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Academic request failed.');
      }
      
      return data;
    } catch (err: any) {
      console.error(`Fetcher error at ${endpoint}:`, err);
      throw err;
    }
  }

  static get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  static post(endpoint: string, body: any) {
    return this.request(endpoint, { method: 'POST', body });
  }

  static put(endpoint: string, body: any) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  static delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}
