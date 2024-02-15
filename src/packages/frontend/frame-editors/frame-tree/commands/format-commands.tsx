import { range } from "lodash";

import AIAvatar from "@cocalc/frontend/components/ai-avatar";
import ColorPicker from "@cocalc/frontend/components/color-picker";
import { HeadingContent } from "@cocalc/frontend/components/heading-menu";
import {
  FONT_FACES,
  FONT_SIZES,
} from "@cocalc/frontend/editors/editor-button-bar";
import { addEditorMenus } from "./editor-menus";

const FORMAT_SPEC = {
  equation: {
    button: "Math",
    label: "Inline Equation",
    title: "Insert inline LaTeX math equation.",
    icon: <span>$</span>,
  },
  display_equation: {
    button: "Display",
    label: "Displayed Equation",
    title: "Insert display LaTeX math equation.",
    icon: <span>$$</span>,
  },
  ai_formula: {
    button: "Formula",
    label: "AI Generated Formula",
    title: "Insert AI generated formula.",
    icon: <AIAvatar size={16} />,
  },
  bold: { icon: "bold", title: "Make selected text bold" },
  italic: { icon: "italic", title: "Make selected text italics" },
  underline: { icon: "underline", title: "Underline selected text" },
  strikethrough: {
    icon: "strikethrough",
    title: "Strike through selected text",
  },
  code: { icon: "code", title: "Format selected text as code" },
  sub: {
    label: "Subscript",
    title: "Make selected text a subscript",
    icon: "subscript",
  },
  sup: { title: "Make selected text a superscript", icon: "superscript" },
  comment: {
    icon: "comment",
    title: "Comment out selected text so it is not visible in rendered view.",
    label: "Hide Selection as Comment",
  },
  format_code: {
    icon: "CodeOutlined",
    label: "Code Block",
    title: "Insert a block of source code or format selection as code",
  },
  insertunorderedlist: {
    icon: "list",
    label: "Unordered List",
    title: "Insert an unordered list",
  },
  insertorderedlist: {
    icon: "list-ol",
    label: "Ordered List",
    title: "Insert an ordered list",
  },
  quote: {
    icon: "quote-left",
    label: "Quote",
    title: "Make selected text into a quotation",
  },
  table: { icon: "table", label: "Table", title: "Insert a table" },
  horizontalRule: {
    label: "Horizontal Rule",
    title: "Insert a horizontal rule",
    icon: <span>&mdash;</span>,
  },
  link: {
    icon: "link",
    label: "Link",
    title: "Insert a link to a URL, i.e., a website.",
  },
  image: {
    icon: "image",
    label: "Image",
    title:
      "Insert an image.  You can also just drag and drop or paste an image into your document in many cases.",
  },
  SpecialChar: {
    icon: <span style={{ fontSize: "larger" }}>&Omega;</span>,
    label: "Special Character",
    title: "Insert non-English characters, emojis, and mathematical symbols.",
  },
  justifyleft: {
    icon: "align-left",
    label: "Align Left",
    title: "Left justify current text",
  },
  justifycenter: {
    icon: "align-center",
    label: "Align Center",
    title: "Center current text",
  },
  justifyright: {
    icon: "align-right",
    label: "Align Right",
    title: "Right justify current text",
  },
  justifyfull: {
    icon: "align-justify",
    label: "Justify",
    title: "Fully justify current text",
  },
  unformat: {
    icon: "remove",
    label: "Remove Formatting",
    title: "Remove all formatting from selected text",
  },
};

const FORMAT_MENUS = {
  insert: {
    label: "Insert",
    pos: 1.3,
    math: ["equation", "display_equation", "ai_formula"],
    lists: ["insertunorderedlist", "insertorderedlist"],
    objects: [
      "table",
      "link",
      "quote",
      "image",
      "horizontalRule",
      "format_code",
      "SpecialChar",
    ],
  },
  format: {
    label: "Format",
    pos: 1.5,
    font_text: [
      {
        icon: "bold",
        isVisible: "format_action",
        name: "font",
        label: "Font",
        children: [
          "bold",
          "italic",
          "underline",
          "strikethrough",
          "code",
          "sub",
          "sup",
        ],
      },
      {
        icon: "text-height",
        isVisible: "format_action", // todo
        name: "font-size",
        label: "Size",
        children: FONT_SIZES.map((size) => {
          return {
            name: `${size}`,
            onClick: ({ props }) =>
              props.actions.format_action("font_size_new", size),
            label: (
              <span style={{ fontSize: size }}>
                {size} {size === "medium" ? "(default)" : undefined}
              </span>
            ),
            icon: <span style={{ fontSize: size }}>A</span>,
          };
        }),
      },
      {
        icon: "font",
        isVisible: "format_action", // todo
        name: "font-family",
        label: "Family",
        children: FONT_FACES.map((family) => {
          return {
            name: family,
            onClick: ({ props }) =>
              props.actions.format_action("font_family", family),
            label: <span style={{ fontFamily: family }}>{family}</span>,
            icon: <span style={{ fontFamily: family }}>A</span>,
          };
        }),
      },
      {
        icon: "header",
        isVisible: "format_action", // todo
        name: "header",
        label: "Heading",
        children: range(1, 7).map((heading) => {
          return {
            name: `heading-${heading}`,
            onClick: ({ props }) =>
              props.actions.format_action(`format_heading_${heading}`),
            label: <HeadingContent heading={heading} />,
          };
        }),
      },
      {
        icon: "colors",
        isVisible: "format_action",
        name: "color",
        label: "Color",
        children: [
          {
            stayOpenOnClick: true,
            label: ({ props }) => (
              <div
                onClick={(e) => {
                  // hack so can select a color without picker closing.
                  e.stopPropagation();
                }}
              >
                <ColorPicker
                  radio
                  onChange={(code) => {
                    props.actions.format_action("color", code);
                  }}
                />
              </div>
            ),
          },
        ],
      },
      {
        icon: "text",
        isVisible: "format_action",
        name: "text",
        label: "Text",
        children: [
          "justifyleft",
          "justifycenter",
          "justifyright",
          "justifyfull",
        ],
      },
      "comment",
      "unformat",
    ],
  },
};

addEditorMenus({
  prefix: "format",
  editorMenus: FORMAT_MENUS,
  getCommand: (name) => {
    const spec = FORMAT_SPEC[name];
    return {
      isVisible: "format_action",
      onClick: ({ props }) => props.actions.format_action(name),
      ...spec,
    };
  },
});
