import { A } from "@cocalc/frontend/components/A";
import ComputeServer from "./compute-server";
import CreateComputeServer from "./create-compute-server";
import { useTypedRedux } from "@cocalc/frontend/app-framework";
import { cmp } from "@cocalc/util/misc";
import { availableClouds } from "./config";
import { Input, Checkbox, Radio, Typography } from "antd";
import { useEffect, useState } from "react";
const { Search } = Input;
import { search_match, search_split } from "@cocalc/util/misc";
import {
  SortableList,
  SortableItem,
  DragHandle,
} from "@cocalc/frontend/components/sortable-list";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { Icon } from "@cocalc/frontend/components";

export function Docs({ style }: { style? }) {
  return (
    <A style={style} href="https://doc.cocalc.com/compute_server.html">
      <Icon name="external-link" /> Docs
    </A>
  );
}

export default function ComputeServers({
  project_id,
  hideHelp,
  onOpen,
}: {
  project_id: string;
  hideHelp?: boolean;
  onOpen?: (id: number) => void;
}) {
  const computeServers = useTypedRedux({ project_id }, "compute_servers");
  const account_id = useTypedRedux("account", "account_id");

  return (
    <div style={{ paddingRight: "15px" }}>
      {!hideHelp && <Help />}
      {availableClouds().length == 0 ? (
        <b>No Compute Server Clouds are currently enabled.</b>
      ) : (
        <ComputeServerTable
          computeServers={computeServers}
          project_id={project_id}
          account_id={account_id}
          onOpen={onOpen}
        />
      )}
    </div>
  );
}

function Help() {
  return (
    <Typography.Paragraph
      ellipsis={{
        expandable: true,
        rows: 2,
        symbol: "more",
      }}
      style={{ fontSize: "12pt" }}
    >
      Do you need{" "}
      <strong>
        <A href="https://github.com/sagemathinc/cocalc-howto/blob/main/ollama.md">
          affordable GPU's
        </A>
      </strong>
      , <strong>high end VM's</strong>, <strong>root access</strong>,{" "}
      <strong>Docker</strong>, to host a{" "}
      <strong>
        <A href="https://github.com/sagemathinc/cocalc-docker/blob/master/docs/cocalc.com.md">
          powerful public webserver
        </A>
      </strong>
      , or use{" "}
      <strong>
        <A href="https://github.com/sagemathinc/cocalc-howto/blob/main/mathematica.md">
          commercial software
        </A>
      </strong>{" "}
      in CoCalc? Compute servers are pay as you go virtual machines where you
      can run Jupyter notebooks, terminals and web servers collaboratively, with
      full access to this project.
      <ul>
        <li>
          <Icon name="ubuntu" /> Full root and internet access on an Ubuntu
          Linux server,
        </li>
        <li>
          <Icon name="server" /> Dedicated GPU's, hundreds of very fast vCPU's,
          and thousands of GB of RAM
        </li>
        <li>
          <Icon name="mathematica" /> <Icon name="matlab" />{" "}
          <Icon name="maple" /> Install any free and commercial Linux software
          (e.g., MATLAB,{" "}
          <A href="https://github.com/sagemathinc/cocalc-howto/blob/main/mathematica.md">
            Mathematica
          </A>
          , any Docker container, etc.)
        </li>
        <li>
          {" "}
          <Icon name="dns" /> Public ip address and (optional) domain name
        </li>
        <li>
          {" "}
          <Icon name="sync" /> Files sync'd with this project when you click the
          "Sync files" button.
        </li>
      </ul>
      <h3>Getting Started</h3>
      <ul>
        <li>Create a compute server below and start it.</li>
        <li>
          Once your compute server is running, select it in the upper left of
          any terminal or Jupyter notebook in this project.{" "}
        </li>
        <li>
          Compute servers stay running independently of your project, so if you
          need to restart your project for any reason, that doesn't impact
          running notebooks and terminals on your compute servers.
        </li>
        <li>
          A compute server belongs to the user who created it; only they can
          start or stop it, and they will be billed by the second for usage. Any
          project collaborator can connect to a running compute server.
        </li>
        <li>
          You can ssh to root@ or user@ the ip address of your compute server
          using any{" "}
          <A href="https://doc.cocalc.com/project-settings.html#ssh-keys">
            project
          </A>{" "}
          or{" "}
          <A href="https://doc.cocalc.com/account/ssh.html">
            account public ssh keys
          </A>{" "}
          that has access to this project (you must restart the compute server
          if you add keys). Once there, type{" "}
          <code>docker exec -it compute bash</code> to access your compute
          image. If you start a web service on any port P on your compute
          server, type <code>ssh -L P:localhost:P root@ip_address</code>
          on your laptop, and you can connect to that web service on localhost
          on your laptop.
        </li>
      </ul>
    </Typography.Paragraph>
  );
}

function computeServerToSearch(computeServers, id) {
  return JSON.stringify(computeServers.get(id)).toLowerCase();
}

function ComputeServerTable({
  computeServers: computeServers0,
  project_id,
  account_id,
  onOpen,
}) {
  const [computeServers, setComputeServers] = useState<any>(computeServers0);
  useEffect(() => {
    setComputeServers(computeServers0);
  }, [computeServers0]);

  const [search, setSearch] = useState<string>("");
  const [showDeleted, setShowDeleted] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"id" | "title" | "custom">(
    localStorage.compute_server_sort ?? "custom",
  );
  if (!computeServers || computeServers.size == 0) {
    return (
      <div style={{ textAlign: "center" }}>
        <CreateComputeServer
          project_id={project_id}
          onCreate={() => setSearch("")}
        />
      </div>
    );
  }
  const search_words = search_split(search.toLowerCase());
  const ids: number[] = [];
  let numDeleted = 0;
  for (const [id] of computeServers) {
    const isDeleted = !!computeServers.getIn([id, "deleted"]);
    if (isDeleted) {
      numDeleted += 1;
    }
    if (showDeleted != isDeleted) {
      continue;
    }
    if (search_words.length > 0) {
      if (
        !search_match(computeServerToSearch(computeServers, id), search_words)
      ) {
        continue;
      }
    }
    ids.push(id);
  }
  ids.sort((a, b) => {
    if (a == b) {
      return 0;
    }
    const cs_a = computeServers.get(a);
    const cs_b = computeServers.get(b);
    if (sortBy == "custom") {
      return -cmp(
        cs_a.get("position") ?? cs_a.get("id"),
        cs_b.get("position") ?? cs_b.get("id"),
      );
    } else if (sortBy == "title") {
      return cmp(
        cs_a.get("title")?.toLowerCase(),
        cs_b.get("title")?.toLowerCase(),
      );
    } else {
      // sort by id
      return -cmp(cs_a.get("id"), cs_b.get("id"));
    }
  });

  const renderItem = (id) => {
    const data = computeServers.get(id).toJS();

    return (
      <div style={{ display: "flex" }}>
        {sortBy == "custom" && (
          <div
            style={{
              fontSize: "20px",
              color: "#888",
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
              marginRight: "5px",
            }}
          >
            <DragHandle id={id} />
          </div>
        )}
        <ComputeServer
          id={id}
          style={{ marginBottom: "15px" }}
          key={`${id}`}
          editable={account_id == data.account_id}
          {...data}
          setShowDeleted={setShowDeleted}
          setSearch={setSearch}
          onOpen={onOpen != null ? () => onOpen(parseInt(id)) : undefined}
        />
      </div>
    );
  };

  const v: JSX.Element[] = [];
  for (const id of ids) {
    v.push(
      <SortableItem key={`${id}`} id={id}>
        {renderItem(id)}
      </SortableItem>,
    );
  }

  return (
    <div style={{ margin: "5px" }}>
      <div style={{ marginBottom: "15px" }}>
        {computeServers.size > 1 && (
          <Search
            allowClear
            placeholder="Filter servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250, float: "right", marginBottom: "10px" }}
          />
        )}
        {false && computeServers.size > 1 && (
          <span style={{ marginLeft: "15px" }}>
            Sort:{" "}
            <Radio.Group
              value={sortBy}
              size="small"
              onChange={(e) => {
                setSortBy(e.target.value);
                // LAZY!
                try {
                  localStorage.compute_server_sort = e.target.value;
                } catch (_) {}
              }}
            >
              <Radio.Button value="custom">Custom</Radio.Button>
              <Radio.Button value="id">Id</Radio.Button>
              <Radio.Button value="title">Title</Radio.Button>
            </Radio.Group>
          </span>
        )}
        {numDeleted > 0 && (
          <Checkbox
            style={{ marginLeft: "10px", marginTop: "5px" }}
            checked={showDeleted}
            onChange={() => setShowDeleted(!showDeleted)}
          >
            Deleted ({numDeleted})
          </Checkbox>
        )}
      </div>
      <div style={{ margin: "15px 0", textAlign: "center" }} key="create">
        <CreateComputeServer
          project_id={project_id}
          onCreate={() => setSearch("")}
        />
      </div>
      <SortableList
        disabled={sortBy != "custom"}
        items={ids}
        Item={({ id }) => renderItem(id)}
        onDragStop={(oldIndex, newIndex) => {
          console.log({ oldIndex, newIndex });
          let position;
          if (newIndex == ids.length - 1) {
            const last = computeServers.get(ids[ids.length - 1]);
            // putting it at the bottom, so subtract 1 from very bottom position
            position = (last.get("position") ?? last.get("id")) - 1;
          } else {
            // putting it above what was at position newIndex.
            if (newIndex == 0) {
              // very top
              const first = computeServers.get(ids[0]);
              // putting it at the bottom, so subtract 1 from very bottom position
              position = (first.get("position") ?? first.get("id")) + 1;
            } else {
              // not at the very top: between two
              let x, y;
              if (newIndex > oldIndex) {
                x = computeServers.get(ids[newIndex]);
                y = computeServers.get(ids[newIndex + 1]);
              } else {
                x = computeServers.get(ids[newIndex - 1]);
                y = computeServers.get(ids[newIndex]);
              }

              const x0 = x.get("position") ?? x.get("id");
              const y0 = y.get("position") ?? y.get("id");
              // TODO: yes, positions could get too close and this doesn't work, and then
              // we have to globally reset them all.  This is done for jupyter etc.
              // not implemented here *yet*.
              position = (x0 + y0) / 2;
            }
          }
          const id = ids[oldIndex];
          let cur = computeServers.get(ids[oldIndex]);
          cur = cur.set("position", position);
          setComputeServers(computeServers.set(ids[oldIndex], cur));
          (async () => {
            try {
              await webapp_client.async_query({
                query: {
                  compute_servers: {
                    id,
                    project_id,
                    position,
                  },
                },
              });
            } catch (err) {
              console.warn(err);
            }
          })();
        }}
      >
        {v}
      </SortableList>
    </div>
  );
}
