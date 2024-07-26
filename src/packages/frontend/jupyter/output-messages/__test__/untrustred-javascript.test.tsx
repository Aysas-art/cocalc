/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import React from "react";
import { shallow } from "enzyme";
import { UntrustedJavascript } from "../untrusted-javascript";

describe("basic test", () => {
  const wrapper = shallow(<UntrustedJavascript />);

  it("checks the output", () => {
    expect(wrapper.find("span").text()).toContain(
      "not running untrusted Javascript"
    );
  });
});
