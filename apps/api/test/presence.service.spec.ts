import { PresenceService } from "../src/presence/presence.service";
import { RedisService } from "../src/redis/redis.service";

interface FakeRedisClient {
  eval?: jest.Mock;
  incr?: jest.Mock;
  expire?: jest.Mock;
  get?: jest.Mock;
}

describe("PresenceService connection counting", () => {
  function makeService(client: FakeRedisClient | null): PresenceService {
    const redis = { getClient: () => client };
    return new PresenceService(redis as unknown as RedisService);
  }

  it("decrementConnections returns the Lua count on success", async () => {
    const client: FakeRedisClient = { eval: jest.fn().mockResolvedValue(2) };
    const service = makeService(client);
    await expect(service.decrementConnections("u1")).resolves.toBe(2);
    expect(client.eval).toHaveBeenCalledWith(expect.stringContaining("DECR"), 1, "presence:connections:u1");
  });

  it("decrementConnections returns 0 when the script deletes the key (real final disconnect)", async () => {
    const client: FakeRedisClient = { eval: jest.fn().mockResolvedValue(0) };
    const service = makeService(client);
    await expect(service.decrementConnections("u1")).resolves.toBe(0);
  });

  it("decrementConnections returns null (not 0) when Redis eval fails — count must not look trustworthy", async () => {
    const client: FakeRedisClient = {
      eval: jest.fn().mockRejectedValue(Object.assign(new Error("Connection is closed."), { name: "ConnectionClosedError" })),
    };
    const service = makeService(client);
    await expect(service.decrementConnections("u1")).resolves.toBeNull();
  });

  it("decrementConnections returns 0 when no Redis client exists (no state to decrement)", async () => {
    const service = makeService(null);
    await expect(service.decrementConnections("u1")).resolves.toBe(0);
  });

  it("incrementConnections returns the count before increment", async () => {
    const client: FakeRedisClient = {
      incr: jest.fn().mockResolvedValue(2),
      expire: jest.fn().mockResolvedValue(1),
    };
    const service = makeService(client);
    await expect(service.incrementConnections("u1")).resolves.toBe(1);
    expect(client.expire).toHaveBeenCalledWith("presence:connections:u1", 600);
  });

  it("getConnectionCount returns parsed count", async () => {
    const client: FakeRedisClient = { get: jest.fn().mockResolvedValue("3") };
    const service = makeService(client);
    await expect(service.getConnectionCount("u1")).resolves.toBe(3);
  });
});
