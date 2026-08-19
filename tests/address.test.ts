import { describe, expect, it } from "vitest";

import { NotFoundError } from "@/lib/errors";
import { FieldValidationError } from "@/lib/validation";
import {
  createAddress,
  deactivateAddress,
  getAddress,
  getAddressValidator,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "@/modules/address";

import { FakeAddressRepository, FakeStore } from "./support/fake-repositories";

function addressPayload(overrides: Record<string, unknown> = {}) {
  return {
    recipientName: "ابتین کریمی",
    recipientMobile: "09121234567",
    province: "تهران",
    city: "تهران",
    addressLine: "خیابان ولیعصر، کوچه بهار، پلاک ۱۲، واحد ۳",
    postalCode: "1418973511",
    ...overrides,
  };
}

function setup() {
  const store = new FakeStore();
  const owner = store.createUser();
  const other = store.createUser();
  return {
    store,
    owner,
    other,
    repository: new FakeAddressRepository(store),
    validator: getAddressValidator(),
  };
}

describe("address validation (REQ-022)", () => {
  it("saves a valid address", async () => {
    const { repository, validator, owner } = setup();

    const address = await createAddress(repository, validator, owner.id, addressPayload());

    expect(address.province).toBe("تهران");
    expect(address.postalCode).toBe("1418973511");
    expect(address.isDefault).toBe(true);
  });

  it("rejects an invalid postal code", async () => {
    const { repository, validator, owner } = setup();

    await expect(
      createAddress(repository, validator, owner.id, addressPayload({ postalCode: "12345" })),
    ).rejects.toBeInstanceOf(FieldValidationError);

    await expect(
      createAddress(
        repository,
        validator,
        owner.id,
        addressPayload({ postalCode: "0000000000" }),
      ),
    ).rejects.toBeInstanceOf(FieldValidationError);

    await expect(
      createAddress(
        repository,
        validator,
        owner.id,
        addressPayload({ postalCode: "2418973511" }),
      ),
    ).rejects.toBeInstanceOf(FieldValidationError);
  });

  it("accepts a postal code typed with Persian digits and a dash", async () => {
    const { repository, validator, owner } = setup();

    const address = await createAddress(
      repository,
      validator,
      owner.id,
      addressPayload({ postalCode: "۱۴۱۸۹-۷۳۵۱۱" }),
    );

    expect(address.postalCode).toBe("1418973511");
  });

  it("rejects a missing city", async () => {
    const { repository, validator, owner } = setup();

    await expect(
      createAddress(repository, validator, owner.id, addressPayload({ city: "  " })),
    ).rejects.toBeInstanceOf(FieldValidationError);
  });

  it("rejects a province that is not an Iranian province", async () => {
    const { repository, validator, owner } = setup();

    await expect(
      createAddress(repository, validator, owner.id, addressPayload({ province: "پاریس" })),
    ).rejects.toBeInstanceOf(FieldValidationError);
  });

  it("accepts a province written with Arabic characters", async () => {
    const { repository, validator, owner } = setup();

    const address = await createAddress(
      repository,
      validator,
      owner.id,
      addressPayload({ province: "كرمان" }),
    );

    expect(address.province).toBe("کرمان");
  });

  it("rejects an empty address line", async () => {
    const { repository, validator, owner } = setup();

    await expect(
      createAddress(repository, validator, owner.id, addressPayload({ addressLine: "" })),
    ).rejects.toBeInstanceOf(FieldValidationError);
  });

  it("rejects an invalid recipient mobile", async () => {
    const { repository, validator, owner } = setup();

    await expect(
      createAddress(
        repository,
        validator,
        owner.id,
        addressPayload({ recipientMobile: "0212345678" }),
      ),
    ).rejects.toBeInstanceOf(FieldValidationError);
  });
});

describe("default address (REQ-021)", () => {
  it("makes the first address the default", async () => {
    const { repository, validator, owner } = setup();

    const first = await createAddress(repository, validator, owner.id, addressPayload());

    expect(first.isDefault).toBe(true);
  });

  it("keeps exactly one default when another address is promoted", async () => {
    const { repository, validator, owner } = setup();

    const first = await createAddress(repository, validator, owner.id, addressPayload());
    const second = await createAddress(
      repository,
      validator,
      owner.id,
      addressPayload({ city: "کرج", province: "البرز" }),
    );
    const third = await createAddress(
      repository,
      validator,
      owner.id,
      addressPayload({ city: "شیراز", province: "فارس" }),
    );

    await setDefaultAddress(repository, owner.id, second.id);

    const addresses = await listAddresses(repository, owner.id);
    const defaults = addresses.filter((address) => address.isDefault);

    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.id).toBe(second.id);
    expect(addresses.find((a) => a.id === first.id)?.isDefault).toBe(false);
    expect(addresses.find((a) => a.id === third.id)?.isDefault).toBe(false);
  });

  it("keeps one default when an address is created with isDefault", async () => {
    const { repository, validator, owner } = setup();

    await createAddress(repository, validator, owner.id, addressPayload());
    const second = await createAddress(
      repository,
      validator,
      owner.id,
      addressPayload({ city: "اصفهان", province: "اصفهان", isDefault: true }),
    );

    const addresses = await listAddresses(repository, owner.id);
    expect(addresses.filter((address) => address.isDefault)).toHaveLength(1);
    expect(addresses.find((address) => address.isDefault)?.id).toBe(second.id);
  });

  it("promotes another address when the default is deactivated", async () => {
    const { repository, validator, owner } = setup();

    const first = await createAddress(repository, validator, owner.id, addressPayload());
    const second = await createAddress(
      repository,
      validator,
      owner.id,
      addressPayload({ city: "مشهد", province: "خراسان رضوی" }),
    );

    await deactivateAddress(repository, owner.id, first.id);

    const addresses = await listAddresses(repository, owner.id);
    expect(addresses).toHaveLength(1);
    expect(addresses[0]?.id).toBe(second.id);
    expect(addresses[0]?.isDefault).toBe(true);
  });

  it("hides deactivated addresses but keeps the row", async () => {
    const { repository, validator, owner, store } = setup();

    const address = await createAddress(repository, validator, owner.id, addressPayload());
    await deactivateAddress(repository, owner.id, address.id);

    expect(await listAddresses(repository, owner.id)).toHaveLength(0);
    expect(store.addresses.get(address.id)?.isActive).toBe(false);
    expect(store.addresses.get(address.id)?.deactivatedAt).toBeInstanceOf(Date);
  });

  it("does not touch another user's default when one user changes theirs", async () => {
    const { repository, validator, owner, other } = setup();

    const ownerAddress = await createAddress(repository, validator, owner.id, addressPayload());
    const otherAddress = await createAddress(
      repository,
      validator,
      other.id,
      addressPayload({ city: "تبریز", province: "آذربایجان شرقی" }),
    );
    const ownerSecond = await createAddress(
      repository,
      validator,
      owner.id,
      addressPayload({ city: "قم", province: "قم" }),
    );

    await setDefaultAddress(repository, owner.id, ownerSecond.id);

    const otherAddresses = await listAddresses(repository, other.id);
    expect(otherAddresses).toHaveLength(1);
    expect(otherAddresses[0]?.id).toBe(otherAddress.id);
    expect(otherAddresses[0]?.isDefault).toBe(true);
    expect((await listAddresses(repository, owner.id)).find((a) => a.id === ownerAddress.id)?.isDefault).toBe(false);
  });
});

describe("address ownership isolation", () => {
  it("does not list another user's addresses", async () => {
    const { repository, validator, owner, other } = setup();

    await createAddress(repository, validator, owner.id, addressPayload());

    expect(await listAddresses(repository, other.id)).toHaveLength(0);
  });

  it("refuses to read an address that belongs to someone else", async () => {
    const { repository, validator, owner, other } = setup();
    const address = await createAddress(repository, validator, owner.id, addressPayload());

    await expect(getAddress(repository, other.id, address.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("refuses to edit an address that belongs to someone else", async () => {
    const { repository, validator, owner, other, store } = setup();
    const address = await createAddress(repository, validator, owner.id, addressPayload());

    await expect(
      updateAddress(
        repository,
        validator,
        other.id,
        address.id,
        addressPayload({ city: "رشت", province: "گیلان" }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(store.addresses.get(address.id)?.city).toBe("تهران");
  });

  it("refuses to deactivate an address that belongs to someone else", async () => {
    const { repository, validator, owner, other, store } = setup();
    const address = await createAddress(repository, validator, owner.id, addressPayload());

    await expect(
      deactivateAddress(repository, other.id, address.id),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(store.addresses.get(address.id)?.isActive).toBe(true);
  });

  it("refuses to make someone else's address the default", async () => {
    const { repository, validator, owner, other } = setup();
    const ownerAddress = await createAddress(repository, validator, owner.id, addressPayload());

    await expect(
      setDefaultAddress(repository, other.id, ownerAddress.id),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("edits the caller's own address", async () => {
    const { repository, validator, owner } = setup();
    const address = await createAddress(repository, validator, owner.id, addressPayload());

    const updated = await updateAddress(
      repository,
      validator,
      owner.id,
      address.id,
      addressPayload({ city: "رشت", province: "گیلان" }),
    );

    expect(updated.city).toBe("رشت");
    expect(updated.province).toBe("گیلان");
  });
});
