/*
 *  This file is part of CoCalc: Copyright © 2021 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Button } from "antd";
import { join } from "path";
import { CSSProperties, ReactNode } from "react";

import { Paragraph } from "components/misc";
import basePath from "lib/base-path";
import { useCustomize } from "lib/customize";
import { useRouter } from "next/router";

interface Props {
  startup?: ReactNode; // customize the button, e.g. "Start Jupyter Now".
  hideFree?: boolean;
  style?: React.CSSProperties;
}

const STYLE: CSSProperties = {
  textAlign: "center",
  padding: "30px 15px",
  marginBottom: "0",
} as const;

export default function SignIn({ startup, hideFree, style }: Props) {
  const { anonymousSignup, siteName, account } = useCustomize();
  style = { ...STYLE, ...style };
  const router = useRouter();
  if (account != null) {
    return (
      <Paragraph style={style}>
        <Button
          size="large"
          onClick={() => (window.location.href = join(basePath, "projects"))}
          title={`Open the ${siteName} app and view your projects.`}
          type="primary"
        >
          Open your {siteName} projects...
        </Button>
      </Paragraph>
    );
  }
  return (
    <Paragraph style={style}>
      {anonymousSignup && (
        <Button
          size="large"
          type="primary"
          style={{ margin: "10px" }}
          title={"Try now without creating an account!"}
          onClick={() => router.push("/auth/try")}
        >
          Try&nbsp;{startup ?? siteName}&nbsp;Now
        </Button>
      )}
      <Button
        size="large"
        style={{ margin: "10px" }}
        title={"Create a new account."}
        onClick={() => router.push("/auth/sign-up")}
      >
        Sign Up
      </Button>
      <Button
        size="large"
        style={{ margin: "10px" }}
        title={"Either create a new account or sign into an existing account."}
        onClick={() => router.push("/auth/sign-in")}
      >
        Sign In
      </Button>
      {!hideFree && (
        <div style={{ padding: "15px 0 0 0" }}>
          Start free today. Upgrade later.
        </div>
      )}
    </Paragraph>
  );
}
