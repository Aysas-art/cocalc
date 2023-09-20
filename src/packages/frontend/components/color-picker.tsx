/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */
import { Button, Modal, Select } from "antd";
import { CSSProperties, ReactNode, useState } from "react";
import {
  BlockPicker,
  ChromePicker,
  CirclePicker,
  CompactPicker,
  GithubPicker,
  PhotoshopPicker,
  SketchPicker,
  SliderPicker,
  SwatchesPicker,
  TwitterPicker,
} from "react-color";

const { Option } = Select;

// must be imported from misc/local-storage, because otherwise the "static" build fails
import {
  get_local_storage,
  set_local_storage,
} from "@cocalc/frontend/misc/local-storage";
import { capitalize } from "@cocalc/util/misc";
import { COLORS } from "@cocalc/util/theme";
import { Icon } from "./icon";

const Pickers = {
  circle: CirclePicker,
  photoshop: PhotoshopPicker,
  chrome: ChromePicker,
  github: GithubPicker,
  twitter: TwitterPicker,
  swatches: SwatchesPicker,
  sketch: SketchPicker,
  block: BlockPicker,
  slider: SliderPicker,
  compact: CompactPicker,
};

type TPickers = keyof typeof Pickers;

const LS_PICKER_KEY = "defaultColorPicker";

function getLocalStoragePicker(): TPickers | undefined {
  const p = get_local_storage(LS_PICKER_KEY);
  if (typeof p === "string" && Pickers[p] != null) {
    return p as TPickers;
  }
}

interface Props {
  color?: string;
  onChange?: (htmlColor: string) => void;
  style?: CSSProperties;
  defaultPicker?: keyof typeof Pickers;
  toggle?: ReactNode;
  justifyContent?: "flex-start" | "flex-end" | "center";
}
export default function ColorPicker(props: Props) {
  const {
    color,
    onChange,
    style,
    defaultPicker,
    toggle,
    justifyContent = "center",
  } = props;

  const [visible, setVisible] = useState<boolean>(!toggle);
  const [picker, setPicker] = useState<TPickers>(
    defaultPicker ?? getLocalStoragePicker() ?? "circle"
  );
  const Picker = Pickers[picker];
  const v: ReactNode[] = [];
  for (const picker in Pickers) {
    v.push(
      <Option key={picker} value={picker}>
        {capitalize(picker)}
      </Option>
    );
  }
  if (!visible && toggle) {
    return (
      <div onClick={() => setVisible(true)} style={{ cursor: "pointer" }}>
        {toggle}
      </div>
    );
  }
  return (
    <div style={style}>
      {toggle && (
        <div
          style={{ float: "right", cursor: "pointer" }}
          onClick={() => setVisible(false)}
        >
          <Icon name={"times"} />
        </div>
      )}
      <div
        style={{
          display:
            picker != "slider"
              ? "flex"
              : undefined /* https://github.com/sagemathinc/cocalc/issues/5912 */,
          justifyContent,
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        <Picker
          color={color}
          onChange={
            onChange != null ? (color) => onChange(color.hex) : undefined
          }
        />
      </div>
      <div>
        <div
          style={{
            float: "right",
            fontSize: "12px",
            marginTop: "20px",
            color: COLORS.GRAY_M,
          }}
        >
          Color Picker
        </div>
        <Select
          value={picker}
          style={{ width: "120px", marginTop: "10px" }}
          onChange={(picker) => {
            setPicker(picker);
            set_local_storage(LS_PICKER_KEY, picker);
          }}
        >
          {v}
        </Select>
      </div>
    </div>
  );
}

interface ButtonProps {
  onChange: (htmlColor: string) => void;
  title?: ReactNode;
  style?: CSSProperties;
  type?: "default" | "link" | "text" |"primary" | "dashed";
  onClick?: () => boolean | undefined;
}

export function ColorButton(props: ButtonProps) {
  const { onChange, title, style, type, onClick } = props;
  const [show, setShow] = useState<boolean>(false);
  return (
    <>
      <Modal
        transitionName=""
        maskTransitionName=""
        title={title ?? "Select a Color"}
        open={show}
        onOk={() => setShow(false)}
        onCancel={() => setShow(false)}
      >
        <ColorPicker
          onChange={(color) => {
            onChange(color);
            setShow(false);
          }}
        />
      </Modal>
      <Button
        onClick={() => {
          if (onClick?.()) return;
          setShow(!show);
        }}
        style={style}
        type={type}
      >
        <Icon name="colors" />
      </Button>
    </>
  );
}
