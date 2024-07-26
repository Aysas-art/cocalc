/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { useRouter } from "next/router";
import { ReactNode, useState } from "react";

import { Icon } from "@cocalc/frontend/components/icon";
import { len } from "@cocalc/util/misc";
import { COLORS } from "@cocalc/util/theme";
import type { Strategy } from "@cocalc/util/types/sso";
import { Alert, Button, Popconfirm, Space } from "antd";
import { StrategyAvatar } from "components/auth/sso";
import { Paragraph } from "components/misc";
import A from "components/misc/A";
import Loading from "components/share/loading";
import SiteName from "components/share/site-name";
import apiPost from "lib/api/post";
import useAPI from "lib/hooks/api";
import useEditTable from "lib/hooks/edit-table";
import register from "../register";

interface Data {
  passports?: object;
}

register({
  path: "account/sso",
  title: "Single Sign On",
  icon: "external-link",
  desc: "Link your account with configured single sign on (SSO) on providers.",
  Component: () => {
    const [error, setError] = useState<ReactNode>(null);
    const [unlinking, setUnlinking] = useState<boolean>(false);
    const { edited, original, Heading, setEdited } = useEditTable<Data>(
      {
        accounts: { passports: null },
      },
      { noSave: true },
    );

    const hasPassword = useAPI("auth/has-password");
    const strategies = useAPI("auth/sso-strategies");

    if (
      original == null ||
      edited == null ||
      strategies.result == null ||
      hasPassword.result == null
    ) {
      return <Loading />;
    }
    if (strategies.error || hasPassword.error) {
      return (
        <Alert
          showIcon
          type="error"
          message={strategies.error || hasPassword.error}
        />
      );
    }
    if (strategies.result.length == 0) {
      return (
        <Alert
          showIcon
          type="info"
          message={
            <>
              No SSO providers are configured for <SiteName />.
            </>
          }
        />
      );
    }

    const passports = edited.passports ?? {};
    const linkedNames = Object.keys(passports).map(
      (name) => name.split("-")[0],
    );

    return (
      <div style={{ color: COLORS.GRAY_D }}>
        {error && <Alert showIcon type="error" message={error} />}
        <Space direction="vertical">
          {unlinking && (
            <Loading style={{ fontSize: "16pt" }}>
              Unlinking your passport...
            </Loading>
          )}
          {len(passports) > 0 && (
            <>
              <Heading title="Your account is linked with" />
              <Unlink
                passports={passports}
                strategies={strategies.result}
                onUnlink={async (name: string, strategy: Strategy) => {
                  if (unlinking) return;
                  if (len(passports) == 1 && !hasPassword.result.hasPassword) {
                    setError(
                      <>
                        You cannot unlink sign on using {strategy.display},
                        since you would then have no way to sign into your
                        account! Please add another SSO method first or{" "}
                        <A href="/config/account/email">set an email address</A>{" "}
                        and <A href="/config/account/password">a password</A>,
                        or{" "}
                        <A href="/config/account/delete">delete your account</A>
                        .
                      </>,
                    );
                    return;
                  }

                  try {
                    setError(null);
                    setUnlinking(true);
                    await apiPost("/auth/unlink-strategy", { name });
                  } catch (err) {
                    setError(err.message);
                    return;
                  } finally {
                    setUnlinking(false);
                  }

                  const passports0 = edited?.passports;
                  if (!passports0) return;
                  for (const x in passports0) {
                    if (x == name) {
                      delete passports0[x];
                      break;
                    }
                  }
                  setEdited({ passports: passports0 });
                }}
              />
              <br />
              <br />
            </>
          )}

          {strategies.result.length > 0 && (
            <>
              <Heading title="Click to link your account" />
              <Link strategies={strategies.result} linked={linkedNames} />
            </>
          )}
        </Space>
      </div>
    );
  },
});

function Unlink({
  passports,
  strategies,
  onUnlink,
}: {
  passports: object;
  strategies: Strategy[];
  onUnlink: Function;
}) {
  const v: ReactNode[] = [];
  for (const name in passports) {
    const s = name.split("-")[0];
    for (const strategy of strategies) {
      if (s == strategy.name) {
        v.push(
          <Strategy
            key={name}
            strategy={strategy}
            onUnlink={() => onUnlink(name, strategy)}
          />,
        );
        break;
      }
    }
  }

  return <SpacedStrategies>{v}</SpacedStrategies>;
}

function Link({
  strategies,
  linked,
}: {
  strategies: Strategy[];
  linked: string[];
}) {
  const router = useRouter();
  let anyHidden = false;

  const v: ReactNode[] = [];
  for (const strategy of strategies) {
    if (linked.includes(strategy.name)) continue;
    if (!(strategy.public ?? true) && !(strategy.doNotHide ?? false)) {
      anyHidden = true;
      continue;
    }
    v.push(<Strategy key={strategy.name} strategy={strategy} />);
  }
  // link to the page for additional non-public institutional SSOs
  function hidden() {
    return (
      <Paragraph style={{ marginTop: "1rem" }}>
        or other{" "}
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => router.push(`/sso`)}
        >
          institutional SSO options
        </Button>
        .
      </Paragraph>
    );
  }

  return (
    <>
      <SpacedStrategies>{v}</SpacedStrategies>
      {anyHidden && hidden()}
    </>
  );
}

function Strategy({
  strategy,
  onUnlink,
}: {
  strategy: Strategy;
  onUnlink?: Function;
}) {
  function unlinkButton() {
    if (!onUnlink) return;
    return (
      <div style={{ marginTop: "5px" }}>
        <Popconfirm
          title={
            <div style={{ maxWidth: "50ex" }}>
              Are you sure you want to unlink signing in to <SiteName /> using{" "}
              {strategy.display}?
            </div>
          }
          onConfirm={onUnlink as any}
          okText={"Yes, unlink"}
          cancelText={"Cancel"}
        >
          {" "}
          <Button type="dashed" danger>
            <Icon name="unlink" />
            Unlink
          </Button>
        </Popconfirm>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <StrategyAvatar
        strategy={strategy}
        size={60}
        noLink={onUnlink != null}
        showName={true}
        toolTip={
          onUnlink
            ? `Your account is currently linked to ${strategy.display}.`
            : undefined
        }
      />
      {unlinkButton()}
    </div>
  );
}

function SpacedStrategies({ children }: { children: ReactNode[] }) {
  return (
    <Space size={[20, 20]} wrap>
      {children}
    </Space>
  );
}
