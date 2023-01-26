/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { isEmpty } from "lodash";

import Image from "components/landing/image";
import useCustomize from "lib/use-customize";
import rectangular from "public/logo/rectangular.svg";
import icon from "public/logo/icon.svg";
import { CSS } from "./misc";
import { unreachable } from "@cocalc/util/misc";

interface Props {
  type: "rectangular" | "icon";
  style?: React.CSSProperties;
  width?: number; // px
  priority?: boolean;
}

export default function Logo(props: Props) {
  const { priority, type } = props;
  const { logoRectangularURL, logoSquareURL } = useCustomize();

  function config(): { alt: string; src: string; custom: boolean } {
    switch (type) {
      case "rectangular":
        return {
          alt: "Rectangular CoCalc Logo",
          src: logoRectangularURL ? logoRectangularURL : rectangular,
          custom: !!logoRectangularURL,
        };
      case "icon":
        return {
          alt: "CoCalc Logo Icon",
          src: logoSquareURL ? logoSquareURL : icon,
          custom: !!logoSquareURL,
        };
      default:
        unreachable(type);
        return { alt: "Logo", src: icon, custom: false };
    }
  }

  const { alt, src, custom } = config();

  const style: CSS = {
    ...(isEmpty(props.style) && { maxWidth: "100%" }),
    ...props.style,
  };

  if (props.width) {
    style.width = `${props.width}px`;
    style.maxWidth = `${props.width}px`;
  }

  if (custom) {
    return <img alt={alt} src={src} style={style} />;
  } else {
    return <Image alt={alt} src={src} style={style} priority={priority} />;
  }
}
