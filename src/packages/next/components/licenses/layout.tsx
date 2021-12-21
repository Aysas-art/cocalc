import { Alert, Layout } from "antd";
import A from "components/misc/A";
import { join } from "path";
import basePath from "lib/base-path";
import Menu from "./menu";
import useIsBrowser from "lib/hooks/is-browser";
import InPlaceSignInOrUp from "components/auth/in-place-sign-in-or-up";
import { Icon } from "@cocalc/frontend/components/icon";
import useProfile from "lib/hooks/profile";
import Loading from "components/share/loading";
import { useRouter } from "next/router";
import LicensedProjects from "./licensed-projects";

const { Content, Sider } = Layout;

interface Props {
  page: string;
}

export default function ConfigLayout({ page }: Props) {
  const router = useRouter();
  const isBrowser = useIsBrowser();
  const profile = useProfile({ noCache: true });
  if (!profile) {
    return <Loading />;
  }
  const { account_id, is_anonymous } = profile;

  if (!account_id) {
    return (
      <Alert
        style={{ margin: "15px auto" }}
        type="warning"
        message={
          <InPlaceSignInOrUp
            title="Account Configuration"
            why="to see information about your licenses"
            onSuccess={() => {
              router.reload();
            }}
          />
        }
      />
    );
  }

  if (is_anonymous) {
    return <div>Please upgrade to a non-anonymous account.</div>;
  }

  const [main] = page;

  function body() {
    switch (main) {
      case "projects":
        return <LicensedProjects />;
    }
    return <div>TODO {main}</div>;
  }

  const content = (
    <Content
      style={{
        padding: 24,
        margin: 0,
        minHeight: 280,
      }}
    >
      <div style={{ float: "right", marginBottom: "15px" }}>
        <Alert
          showIcon
          type="warning"
          message={
            <>
              This is the new licenses page.{" "}
              <A href={join(basePath, "settings")} external>
                You can still use the old page...
              </A>
            </>
          }
        />
      </div>
      <h2>
        <Icon name="key" /> Licenses
      </h2>
      {body()}
    </Content>
  );
  return (
    <Layout>
      <Sider width={"30ex"} breakpoint="sm" collapsedWidth="0">
        {isBrowser && <Menu main={main} />}
      </Sider>
      <Layout
        style={{
          padding: "0 24px 24px",
          backgroundColor: "white",
          color: "#555",
        }}
      >
        {content}
      </Layout>
    </Layout>
  );
}
