import { describe, expect, it } from "vitest";

import { ValidationError } from "@/lib/validation";
import { toProfileSummary, updateProfile } from "@/modules/profile";

import { FakeProfileRepository, FakeStore } from "./support/fake-repositories";

function setup() {
  const store = new FakeStore();
  const user = store.createUser();
  return { store, user, repository: new FakeProfileRepository(store) };
}

describe("updateProfile", () => {
  it("persists first name, last name and mobile", async () => {
    const { repository, user, store } = setup();

    const updated = await updateProfile(repository, user.id, {
      firstName: "ابتین",
      lastName: "کریمی",
      phone: "09121234567",
    });

    expect(updated.firstName).toBe("ابتین");
    expect(updated.lastName).toBe("کریمی");
    expect(updated.phone).toBe("09121234567");
    expect(store.users.get(user.id)?.phone).toBe("09121234567");
  });

  it("normalizes Persian digits and +98 mobile formats", async () => {
    const { repository, user } = setup();

    const updated = await updateProfile(repository, user.id, {
      firstName: "زهرا",
      lastName: "محمدی",
      phone: "+۹۸۹۱۲۱۲۳۴۵۶۷",
    });

    expect(updated.phone).toBe("09121234567");
  });

  it("rejects an invalid mobile number", async () => {
    const { repository, user } = setup();

    await expect(
      updateProfile(repository, user.id, {
        firstName: "علی",
        lastName: "رضایی",
        phone: "12345",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an empty name", async () => {
    const { repository, user } = setup();

    await expect(
      updateProfile(repository, user.id, { firstName: "   ", lastName: "رضایی" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a name containing digits", async () => {
    const { repository, user } = setup();

    await expect(
      updateProfile(repository, user.id, { firstName: "علی1", lastName: "رضایی" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects unknown fields instead of silently ignoring them", async () => {
    const { repository, user } = setup();

    await expect(
      updateProfile(repository, user.id, {
        firstName: "علی",
        lastName: "رضایی",
        userId: "someone-else",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("clears verification when the mobile number changes", async () => {
    const { repository, store, user } = setup();
    store.users.set(user.id, {
      ...user,
      phone: "09121234567",
      phoneVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    });

    const updated = await updateProfile(repository, user.id, {
      firstName: "علی",
      lastName: "رضایی",
      phone: "09129999999",
    });

    expect(updated.phone).toBe("09129999999");
    expect(updated.phoneVerifiedAt).toBeNull();
  });

  it("keeps verification when the mobile number is unchanged", async () => {
    const { repository, store, user } = setup();
    const verifiedAt = new Date("2026-01-01T00:00:00Z");
    store.users.set(user.id, { ...user, phone: "09121234567", phoneVerifiedAt: verifiedAt });

    const updated = await updateProfile(repository, user.id, {
      firstName: "علی",
      lastName: "رضایی",
      phone: "0912 123 4567",
    });

    expect(updated.phoneVerifiedAt).toEqual(verifiedAt);
  });

  it("reloads saved values for a returning user", async () => {
    const { repository, user } = setup();
    await updateProfile(repository, user.id, {
      firstName: "نگار",
      lastName: "احمدی",
      phone: "09121234567",
    });

    const reloaded = await repository.findUserById(user.id);
    expect(reloaded).not.toBeNull();
    if (!reloaded) return;

    const summary = toProfileSummary(reloaded);
    expect(summary.firstName).toBe("نگار");
    expect(summary.lastName).toBe("احمدی");
    expect(summary.phone).toBe("09121234567");
    expect(summary.isComplete).toBe(true);
    expect(summary.phoneVerified).toBe(false);
  });

  it("fails for a user that does not exist", async () => {
    const { repository } = setup();

    await expect(
      updateProfile(repository, "missing-user", { firstName: "علی", lastName: "رضایی" }),
    ).rejects.toThrow();
  });
});
