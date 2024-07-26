/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { useState } from "react";
import { Alert, Input, Popover, Table } from "antd";

import useAPI from "lib/hooks/api";
import Loading from "components/share/loading";
import editURL from "lib/share/edit-url";
import A from "components/misc/A";
import { cmp, keys } from "@cocalc/util/misc";
import License from "./license";
import { r_join } from "@cocalc/frontend/components/r_join";
import { Icon } from "@cocalc/frontend/components/icon";
import { search_split, search_match } from "@cocalc/util/misc";
import Timestamp from "components/misc/timestamp";
import { Paragraph, Title as AntdTitle } from "components/misc";

function Title({ title, project_id }) {
  return (
    <span style={{ wordWrap: "break-word", wordBreak: "break-word" }}>
      <A href={editURL({ project_id, type: "collaborator" })} external>
        {title}
      </A>
    </span>
  );
}

function Licenses({ site_license, project_id }) {
  return (
    <div style={{ wordWrap: "break-word", wordBreak: "break-word" }}>
      {r_join(
        keys(site_license).map((license_id) => (
          <License
            key={license_id}
            license_id={license_id}
            contrib={{ [project_id]: site_license[license_id] }}
          />
        )),
        <br />
      )}
    </div>
  );
}

export function LastEdited({ last_edited }) {
  return <Timestamp epoch={last_edited} />;
}

function IsHidden({ hidden }) {
  if (hidden) {
    return (
      <div style={{ textAlign: "center" }}>
        <Icon name="check" />
      </div>
    );
  } else {
    return null;
  }
}

const columns = [
  {
    responsive: ["xs"] as any,
    title: "Invoices and Receipts",
    render: (_, project) => (
      <div>
        Project: <Title {...project} />
        <div>
          Last Edited: <LastEdited {...project} />
        </div>
        Licenses:
        <div
          style={{
            margin: "5px 0 0 30px",
            border: "1px solid #eee",
            padding: "5px",
            borderRadius: "5px",
          }}
        >
          <Licenses {...project} />
        </div>
      </div>
    ),
  },
  {
    responsive: ["sm"] as any,
    title: "Project",
    width: "30%",
    render: (_, project) => <Title {...project} />,
    sorter: { compare: (a, b) => cmp(a.title, b.title) },
  },
  {
    responsive: ["sm"] as any,
    title: (
      <Popover
        placement="bottom"
        title="Licenses"
        content={
          <div style={{ maxWidth: "75ex" }}>
            These licenses are all applied to the project. They may or may not
            contribute any upgrades, depending on how the license is being used
            across all projects.
          </div>
        }
      >
        Licenses
      </Popover>
    ),
    render: (_, project) => <Licenses {...project} />,
    sorter: {
      compare: (a, b) =>
        cmp(`${keys(a.site_licenses)}`, `${keys(b.site_licenses)}`),
    },
  },
  {
    responsive: ["sm"] as any,
    title: (
      <Popover
        placement="bottom"
        title="Last Edited"
        content={
          <div style={{ maxWidth: "75ex" }}>
            When the project was last edited.
          </div>
        }
      >
        Project Last Edited
      </Popover>
    ),
    render: (_, project) => <LastEdited {...project} />,
    sorter: { compare: (a, b) => cmp(a.last_edited, b.last_edited) },
  },
  {
    responsive: ["sm"] as any,
    title: (
      <Popover
        placement="bottom"
        title="Project Hidden"
        content={
          <div style={{ maxWidth: "75ex" }}>
            Whether or not the project is "hidden" from you, so it doesn't
            appear in your default list of projects. Typically all student
            projects in a course you teach are hidden. There is a checkmark
            below for hidden projects.
          </div>
        }
      >
        Project Hidden
      </Popover>
    ),
    width: "10%",
    render: (_, project) => <IsHidden {...project} />,
    sorter: { compare: (a, b) => cmp(a.hidden, b.hidden) },
  },
];

export default function LicensedProjects() {
  const [search, setSearch] = useState<string>("");
  let { result, error } = useAPI("licenses/get-projects");
  if (error) {
    return <Alert type="error" message={error} />;
  }
  if (!result) {
    return <Loading />;
  }
  if (search) {
    result = doSearch(result, search);
  }
  return (
    <>
      <AntdTitle level={2}>Your Licensed Projects ({result.length})</AntdTitle>
      <Paragraph>
        These are the licensed projects that you are a collaborator on. You
        might not be a manager of some of the licenses listed below. If you're
        teaching a course, the student projects are likely hidden from your
        normal project list, but are included below.
      </Paragraph>
      <Paragraph style={{ margin: "15px 0" }}>
        <Input.Search
          placeholder="Search..."
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "40ex" }}
        />
      </Paragraph>
      <Table
        columns={columns}
        dataSource={result}
        rowKey={"project_id"}
        pagination={{ hideOnSinglePage: true, pageSize: 100 }}
      />
    </>
  );
}

function doSearch(data: object[], search: string): object[] {
  const v = search_split(search.toLowerCase().trim());
  const w: object[] = [];
  for (const x of data) {
    if (x["search"] == null) {
      x["search"] = `${x["title"]}${JSON.stringify(
        keys(x["site_license"])
      )}`.toLowerCase();
    }
    if (search_match(x["search"], v)) {
      w.push(x);
    }
  }
  return w;
}
