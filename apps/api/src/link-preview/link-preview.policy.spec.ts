import { globalAddress, matchesPinnedPeer, validateDnsAnswers } from "./link-preview.policy";

describe("LP-SSRF-IPV4 / LP-SSRF-IPV6 / LP-DNS", () => {
  it.each([
    "0.0.0.0", "0.255.255.255", "10.0.0.1", "10.255.255.255", "100.64.0.0", "100.127.255.255", "127.1.2.3",
    "169.254.169.254", "172.16.0.0", "172.31.255.255", "192.168.0.1", "192.0.0.9", "192.0.2.1",
    "192.31.196.1", "192.52.193.1", "192.88.99.1", "192.175.48.1", "198.18.0.0", "198.19.255.255",
    "198.51.100.1", "203.0.113.1", "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
  ])("denies special IPv4 %s", (ip) => expect(globalAddress(ip, 4)).toBeNull());
  it.each([
    "::", "::1", "::ffff:8.8.8.8", "::ffff:127.0.0.1", "::ffff:0:808:808", "64:ff9b::808:808", "64:ff9b:1::1",
    "100::1", "100:0:0:1::1", "2001::1", "2001:1::1", "2001:2::1", "2001:3::1", "2001:4:112::1",
    "2001:10::1", "2001:20::1", "2001:30::1", "2001:1ff::1", "2001:db8::1", "2002::1",
    "2620:4f:8000::1", "3fff::1", "3fff:fff::1", "5f00::1", "fc00::1", "fdff::1", "fe80::1", "fec0::1", "ff02::1",
    "4000::1", "fe80::1%eth0",
  ])("denies special IPv6 %s", (ip) => expect(globalAddress(ip, 6)).toBeNull());
  it.each(["8.8.8.8", "1.1.1.1", "100.63.255.255", "100.128.0.0", "172.15.255.255", "172.32.0.0"])("accepts ordinary public IPv4 %s", (ip) => {
    expect(globalAddress(ip, 4)).toEqual({ address: ip, family: 4 });
  });
  it("validates every answer and family, including CNAME final answers", () => {
    const good = { address: "8.8.8.8", family: 4 };
    expect(validateDnsAnswers([good, { address: "2606:4700:4700::1111", family: 6 }])).toEqual(good);
    expect(validateDnsAnswers([good, { address: "10.1.1.1", family: 4 }])).toBeNull();
    expect(validateDnsAnswers([good, { address: "::1", family: 6 }])).toBeNull();
    expect(validateDnsAnswers([])).toBeNull();
    expect(validateDnsAnswers([{ address: "8.8.8.8", family: 6 }])).toBeNull();
    expect(validateDnsAnswers([{ address: "not-an-ip", family: 4 }])).toBeNull();
  });
  it("compares exact normalized peer, with mapped representation only for an IPv4 pin", () => {
    const pin = { address: "8.8.8.8", family: 4 as const };
    expect(matchesPinnedPeer("::ffff:8.8.8.8", pin)).toBe(true);
    expect(matchesPinnedPeer("8.8.4.4", pin)).toBe(false);
    expect(matchesPinnedPeer(undefined, pin)).toBe(false);
    expect(matchesPinnedPeer("2606:4700:4700:0:0:0:0:1111", { address: "2606:4700:4700::1111", family: 6 })).toBe(true);
  });
});
