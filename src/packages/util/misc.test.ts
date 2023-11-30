/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import * as misc from "./misc";

describe("academic domain", () => {
  const ia = misc.isAcademic;

  test("denies non academics", () => {
    expect(ia("foo@bar.com")).toBe(false);
    expect(ia("foo@xxxac.at")).toBe(false);
    expect(ia("foo@bar.gov")).toBe(false);
    expect(ia("me@name.ac.com")).toBe(false);
    expect(ia("foo@name.edu.gov")).toBe(false);
  });

  test("detects academics", () => {
    expect(ia("me@name.ac.at")).toBe(true);
    expect(ia("me@name.ac.il")).toBe(true);
    expect(ia("name@university.ac.uk")).toBe(true);
    expect(ia("name+123@sabanciuniv.edu.tr")).toBe(true);
    expect(ia("student123@stuff.edu")).toBe(true);
  });
});

describe("rpad_html", () => {
  const rp = misc.rpad_html;
  const round1 = misc.round1;
  test("0", () => expect(rp(0, 3)).toEqual("&nbsp;&nbsp;0"));
  test("99", () => expect(rp(99, 3)).toEqual("&nbsp;99"));
  test("4444-5", () => expect(rp(4444, 5)).toEqual("&nbsp;4444"));
  test("6666-4", () => expect(rp(6666, 4)).toEqual("6666"));
  test("1000-4", () => expect(rp(1000, 4)).toEqual("1000"));
  test("1000-3", () => expect(rp(1000, 3)).toEqual("1000"));
  test("pi-1", () => expect(rp(3.1415, 4, round1)).toEqual("&nbsp;3.1"));
});

describe("path_split", () => {
  const ps = misc.path_split;

  test("full path", () =>
    expect(ps("foo/bar")).toEqual({ head: "foo", tail: "bar" }));

  test("filename", () =>
    expect(ps("foo.bar.baz")).toEqual({ head: "", tail: "foo.bar.baz" }));

  test("dirname", () => expect(ps("foo/")).toEqual({ head: "foo", tail: "" }));

  test("abspath", () =>
    expect(ps("/HOME/USER/DIR")).toEqual({
      head: "/HOME/USER",
      tail: "DIR",
    }));

  test("ROOT", () => expect(ps("/")).toEqual({ head: "", tail: "" }));
});

describe("contains_url", () => {
  const cu = misc.contains_url;

  test("normal html is fine", () =>
    expect(cu("<h2>foo</h2><div>bar</div>")).toBe(false));

  test("detects URLs", () => {
    expect(cu("<p><a href='http://foo.com'>click me</a></p>")).toBe(true);
    expect(cu("abc bar.com xyz")).toBe(true);
    expect(cu("abc www.buy.me xyz")).toBe(true);
  });
});

describe("date object some time ago", () => {
  test("roughly 10 mins ago", () => {
    const res = misc.minutes_ago(10);
    const diff = new Date().getTime() - res.getTime();
    expect(diff).toBeLessThan(10 * 60 * 1000 + 100);
    expect(diff).toBeGreaterThan(10 * 60 * 1000 - 100);
  });
  test("2 months ago", () => {
    const res = misc.months_ago(2);
    const diff = new Date().getTime() - res.getTime();
    expect(diff).toBeLessThan(2 * 31 * 24 * 60 * 60 * 1000);
    expect(diff).toBeGreaterThan(2 * 30 * 24 * 60 * 60 * 1000);
  });
});

describe("how_long_ago_m", () => {
  test("10 min ago  by Date", () => {
    const past: Date = misc.minutes_ago(10);
    const diff = misc.how_long_ago_m(past);
    expect(diff).toBeLessThan(10.1);
    expect(diff).toBeGreaterThan(9.9);
  });

  test("10 min ago  by timestamp", () => {
    const past: number = misc.minutes_ago(10).getTime();
    const diff = misc.how_long_ago_m(past);
    expect(diff).toBeLessThan(10.1);
    expect(diff).toBeGreaterThan(9.9);
  });
});

describe("json patch test", () => {
  const j = misc.test_valid_jsonpatch;
  test("empty array is fine", () => expect(j([])).toBe(true));
  test("a complete example is fine", () => {
    // taken from https://jsonpatch.com/
    const patch = [
      { op: "add", path: "/biscuits/1", value: { name: "Ginger Nut" } },
      { op: "remove", path: "/biscuits" },
      { op: "remove", path: "/biscuits/0" },
      { op: "replace", path: "/biscuits/0/name", value: "Chocolate Digestive" },
      { op: "copy", from: "/biscuits/0", path: "/best_biscuit" },
      { op: "move", from: "/biscuits", path: "/cookies" },
      { op: "test", path: "/best_biscuit/name", value: "Choco Leibniz" },
    ];

    expect(j(patch)).toBe(true);
  });
  test("fails with broken examples", () => {
    expect(
      j({ op: "add", path: "/biscuits/1", value: { name: "Ginger Nut" } }),
    ).toBe(false);
    expect(j([{ opp: "remove", path: "/biscuits" }])).toBe(false);
    expect(j([{ path: "/biscuits/0" }])).toBe(false);
    expect(j([{ op: "replacce", path: "/biscuits/0/name" }])).toBe(false);
  });
});

test("firstLetterUppercase", () => {
  const s = misc.firstLetterUppercase;
  expect(s(undefined)).toBe("");
  expect(s("")).toBe("");
  expect(s("a")).toBe("A");
  expect(s("abc")).toBe("Abc");
  expect(s("ABC")).toBe("ABC");
  expect(s("aBC")).toBe("ABC");
});

test("sanitizeObject", () => {
  const o1 = {
    a: { foo: { bar: { baz: 123 } } },
    b: 2,
    c: {
      foofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoo:
        "val",
    },
  };
  const o2 = {
    a: { foo: { error: "recursion limit" } },
    b: 2,
    c: {
      foofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofo: "val",
    },
  };
  expect(misc.sanitizeObject(o1)).toEqual(o2);
});

test("hexColorToRGBA", () => {
  const c1 = misc.hexColorToRGBA("#000000");
  expect(c1).toEqual("rgb(0,0,0)");
  const c2 = misc.hexColorToRGBA("#ffffff", 0.5);
  expect(c2).toEqual("rgba(255,255,255,0.5)");
});

test("strictMod", () => {
  const mod = misc.strictMod;
  expect(mod(0, 3)).toBe(0);
  expect(mod(1, 3)).toBe(1);
  expect(mod(-2, 3)).toBe(1);
  expect(mod(-3, 3)).toBe(0);
  expect(mod(-1, 10)).toBe(9);
});

test("EDITOR_PREFIX", () => {
  // don't change it, because codebase is not using the global variable everywhere
  expect(misc.EDITOR_PREFIX).toBe("editor-");
});

describe("test code for displaying numbers as currency with 2 or sometimes 3 decimals of precision", () => {
  const { currency } = misc;
  it("displays 1.23", () => {
    expect(currency(1.23)).toBe("$1.23");
  });

  it("displays 0.0094 with 3 digits (not 2), but only because n is less than 0.01", () => {
    expect(currency(0.0094)).toBe("$0.009");
  });

  it("displays 0.1941 with 2, because n is not less than 0.01", () => {
    expect(currency(0.1941)).toBe("$0.19");
  });
  it("displays 0.01941 with 2, because n is not less than 0.01", () => {
    expect(currency(0.01941)).toBe("$0.02");
  });

  it("displays 0.0941 with 2 digits if second argument specifies that", () => {
    expect(currency(0.0941, 2)).toBe("$0.09");
  });

  it("displays 0.086 with 2 digits if second argument specifies that, and it is rounded to nearest", () => {
    expect(currency(0.086, 2)).toBe("$0.09");
  });

  it("displays 0.083 with 2 digits if second argument specifies that, and it is rounded to nearest (NOT up)", () => {
    expect(currency(0.083, 2)).toBe("$0.08");
  });

  it("always includes at least 2 decimals", () => {
    expect(currency(10)).toBe("$10.00");
  });
});
