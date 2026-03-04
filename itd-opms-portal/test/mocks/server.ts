import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW mock server for intercepting HTTP requests in tests.
 *
 * Usage in setup.ts:
 *   beforeAll(() => server.listen())
 *   afterEach(() => server.resetHandlers())
 *   afterAll(() => server.close())
 *
 * Override handlers in individual tests:
 *   server.use(http.get('/api/...', () => { ... }))
 */
export const server = setupServer(...handlers);
