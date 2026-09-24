import { DEFAULT_CAPTURE_PREFERENCES } from "@likecord/shared/capture-preferences";
import { PrismaService } from "../prisma/prisma.service";
import { DEFAULT_USER_PREFERENCES, PreferenceService } from "./preference.service";

describe("PreferenceService", () => {
  const client = {
    userPreference: { findUnique: jest.fn(), upsert: jest.fn() },
  };
  const service = new PreferenceService({ client } as unknown as PrismaService);
  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  beforeEach(() => jest.resetAllMocks());

  it("projects deterministic typed defaults without creating a row", async () => {
    client.userPreference.findUnique.mockResolvedValue(null);

    await expect(service.getPreferences(userId)).resolves.toEqual(DEFAULT_USER_PREFERENCES);
    expect(client.userPreference.findUnique).toHaveBeenCalledWith({
      where: { userId },
      select: { noiseSuppressionMode: true, inputGainPercent: true, voiceActivationEnabled: true, voiceActivationThresholdDbfs: true, echoCancellationIntent: true, noiseSuppressionIntent: true, autoGainControlIntent: true, voiceIsolationIntent: true, showSendButton: true, theme: true, soundEffectsEnabled: true, soundEffectsVolume: true, callAndStreamVolume: true },
    });
    expect(client.userPreference.upsert).not.toHaveBeenCalled();
  });

  it("returns only the durable public preference projection", async () => {
    client.userPreference.findUnique.mockResolvedValue({ showSendButton: true, theme: "LIKECORD_RETRO_98", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 125 });
    await expect(service.getPreferences(userId)).resolves.toEqual({ ...DEFAULT_CAPTURE_PREFERENCES, showSendButton: true, theme: "LIKECORD_RETRO_98", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 125 });
  });

  it("defensively normalizes an unsupported stored theme in the public projection", async () => {
    client.userPreference.findUnique.mockResolvedValue({ showSendButton: true, theme: "UNKNOWN", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });
    await expect(service.getPreferences(userId)).resolves.toEqual({ ...DEFAULT_CAPTURE_PREFERENCES, showSendButton: true, theme: "LIKECORD_DEFAULT", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });
  });

  it("uses an explicit account-owned upsert for a durable partial mutation", async () => {
    client.userPreference.upsert.mockResolvedValue({ showSendButton: true, theme: "LIKECORD_DEFAULT", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });

    await expect(service.updatePreferences(userId, { showSendButton: true })).resolves.toEqual({ ...DEFAULT_CAPTURE_PREFERENCES, showSendButton: true, theme: "LIKECORD_DEFAULT", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });
    expect(client.userPreference.upsert).toHaveBeenCalledWith({
      where: { userId },
      create: { userId, showSendButton: true },
      update: { showSendButton: true },
      select: { noiseSuppressionMode: true, inputGainPercent: true, voiceActivationEnabled: true, voiceActivationThresholdDbfs: true, echoCancellationIntent: true, noiseSuppressionIntent: true, autoGainControlIntent: true, voiceIsolationIntent: true, showSendButton: true, theme: true, soundEffectsEnabled: true, soundEffectsVolume: true, callAndStreamVolume: true },
    });
  });

  it.each(["LIKECORD_DEFAULT", "LIKECORD_RETRO_98"] as const)("updates typed theme %s without overwriting the existing send-button preference", async (theme) => {
    client.userPreference.upsert.mockResolvedValue({ showSendButton: true, theme, soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });

    await expect(service.updatePreferences(userId, { theme }))
      .resolves.toEqual({ ...DEFAULT_CAPTURE_PREFERENCES, showSendButton: true, theme, soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });
    expect(client.userPreference.upsert).toHaveBeenCalledWith({
      where: { userId },
      create: { userId, theme },
      update: { theme },
      select: { noiseSuppressionMode: true, inputGainPercent: true, voiceActivationEnabled: true, voiceActivationThresholdDbfs: true, echoCancellationIntent: true, noiseSuppressionIntent: true, autoGainControlIntent: true, voiceIsolationIntent: true, showSendButton: true, theme: true, soundEffectsEnabled: true, soundEffectsVolume: true, callAndStreamVolume: true },
    });
  });

  it.each([0, 100, 200])("upserts master CALL and Screen volume %s without overwriting other preferences", async (callAndStreamVolume) => {
    client.userPreference.upsert.mockResolvedValue({
      showSendButton: true,
      theme: "LIKECORD_RETRO_98",
      soundEffectsEnabled: false,
      soundEffectsVolume: 9,
      callAndStreamVolume,
    });

    await expect(service.updatePreferences(userId, { callAndStreamVolume })).resolves.toMatchObject({
      showSendButton: true,
      theme: "LIKECORD_RETRO_98",
      soundEffectsEnabled: false,
      soundEffectsVolume: 9,
      callAndStreamVolume,
    });
    expect(client.userPreference.upsert).toHaveBeenCalledWith({
      where: { userId },
      create: { userId, callAndStreamVolume },
      update: { callAndStreamVolume },
      select: { noiseSuppressionMode: true, inputGainPercent: true, voiceActivationEnabled: true, voiceActivationThresholdDbfs: true, echoCancellationIntent: true, noiseSuppressionIntent: true, autoGainControlIntent: true, voiceIsolationIntent: true, showSendButton: true, theme: true, soundEffectsEnabled: true, soundEffectsVolume: true, callAndStreamVolume: true },
    });
  });

  it("does not create a durable row for an empty PATCH", async () => {
    client.userPreference.findUnique.mockResolvedValue(null);
    await expect(service.updatePreferences(userId, {})).resolves.toEqual(DEFAULT_USER_PREFERENCES);
    expect(client.userPreference.upsert).not.toHaveBeenCalled();
  });

  it("VA3A updates only explicit capture fields and preserves zero/false", async () => {
    const patch = { inputGainPercent: 0, voiceActivationEnabled: false, autoGainControlIntent: "OFF" as const };
    client.userPreference.upsert.mockResolvedValue({ ...DEFAULT_USER_PREFERENCES, ...patch, soundEffectsVolume: 11 });
    expect(await service.updatePreferences(userId, patch)).toMatchObject({ ...patch, soundEffectsVolume: 11 });
    expect(client.userPreference.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { userId, ...patch }, update: patch }));
  });
});
