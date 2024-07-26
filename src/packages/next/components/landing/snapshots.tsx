/*
 *  This file is part of CoCalc: Copyright © 2021 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { ReactNode } from "react";

import A from "components/misc/A";
import Info from "./info";
import image from "public/features/cocalc-snapshots.png";
import { Paragraph } from "components/misc";

interface Props {
  children?: ReactNode;
}

export default function Snapshots({ children }: Props) {
  return (
    <Info
      title="Snapshot backups"
      image={image}
      icon="life-saver"
      anchor="a-snapshot-backups"
      alt="Browsing filesystem snapshots in a CoCalc project"
      wide
    >
      <Paragraph>
        <strong>Snapshots</strong> are consistent read-only views of all your
        files in a{" "}
        <A href="https://doc.cocalc.com/project.html">CoCalc project</A>. You
        can restore your files by copying back any that you accidentally deleted
        or corrupted.
      </Paragraph>
      {children}
    </Info>
  );
}
