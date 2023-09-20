/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
The format bar.
*/

import { Button, ButtonGroup } from "@cocalc/frontend/antd-bootstrap";
import { React, Rendered } from "@cocalc/frontend/app-framework";
import { Icon, isIconName, Gap } from "@cocalc/frontend/components";
import { ColorButton } from "@cocalc/frontend/components/color-picker";
import FontFamilyMenu from "@cocalc/frontend/components/font-family";
import FontSizeMenu from "@cocalc/frontend/components/font-size";
import HeadingMenu from "@cocalc/frontend/components/heading-menu";
import { SetMap } from "./types";

interface Props {
  actions: any; // type of file being edited, which impacts what buttons are shown.
  extension: string; // store   : rtypes.immutable.Map      # state about format bar stored in external store
  exclude?: SetMap; // exclude buttons with these names
}

function shouldMemoize() {
  return true;
}

export const FormatBar: React.FC<Props> = React.memo((props: Props) => {
  const { actions, extension, exclude } = props;

  function render_button(
    name: string,
    title: string,
    label?: string | Rendered, // if a string, the named icon; if a rendered
    // component for the button, show that in the button; if not given, use
    // icon with given name.
    fontSize?: string
  ): Rendered {
    if (exclude?.[name]) {
      return;
    }
    if (label == null && isIconName(name)) {
      label = <Icon name={name} />;
    } else if (typeof label === "string" && isIconName(label)) {
      label = <Icon name={label} />;
    }

    return (
      <Button
        key={name}
        title={title}
        onClick={() => actions.format_action(name)}
        style={{ maxHeight: "30px", fontSize }}
      >
        {label}
      </Button>
    );
  }

  function render_text_style_buttons(): Rendered {
    return (
      <ButtonGroup key={"text-style"}>
        {render_button("bold", "Make selected text bold")}
        {render_button("italic", "Make selected text italics")}
        {render_button("underline", "Underline selected text")}
        {render_button("strikethrough", "Strike through selected text")}
        {render_button("code", "Format selected text as code")}
        {render_button("sub", "Make selected text a subscript", "subscript")}
        {render_button(
          "sup",
          "Make selected text a superscript",
          "superscript"
        )}
        {render_button("comment", "Comment out selected text")}
      </ButtonGroup>
    );
  }

  function render_insert_buttons(): Rendered {
    return (
      <ButtonGroup key={"insert"}>
        {render_button(
          "format_code",
          "Insert block of source code",
          "CodeOutlined"
        )}
        {render_button("insertunorderedlist", "Insert unordered list", "list")}
        {render_button("insertorderedlist", "Insert ordered list", "list-ol")}
        {render_button("equation", "Insert inline LaTeX math", <span>$</span>)}
        {render_button(
          "display_equation",
          "Insert displayed LaTeX math",
          <span>$$</span>
        )}
        {render_button(
          "quote",
          "Make selected text into a quotation",
          "quote-left"
        )}
        {render_button("table", "Insert table", "table")}
        {render_button(
          "horizontalRule",
          "Insert horizontal rule",
          <span>&mdash;</span>
        )}
      </ButtonGroup>
    );
  }

  function render_insert_dialog_buttons(): Rendered {
    return (
      <ButtonGroup key={"insert-dialog"}>
        {render_button("link", "Insert link", "link")}
        {render_button("image", "Insert image", "image", "12pt")}
        {extension !== "tex"
          ? render_button(
              "SpecialChar",
              "Insert special character...",
              <span style={{ fontSize: "larger" }}>&Omega;</span>
            )
          : undefined}
      </ButtonGroup>
    );
  }

  function render_format_buttons(): Rendered {
    if (exclude?.["format_buttons"]) {
      return;
    }
    return (
      <>
        <Gap />
        <ButtonGroup key={"format"}>
          {render_button("format_code", "Format selected text as code", "code")}
          {render_button(
            "justifyleft",
            "Left justify current text",
            "align-left"
          )}
          {render_button(
            "justifycenter",
            "Center current text",
            "align-center"
          )}
          {render_button(
            "justifyright",
            "Right justify current text",
            "align-right"
          )}
          {render_button(
            "justifyfull",
            "Fully justify current text",
            "align-justify"
          )}
        </ButtonGroup>
        <Gap />
        <ButtonGroup key={"format2"}>
          {render_button(
            "unformat",
            "Remove all formatting from selected text",
            "remove"
          )}
        </ButtonGroup>
      </>
    );
  }

  function render_font_family_dropdown(): Rendered {
    return (
      <FontFamilyMenu
        onClick={(family) => actions.format_action("font_family", family)}
      />
    );
  }

  function render_font_size_dropdown(): Rendered {
    return (
      <FontSizeMenu
        onClick={(size) => actions.format_action("font_size_new", size)}
      />
    );
  }

  function render_heading_dropdown(): Rendered {
    return (
      <HeadingMenu
        onClick={(heading) =>
          actions.format_action(`format_heading_${heading}`)
        }
      />
    );
  }

  function render_colors_dropdown(): Rendered {
    return (
      <ColorButton onChange={(code) => actions.format_action("color", code)} />
    );
  }

  function render_font_dropdowns(): Rendered {
    if (exclude?.["font_dropdowns"]) {
      return;
    }
    return (
      <ButtonGroup
        key={"font-dropdowns"}
        style={{ float: "right", marginRight: "1px" }}
      >
        {render_font_family_dropdown()}
        {render_font_size_dropdown()}
        {render_heading_dropdown()}
        {render_colors_dropdown()}
      </ButtonGroup>
    );
  }

  return (
    <div style={{ background: "#f8f8f8", margin: "0 1px" }}>
      {render_font_dropdowns()}
      <div className={"cc-frame-tree-format-bar"}>
        {render_text_style_buttons()}
        <Gap />
        {render_insert_buttons()}
        <Gap />
        {render_insert_dialog_buttons()}
        {render_format_buttons()}
        <Gap />
      </div>
    </div>
  );
}, shouldMemoize);
