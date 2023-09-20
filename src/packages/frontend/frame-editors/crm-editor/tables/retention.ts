import { register } from "./tables";

register({
  name: "crm_retention",

  title: "Retention",

  icon: "line-chart",

  query: {
    crm_retention: [
      {
        start: null,
        stop: null,
        model: null,
        period: null,
        active: null,
        size: null,
        last_start_time: null,
      },
    ],
  },
  allowCreate: false,
  changes: false,
  retention: true,
});
