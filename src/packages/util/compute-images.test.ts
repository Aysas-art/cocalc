import { FALLBACK_SOFTWARE_ENV } from "./compute-images";

test("fallback name exists", () => {
  expect(
    FALLBACK_SOFTWARE_ENV.environments[FALLBACK_SOFTWARE_ENV.default]
  ).toBeDefined();
});

test("consistent naming", () => {
  const envs = FALLBACK_SOFTWARE_ENV.environments;
  const groups = FALLBACK_SOFTWARE_ENV.groups;
  for (const [name, info] of Object.entries(envs)) {
    const i = name.indexOf("-");
    const [base, ts] =
      i > 0 ? [name.slice(0, i), name.slice(i + 1)] : [name, ""];
    expect(info.title).toBeDefined();
    expect(groups.includes(info.group)).toBe(true);
    const { group, title, short } = info;

    expect(short).toBeDefined();
    switch (group) {
      case "Main":
        expect(
          ["default", "ubuntu2004", "ubuntu2204", "ubuntu1804"].includes(base)
        ).toBe(true);
        break;

      case "Ubuntu 16.04":
        expect(["old"].includes(base)).toBe(true);
        expect(title?.indexOf(ts) ?? 0 > 0);
        break;

      case "Ubuntu 18.04":
        expect(["exp", "stable", "previous"].includes(base)).toBe(true);
        expect(title?.indexOf(ts) ?? 0 > 0);
        if (base === "stable") {
          expect(ts.startsWith(short ?? "")).toBe(true);
        }
        break;

      case "Ubuntu 20.04":
        expect(["ubuntu2004", "exp"].includes(base)).toBe(true);
        expect(title?.indexOf(ts) ?? 0 > 0);
        if (ts === "dev" || ts === "previous") {
        } else if (base === "ubuntu2004") {
          expect(ts.startsWith(short ?? "")).toBe(true);
        }
        break;

      case "Ubuntu 22.04":
        expect(["ubuntu2204", "exp"].includes(base)).toBe(true);
        expect(title?.indexOf(ts) ?? 0 > 0);
        if (ts === "dev" || ts === "previous") {
        } else if (base === "ubuntu2204") {
          expect(ts.startsWith(short ?? "")).toBe(true);
        }
        break;

      default:
        expect(
          ["stable", "old", "exp", "previous", "default", ""].includes(base)
        ).toBe(true);
    }
  }
});
