/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Table } from "./types";

Table({
  name: "stats",
  fields: {
    id: {
      type: "uuid",
    },
    time: {
      type: "timestamp",
      pg_check: "NOT NULL",
    },
    accounts: {
      type: "integer",
      pg_check: "NOT NULL CHECK (accounts >= 0)",
    },
    accounts_created: {
      type: "map",
    },
    accounts_active: {
      type: "map",
    },
    files_opened: {
      type: "map",
    },
    projects: {
      type: "integer",
      pg_check: "NOT NULL CHECK (projects >= 0)",
    },
    projects_created: {
      type: "map",
    },
    projects_edited: {
      type: "map",
    },
    hub_servers: {
      type: "array",
      pg_type: "JSONB[]",
    },
    running_projects: {
      type: "map",
    },
  },
  rules: {
    primary_key: "id",
    durability: "soft", // ephemeral stats whose slight loss wouldn't matter much
    anonymous: false, // if true, this would allow user read access, even if not signed in -- we used to do this but decided to use polling instead, since update interval is predictable.
    pg_indexes: ["time"],
  },
});

export interface HistoricCounts {
  "5min"?: number;
  "1h"?: number;
  "1d"?: number;
  "7d"?: number;
  "30d"?: number;
}

export const EXTENSIONS = [
  "board",
  "chat",
  "course",
  "ipynb",
  "jl",
  "jpeg",
  "jpg",
  "lean",
  "m",
  "md",
  "pdf",
  "png",
  "py",
  "rmd",
  "rnw",
  "rst",
  "rtex",
  "sage-chat",
  "sage",
  "sagews",
  "slides",
  "svg",
  "tasks",
  "term",
  "tex",
  "txt",
  "x11",
] as const;

type Extension = (typeof EXTENSIONS)[number];

type CountsByExtension = Record<Extension, string>;

export interface Stats {
  id: string;
  time: Date | number;
  accounts: number;
  accounts_created: HistoricCounts;
  accounts_active: HistoricCounts;
  projects: number;
  projects_created: HistoricCounts;
  projects_edited: HistoricCounts;
  files_opened: {
    total: {
      "1h": CountsByExtension;
      "1d": CountsByExtension;
      "7d": CountsByExtension;
      "30d": CountsByExtension;
    };
    distinct: {
      "1h": CountsByExtension;
      "1d": CountsByExtension;
      "7d": CountsByExtension;
      "30d": CountsByExtension;
    };
  };
  running_projects: { free: number; member: number };
  hub_servers: { host: string; clients: number }[];
}
