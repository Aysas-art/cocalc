/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { IconName } from "@cocalc/frontend/components/icon";
import { Uptime } from "@cocalc/util/consts/site-license";
import { Typography } from "antd";
import A from "components/misc/A";
import { ReactNode } from "react";
const { Text } = Typography;

export type Presets =
  | "standard"
  //  | "student"
  | "student+"
  | "instructor"
  | "research"
  | "development";
//| "budget";

// Fields to be used to match a configured license against a pre-existing preset.
//
export const PRESET_MATCH_FIELDS: Record<string, string> = {
  cpu: "CPU count",
  disk: "disk space",
  ram: "memory",
  uptime: "idle timeout",
  member: "member hosting",
};

export interface Preset {
  icon?: IconName;
  name: string;
  descr: ReactNode;
  details?: ReactNode;
  cpu: number;
  ram: number;
  disk: number;
  uptime: Uptime;
  member: boolean;
}

type PresetEntries = {
  [key in Presets]: Preset;
};

// some constants to keep text and preset in sync
const STANDARD_CPU = 1;
const STANDARD_RAM = 4;
const LARGE_RAM = 8;
const STANDARD_DISK = 3;

const WARN_SELECT_NUMBER_PROJECTS = (
  <Text italic>
    Each student will work in their own project. Therefore, make sure to select
    the number of projects (the "Run Limit", above) to match your expected
    number of students!
  </Text>
);

const APPLY_LICENSE_COURSE_CONFIG = (
  <>
    To apply this license to all student projects, add it in the{" "}
    <A
      href={
        "https://doc.cocalc.com/teaching-upgrade-course.html#install-course-license"
      }
    >
      course configuration
    </A>
    .
  </>
);

export const PRESETS: PresetEntries = {
  standard: {
    icon: "line-chart",
    name: "Standard",
    descr: "is a good choice for most users and students to get started",
    details: (
      <>
        You can run two or three Jupyter Notebooks in the same project at the
        same time, given they do not require a large amount of memory. This
        quota is fine for editing LaTeX documents, working with Sage Worksheets,
        and all other document types. {STANDARD_DISK}G of disk space are also
        sufficient to store many files and a few small datasets.
      </>
    ),
    cpu: STANDARD_CPU,
    ram: STANDARD_RAM,
    disk: STANDARD_DISK,
    uptime: "short",
    member: true,
  },
  //   student: {
  //     icon: "meh",
  //     name: "Student",
  //     descr: "covers student projects in a course",
  //     details: (
  //       <>
  //         If you're teaching a course, this upgrade is suitable for{" "}
  //         <Text italic>student projects</Text>. The upgrade schema is the same as
  //         for "Standard" projects, which should be a good choice for doing their
  //         assignments. {WARN_SELECT_NUMBER_PROJECTS} Each student project will get
  //         the configured upgrades, internet access, and improved hosting quality.{" "}
  //         {APPLY_LICENSE_COURSE_CONFIG}
  //       </>
  //     ),
  //     cpu: STANDARD_CPU,
  //     ram: STANDARD_RAM,
  //     disk: STANDARD_DISK,
  //   },
  "student+": {
    icon: "smile",
    name: "Student+",
    descr: "covers student projects with extra resources",
    details: (
      <>
        This quota preset is very similar to the "Student" quota, although
        students are allowed a bit more ram and disk space.{" "}
        {WARN_SELECT_NUMBER_PROJECTS} The increased idle-timeout will keep their
        notebooks and worksheets running for a bit longer while not in active
        use. Choose this schema if you plan to let students run data and memory
        intensive calculations, e.g. data-science, machine-learning, etc.{" "}
        {APPLY_LICENSE_COURSE_CONFIG}
      </>
    ),
    cpu: 1,
    ram: STANDARD_RAM + 1,
    disk: 2 * STANDARD_DISK,
    uptime: "medium",
    member: true,
  },
  instructor: {
    icon: "highlighter",
    name: "Instructor",
    descr:
      "is a good choice for the instructor's project when teaching a course",
    details: (
      <>
        The upgrade schema is suitable for grading the work of students: by
        increasing the memory quota you can run many Jupyter Notebooks at the
        same time – still, make sure to use the{" "}
        <A
          href={
            "https://doc.cocalc.com/jupyter.html?highlight=halt%20button#use-the-halt-button-to-conserve-memory"
          }
        >
          Halt button
        </A>{" "}
        to avoid exceeding the quota. Regarding disk space, distributing and
        collecting files from many students adds up – hence the disk quota is
        increased significantly! Finally, a longer idle-timeout will allow you
        to make longer breaks without your project being shut down. You only
        need a license with a "Run Limit" of one for your instructor project.
        Apply that license via the{" "}
        <A href={"https://doc.cocalc.com/project-settings.html#licenses"}>
          project settings
        </A>
        , not the course configuration!
      </>
    ),
    cpu: 1,
    ram: 2 * STANDARD_RAM,
    disk: 15,
    uptime: "medium",
    member: true,
  },
  research: {
    icon: "rocket",
    name: "Researcher",
    descr: "is a good choice for a research group",
    details: (
      <>
        This configuration allows the project to run many Jupyter Notebooks and
        Worksheets at once or to run memory-intensive computations. An
        idle-timeout of one day is sufficient to not interrupt your work; you
        can also execute long-running calculations with this configuration.
        Increasing the disk space quota also allows you to store larger
        datasets. If you need{" "}
        <b>vastly more dedicated disk space, CPU or RAM</b>, you should instead{" "}
        <b>
          rent a{" "}
          <A href="https://doc.cocalc.com/compute_server.html">
            compute server
          </A>
          .
        </b>
      </>
    ),
    cpu: 1,
    ram: LARGE_RAM,
    disk: 10,
    uptime: "day",
    member: true,
  },
  development: {
    icon: "settings",
    name: "Development",
    descr: "is suitable for software development",
    details: (
      <>
        This configuration allows for parallelized build tasks across more than
        one CPU with an increased the amount of memory and disk space. If you
        need <b>vastly more dedicated disk space, CPU or RAM</b>, you should
        instead rent a{" "}
        <A href="https://doc.cocalc.com/compute_server.html">compute server</A>.
      </>
    ),
    cpu: 2,
    ram: LARGE_RAM,
    disk: 10,
    uptime: "medium",
    member: true,
  },
  /*budget: {
    icon: "wallet",
    name: "Budget",
    descr: "is the cheapest option",
    details: (
      <>
        Choose this option if you want to spend as little money as possible,
        while still getting access to the internet from within a project (to
        download packages, datasets, or interact with GitHub/GitLab). It also
        removes the{" "}
        <A href={"https://doc.cocalc.com/trial.html"}>trial project</A> banner.
      </>
    ),
    cpu: 1,
    ram: 1,
    disk: 3,
    member: false,
  },*/
} as const;
