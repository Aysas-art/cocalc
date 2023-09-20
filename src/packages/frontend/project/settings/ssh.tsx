/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Typography } from "antd";
import { replace } from "lodash";

import { SSHKeyAdder } from "@cocalc/frontend/account/ssh-keys/ssh-key-adder";
import { SSHKeyList } from "@cocalc/frontend/account/ssh-keys/ssh-key-list";
import { redux, useTypedRedux } from "@cocalc/frontend/app-framework";
import { A, Icon } from "@cocalc/frontend/components";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { Project } from "./types";
import CopyToClipBoard from "@cocalc/frontend/components/copy-to-clipboard";

const { Text, Paragraph } = Typography;

interface Props {
  project: Project;
  account_id?: string;
  mode?: "project" | "flyout";
}

export function SSHPanel({ project, mode = "project" }: Props) {
  const ssh_gateway_dns = useTypedRedux("customize", "ssh_gateway_dns");
  const ssh_gateway_fingerprint = useTypedRedux(
    "customize",
    "ssh_gateway_fingerprint"
  );

  const project_id = project.get("project_id");

  function add_ssh_key(opts) {
    opts.project_id = project_id;
    redux.getActions("projects").add_ssh_key_to_project(opts);
  }

  function render_fingerprint() {
    // we ignore empty strings as well
    if (!ssh_gateway_fingerprint) return;
    return (
      <Paragraph>
        The server's fingerprint is: <Text code>{ssh_gateway_fingerprint}</Text>
        .
      </Paragraph>
    );
  }

  function render_ssh_notice() {
    const user = replace(project_id, /-/g, "");
    const text = `${user}@${ssh_gateway_dns}`;
    return (
      <>
        <hr />
        <Paragraph>
          Use the following <Text code>username@host</Text> to connect to this
          project:
        </Paragraph>
        <Paragraph>
          <CopyToClipBoard
            style={{
              textAlign: "center",
            }}
            value={text}
            inputStyle={{ margin: "auto" }}
          />
        </Paragraph>
        {render_fingerprint()}
        <Paragraph>
          <A href="https://github.com/sagemathinc/cocalc/wiki/AllAboutProjects#create-ssh-key">
            <Icon name="life-ring" /> How to create SSH keys
          </A>
        </Paragraph>
      </>
    );
  }

  const ssh_keys = project.getIn([
    "users",
    webapp_client.account_id as string,
    "ssh_keys",
  ]);

  return (
    <SSHKeyList
      ssh_keys={ssh_keys}
      project_id={project.get("project_id")}
      mode={mode}
    >
      <>
        <p>
          Easily access this project directly via SSH by adding an ssh public
          key here.
        </p>
        <p>
          The project <Text strong>must be running</Text> in order to be able to
          connect and any changes take <Text strong>about 30 seconds</Text> to
          take effect.
        </p>
      </>
      <SSHKeyAdder
        add_ssh_key={add_ssh_key}
        toggleable={true}
        style={{ marginBottom: "10px" }}
        extra={
          <p>
            If you want to use the same SSH key for all your projects, add it
            using the "SSH keys" tab under Account Settings. If you have done
            that, there is no need to also configure an SSH key here.
          </p>
        }
      />
      {render_ssh_notice()}
    </SSHKeyList>
  );
}
