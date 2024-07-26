/*
 *  This file is part of CoCalc: Copyright © 2021 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Col, Row, Space } from "antd";

import { EDITOR_COLOR_SCHEMES } from "@cocalc/util/db-schema/accounts";
import CodeMirror from "components/share/codemirror";
import Loading from "components/share/loading";
import useEditTable from "lib/hooks/edit-table";
import register from "../register";
import { Title } from "components/misc";

interface Data {
  font_size: number;
  editor_settings: {
    theme: keyof typeof EDITOR_COLOR_SCHEMES;
    line_numbers: boolean;
    line_wrapping: boolean;
  };
}

const desc = {
  font_size: `
Newly opened files will open with this font size in pixels by default. You can
change the font size for a particular file (or editor frame) at any time,
and the setting is saved in your browser.
`,
  theme: `The editor theme determines the color scheme used by CodeMirror.
This impacts editing files and input cells of Jupyter notebooks.`,
  line_wrapping: `Enable line or word wrapping so that when I line is longer than the width of the editor,
the line will get wrapped so it stays visible, and there is no horizontal scroll bar.  Enabling
this can make it difficult to view the structure of some text involving longer lines, but avoids having
to scroll horizontally.`,
  line_numbers: `Display line numbers to the left of the editor content.`,
};

const EXAMPLE = `def is_prime_lucas_lehmer(p):
    """
    Test primality of Mersenne number 2**p - 1.  This is a long line hopefully illustrating line wrapping.

    >>> is_prime_lucas_lehmer(107)
    True
    """
    k = 2**p - 1; s = 4
    for i in range(3, p+1):
        s = (s*s - 2) % k
    return s == 0`;

register({
  path: "editor/appearance",
  title: "Appearance",
  icon: "font",
  desc: "Editor default font size, color theme, etc.",
  search: desc,
  Component: () => {
    const { edited, original, Save, EditBoolean, EditNumber, EditSelect } =
      useEditTable<Data>({
        accounts: { font_size: null, editor_settings: null },
      });

    if (original == null || edited == null) {
      return <Loading />;
    }

    return (
      <Row gutter={[20, 30]}>
        <Col md={24}>
          <Save />
        </Col>
        <Col md={14} sm={24}>
          <Space direction="vertical" size="large">
            <EditNumber
              path="font_size"
              icon="text-height"
              title="Default Font Size"
              desc={desc.font_size}
              min={5}
              max={32}
              units="px"
            />
            <EditSelect
              path="editor_settings.theme"
              icon="colors"
              desc={desc.theme}
              options={EDITOR_COLOR_SCHEMES}
              style={{ width: "30ex" }}
            />
            <EditBoolean
              icon="align-left"
              path="editor_settings.line_wrapping"
              desc={desc.line_wrapping}
            />
            <EditBoolean
              icon="list-ol"
              path="editor_settings.line_numbers"
              desc={desc.line_numbers}
            />
          </Space>
        </Col>
        <Col md={10} sm={24}>
          <Title level={3}>Preview</Title>
          <CodeMirror
            content={EXAMPLE}
            filename="a.py"
            fontSize={edited.font_size}
            options={{
              // @ts-ignore
              theme: edited.editor_settings.theme,
              lineNumbers: edited.editor_settings.line_numbers,
              lineWrapping: edited.editor_settings.line_wrapping,
            }}
          />
        </Col>
      </Row>
    );
  },
});
