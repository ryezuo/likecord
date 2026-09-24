// Mocks for modules — runs before each test suite
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    close: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  })),
}));

jest.mock("uuid", () => ({ v4: () => "test-uuid-123" }));

// Document.cookie with getter/setter
let cookieStore = "";
Object.defineProperty(document, "cookie", {
  get: () => cookieStore,
  set: (val) => { cookieStore = val; },
  configurable: true,
});

// jsdom does not implement HTMLMediaElement.prototype.pause/play — mock them
HTMLMediaElement.prototype.pause = jest.fn();
HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
