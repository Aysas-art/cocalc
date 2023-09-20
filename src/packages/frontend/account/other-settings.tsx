/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Card, InputNumber } from "antd";
import { Map } from "immutable";

import { Checkbox, Panel } from "@cocalc/frontend/antd-bootstrap";
import { Component, Rendered, redux } from "@cocalc/frontend/app-framework";
import {
  A,
  Icon,
  LabeledRow,
  Loading,
  NumberInput,
  Paragraph,
  SelectorInput,
} from "@cocalc/frontend/components";
import { IS_MOBILE, IS_TOUCH } from "@cocalc/frontend/feature";
import { NewFilenameFamilies } from "@cocalc/frontend/project/utils";
import track from "@cocalc/frontend/user-tracking";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { DEFAULT_NEW_FILENAMES, NEW_FILENAMES } from "@cocalc/util/db-schema";
import {
  VBAR_EXPLANATION,
  VBAR_KEY,
  VBAR_OPTIONS,
  getValidVBAROption,
} from "../project/page/vbar";
import { dark_mode_mins, get_dark_mode_config } from "./dark-mode";
import Tours from "./tours";

interface Props {
  other_settings: Map<string, any>;
  is_stripe_customer: boolean;
  kucalc: string;
}

export class OtherSettings extends Component<Props> {
  private on_change(name: string, value: any): void {
    redux.getActions("account").set_other_settings(name, value);
  }

  private toggle_global_banner(val: boolean): void {
    if (val) {
      // this must be "null", not "undefined" – otherwise the data isn't stored in the DB.
      this.on_change("show_global_info2", null);
    } else {
      this.on_change("show_global_info2", webapp_client.server_time());
    }
  }

  //   private render_first_steps(): Rendered {
  //     if (this.props.kucalc !== KUCALC_COCALC_COM) return;
  //     return (
  //       <Checkbox
  //         checked={!!this.props.other_settings.get("first_steps")}
  //         onChange={(e) => this.on_change("first_steps", e.target.checked)}
  //       >
  //         Offer the First Steps guide
  //       </Checkbox>
  //     );
  //   }

  private render_global_banner(): Rendered {
    return (
      <Checkbox
        checked={!this.props.other_settings.get("show_global_info2")}
        onChange={(e) => this.toggle_global_banner(e.target.checked)}
      >
        <strong>Show announcement banner</strong>: only shows up if there is a
        message
      </Checkbox>
    );
  }

  private render_time_ago_absolute(): Rendered {
    return (
      <Checkbox
        checked={!!this.props.other_settings.get("time_ago_absolute")}
        onChange={(e) => this.on_change("time_ago_absolute", e.target.checked)}
      >
        Display <strong>timestamps as absolute points in time</strong> instead
        of relative to the current time
      </Checkbox>
    );
  }

  private render_confirm(): Rendered {
    if (!IS_MOBILE) {
      return (
        <Checkbox
          checked={!!this.props.other_settings.get("confirm_close")}
          onChange={(e) => this.on_change("confirm_close", e.target.checked)}
        >
          <strong>Confirm Close:</strong> always ask for confirmation before
          closing the browser window
        </Checkbox>
      );
    }
  }

  private render_katex(): Rendered {
    return (
      <Checkbox
        checked={!!this.props.other_settings.get("katex")}
        onChange={(e) => this.on_change("katex", e.target.checked)}
      >
        <strong>KaTeX:</strong> attempt to render formulas with{" "}
        <A href={"https://katex.org/"}>KaTeX</A> (much faster, but missing
        context menu options)
      </Checkbox>
    );
  }

  private render_standby_timeout(): Rendered {
    if (IS_TOUCH) {
      return;
    }
    return (
      <LabeledRow label="Standby timeout">
        <NumberInput
          on_change={(n) => this.on_change("standby_timeout_m", n)}
          min={1}
          max={180}
          unit="minutes"
          number={this.props.other_settings.get("standby_timeout_m")}
        />
      </LabeledRow>
    );
  }

  private render_mask_files(): Rendered {
    return (
      <Checkbox
        checked={!!this.props.other_settings.get("mask_files")}
        onChange={(e) => this.on_change("mask_files", e.target.checked)}
      >
        <strong>Mask files:</strong> grey out files in the files viewer that you
        probably do not want to open
      </Checkbox>
    );
  }

  private render_hide_project_popovers(): Rendered {
    return (
      <Checkbox
        checked={!!this.props.other_settings.get("hide_project_popovers")}
        onChange={(e) =>
          this.on_change("hide_project_popovers", e.target.checked)
        }
      >
        <strong>Hide Project Tab Popovers:</strong> do not show the popovers
        over the project tabs
      </Checkbox>
    );
  }

  private render_hide_file_popovers(): Rendered {
    return (
      <Checkbox
        checked={!!this.props.other_settings.get("hide_file_popovers")}
        onChange={(e) => this.on_change("hide_file_popovers", e.target.checked)}
      >
        <strong>Hide File Tab Popovers:</strong> do not show the popovers over
        file tabs
      </Checkbox>
    );
  }

  private render_hide_button_tooltips(): Rendered {
    return (
      <Checkbox
        checked={!!this.props.other_settings.get("hide_button_tooltips")}
        onChange={(e) =>
          this.on_change("hide_button_tooltips", e.target.checked)
        }
      >
        <strong>Hide Button Tooltips:</strong> hides some button tooltips (this
        is only partial)
      </Checkbox>
    );
  }

  private render_default_file_sort(): Rendered {
    return (
      <LabeledRow label="Default file sort">
        <SelectorInput
          selected={this.props.other_settings.get("default_file_sort")}
          options={{ time: "Sort by time", name: "Sort by name" }}
          on_change={(value) => this.on_change("default_file_sort", value)}
        />
      </LabeledRow>
    );
  }

  private render_new_filenames(): Rendered {
    const selected =
      this.props.other_settings.get(NEW_FILENAMES) ?? DEFAULT_NEW_FILENAMES;
    return (
      <LabeledRow label="Generated filenames">
        <SelectorInput
          selected={selected}
          options={NewFilenameFamilies}
          on_change={(value) => this.on_change(NEW_FILENAMES, value)}
        />
      </LabeledRow>
    );
  }

  private render_page_size(): Rendered {
    return (
      <LabeledRow label="Number of files per page">
        <NumberInput
          on_change={(n) => this.on_change("page_size", n)}
          min={1}
          max={10000}
          number={this.props.other_settings.get("page_size")}
        />
      </LabeledRow>
    );
  }

  private render_no_free_warnings(): Rendered {
    let extra;
    if (!this.props.is_stripe_customer) {
      extra = <span>(only available to customers)</span>;
    } else {
      extra = <span>(thanks for being a customer)</span>;
    }
    return (
      <Checkbox
        disabled={!this.props.is_stripe_customer}
        checked={!!this.props.other_settings.get("no_free_warnings")}
        onChange={(e) => this.on_change("no_free_warnings", e.target.checked)}
      >
        Hide free warnings: do{" "}
        <b>
          <i>not</i>
        </b>{" "}
        show a warning banner when using a free trial project {extra}
      </Checkbox>
    );
  }

  private render_dark_mode(): Rendered {
    const checked = !!this.props.other_settings.get("dark_mode");
    const config = get_dark_mode_config(this.props.other_settings.toJS());
    const label_style = { width: "100px", display: "inline-block" } as const;
    return (
      <div>
        <Checkbox
          checked={checked}
          onChange={(e) => this.on_change("dark_mode", e.target.checked)}
          style={{
            color: "rgba(229, 224, 216)",
            backgroundColor: "rgb(36, 37, 37)",
            marginLeft: "-5px",
            padding: "5px",
            borderRadius: "3px",
          }}
        >
          Dark mode: reduce eye strain by showing a dark background (via{" "}
          <A
            style={{ color: "#e96c4d", fontWeight: 700 }}
            href="https://darkreader.org/"
          >
            DARK READER
          </A>
          )
        </Checkbox>
        {checked && (
          <Card size="small" title="Dark Mode Configuration">
            <span style={label_style}>Brightness</span>
            <InputNumber
              min={dark_mode_mins.brightness}
              max={100}
              value={config.brightness}
              onChange={(x) => this.on_change("dark_mode_brightness", x)}
            />
            <br />
            <span style={label_style}>Contrast</span>
            <InputNumber
              min={dark_mode_mins.contrast}
              max={100}
              value={config.contrast}
              onChange={(x) => this.on_change("dark_mode_contrast", x)}
            />
            <br />
            <span style={label_style}>Sepia</span>
            <InputNumber
              min={dark_mode_mins.sepia}
              max={100}
              value={config.sepia}
              onChange={(x) => this.on_change("dark_mode_sepia", x)}
            />
            <br />
            <span style={label_style}>Grayscale</span>
            <InputNumber
              min={dark_mode_mins.grayscale}
              max={100}
              value={config.grayscale}
              onChange={(x) => this.on_change("dark_mode_grayscale", x)}
            />
          </Card>
        )}
      </div>
    );
  }

  render_vertical_fixed_bar_options(): Rendered {
    const selected = getValidVBAROption(
      this.props.other_settings.get(VBAR_KEY)
    );
    return (
      <LabeledRow label="Vertical Project Bar">
        <div>
          <SelectorInput
            style={{ marginBottom: "10px" }}
            selected={selected}
            options={VBAR_OPTIONS}
            on_change={(value) => {
              this.on_change(VBAR_KEY, value);
              track("flyout", { aspect: "layout", how: "account", value });
            }}
          />
          <Paragraph
            type="secondary"
            ellipsis={{ expandable: true, symbol: "more" }}
          >
            {VBAR_EXPLANATION}
          </Paragraph>
        </div>
      </LabeledRow>
    );
  }

  render() {
    if (this.props.other_settings == null) {
      return <Loading />;
    }
    return (
      <Panel
        header={
          <>
            <Icon name="gear" /> Other
          </>
        }
      >
        {this.render_dark_mode()}
        {this.render_confirm()}
        {this.render_katex()}
        {this.render_time_ago_absolute()}
        {this.render_global_banner()}
        {this.render_mask_files()}
        {this.render_hide_project_popovers()}
        {this.render_hide_file_popovers()}
        {this.render_hide_button_tooltips()}
        {this.render_no_free_warnings()}
        {redux.getStore("customize").get("openai_enabled") && (
          <Checkbox
            checked={!!this.props.other_settings.get("openai_disabled")}
            onChange={(e) => {
              this.on_change("openai_disabled", e.target.checked);
              redux.getStore("projects").clearOpenAICache();
            }}
          >
            <strong>Disable all OpenAI/ChatGPT integrations</strong>, e.g.,
            extra buttons in Jupyter, @chatgpt mentions, etc.
          </Checkbox>
        )}
        <Checkbox
          checked={!!this.props.other_settings.get("disable_markdown_codebar")}
          onChange={(e) => {
            this.on_change("disable_markdown_codebar", e.target.checked);
          }}
        >
          <strong>Disable the markdown code bar</strong> in all markdown
          documents. Checking this hides the extra run, copy, and explain
          buttons in fenced code blocks.
        </Checkbox>
        {this.render_vertical_fixed_bar_options()}
        {this.render_new_filenames()}
        {this.render_default_file_sort()}
        {this.render_page_size()}
        {this.render_standby_timeout()}
        <div style={{ height: "10px" }} />
        <Tours />
      </Panel>
    );
  }
}
