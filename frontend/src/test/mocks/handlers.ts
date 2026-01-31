/**
 * Mock Service Worker (MSW) handlers for API mocking
 *
 * This file will contain mock API handlers for testing.
 * Install MSW when needed: npm install --save-dev msw
 */

// Example handler structure (uncomment when MSW is installed):
// import { http, HttpResponse } from 'msw';
//
// export const handlers = [
//   http.get('/api/products', () => {
//     return HttpResponse.json([
//       { id: 1, name: 'Product 1', price: 10.99 },
//       { id: 2, name: 'Product 2', price: 20.99 },
//     ]);
//   }),
//
//   http.post('/api/auth/login', async ({ request }) => {
//     const { username, password } = await request.json();
//     if (username === 'test' && password === 'password') {
//       return HttpResponse.json({ token: 'mock-jwt-token' });
//     }
//     return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
//   }),
// ];

// Empty handlers array - will be populated when MSW is configured
export const handlers: unknown[] = [];
