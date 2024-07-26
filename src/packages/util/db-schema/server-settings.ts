/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Table } from "./types";

Table({
  name: "passport_settings",
  rules: {
    primary_key: "strategy",
  },
  fields: {
    strategy: {
      type: "string",
      desc: "a unique lower-case alphanumeric space-free identifier",
    },
    conf: {
      type: "map",
      desc: "a JSON object with the configuration for this strategy, consumed by the 'auth.ts' module",
    },
    info: {
      type: "map",
      desc: "additional public information about this strategy, displayed on the next.js pages, etc.",
    },
  },
});

Table({
  name: "passport_store",
  rules: {
    primary_key: "key",
  },
  fields: {
    key: {
      type: "string",
      desc: "an arbitrary key",
    },
    value: {
      type: "string",
      desc: "an arbitrary value as a string",
    },
    expire: {
      type: "timestamp",
      desc: "when this key expires",
    },
  },
});

Table({
  name: "server_settings",
  rules: {
    primary_key: "name",
    anonymous: false,
    user_query: {
      // NOTE: can *set* but cannot get!
      set: {
        admin: true,
        fields: {
          name: null,
          value: null,
        },
      },
    },
  },
  fields: {
    name: {
      type: "string",
    },
    value: {
      type: "string",
    },
    readonly: {
      type: "boolean",
      desc: "If true, the user interface should not allow to edit that value – it is controlled externally or via an environment variable.",
    },
  },
});
