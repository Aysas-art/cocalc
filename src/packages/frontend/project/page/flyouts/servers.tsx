/*
 *  This file is part of CoCalc: Copyright © 2023 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Divider, Space } from "antd";

import { Icon, Paragraph, Title } from "@cocalc/frontend/components";
import { ServerLink } from "@cocalc/frontend/project/named-server-panel";
import { SagewsControl } from "../../settings/sagews-control";
import { FIX_BORDER } from "../common";
import { FLYOUT_PADDING } from "./consts";
import {
  computeServersEnabled,
  ComputeServers,
  ComputeServerDocs,
} from "@cocalc/frontend/compute";

export function ServersFlyout({ project_id, wrap }) {
  const servers = [
    <ServerLink key="jupyterlab" name="jupyterlab" project_id={project_id} />,
    <ServerLink key="jupyter" name="jupyter" project_id={project_id} />,
    <ServerLink key="code" name="code" project_id={project_id} />,
    <ServerLink key="pluto" name="pluto" project_id={project_id} />,
  ].filter((s) => s != null);

  function renderEmbeddedServers() {
    return (
      <div style={{ padding: FLYOUT_PADDING }}>
        <Title level={5}>
          <Icon name="server" /> Notebook and Code Editing Servers
        </Title>
        <Paragraph>
          When launched, these servers run inside this project. They should open
          up in a new browser tab, and get access all files in this project.
        </Paragraph>
        <Space direction="vertical">
          {servers}
          {servers.length === 0 && (
            <Paragraph>
              No available server has been detected in this project environment.
            </Paragraph>
          )}
        </Space>
      </div>
    );
  }

  function renderSageServerControl() {
    return (
      <div
        style={{
          padding: "20px 5px 5px 5px",
          marginTop: "20px",
          borderTop: FIX_BORDER,
        }}
      >
        <Title level={5}>
          <Icon name="sagemath" /> Sage Worksheet Server
        </Title>
        <SagewsControl key="worksheet" project_id={project_id} mode="flyout" />
      </div>
    );
  }

  return wrap(
    <>
      {computeServersEnabled() && (
        <div>
          <Title level={5}>
            <ComputeServerDocs style={{ float: "right" }} />
            <Icon name="servers" /> Compute Servers
          </Title>
          <ComputeServers project_id={project_id} />
        </div>
      )}
      <Divider />
      {renderEmbeddedServers()}
      {renderSageServerControl()}
    </>,
  );
}
