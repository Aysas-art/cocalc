/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { join } from "path";
import { appBasePath } from "@cocalc/frontend/customize/app-base-path";
import { Button, Col, Row } from "@cocalc/frontend/antd-bootstrap";
import { Markdown } from "@cocalc/frontend/components";
import { ErrorDisplay } from "@cocalc/frontend/components/error-display";
import { Passports } from "@cocalc/frontend/passports";
import { PassportStrategyFrontend } from "@cocalc/util/types/passport-types";
import { Input } from "antd";
import { List } from "immutable";
import {
  TypedMap,
  useActions,
  useEffect,
  useState,
} from "@cocalc/frontend/app-framework";

interface Props {
  sign_in_error?: string;
  signing_in?: boolean;
  has_account?: boolean;
  xs?: boolean; // extra small
  color: string;
  strategies?: List<TypedMap<PassportStrategyFrontend>>;
  get_api_key?: string;
}

export const SignIn: React.FC<Props> = (props) => {
  const page_actions = useActions("page");
  useEffect(() => {
    page_actions.set_sign_in_func(sign_in);
    return () => page_actions.remove_sign_in_func();
  }, []);

  const actions = useActions("account");

  const [email, set_email] = useState<string>("");
  const [password, set_password] = useState<string>("");

  // Just a quick check for whether submit button should be disabled
  // don't make too clever, since we want user to see errors.
  function sign_in(): void {
    actions.sign_in(email, password);
  }

  function render_error(): JSX.Element | undefined {
    if (!props.sign_in_error) return;
    return (
      <ErrorDisplay
        error_component={<Markdown value={props.sign_in_error} />}
        body_style={{ fontSize: "100%" }}
        onClose={() => actions.setState({ sign_in_error: undefined })}
      />
    );
  }

  function render_passports(): JSX.Element {
    return (
      <div>
        <Passports
          strategies={props.strategies}
          get_api_key={props.get_api_key}
          no_heading={true}
        />
      </div>
    );
  }

  function remove_error(): void {
    if (props.sign_in_error) {
      actions.setState({ sign_in_error: undefined });
    }
  }

  function forgot_font_size(): string {
    if (props.sign_in_error != null) {
      return "16pt";
    } else {
      return "12pt";
    }
  }

  function render_full_size(): JSX.Element {
    return (
      <div>
        <Row>
          <Col md={5} xs={12}>
            <Input
              style={{ width: "100%", marginBottom: "5px" }}
              value={email}
              type="email"
              name="email"
              placeholder="Email address"
              cocalc-test={"sign-in-email"}
              autoFocus={true}
              onChange={(e) => {
                const sign_in_email_address = e.target.value;
                set_email(sign_in_email_address);
                actions.setState({
                  sign_in_email_address, // so can be used by modal password reset dialog...
                  sign_in_error: undefined,
                });
              }}
            />
          </Col>
          <Col md={5} xs={12}>
            <Input.Password
              placeholder="Password"
              style={{ width: "100%", marginBottom: "5px" }}
              value={password}
              type="password"
              name="password"
              cocalc-test={"sign-in-password"}
              onChange={(e) => {
                set_password(e.target.value);
                remove_error();
              }}
              onKeyDown={(e) => {
                if (e.keyCode == 13) {
                  e.preventDefault();
                  sign_in();
                }
              }}
            />
          </Col>
          <Col md={2} xs={12}>
            <Button
              cocalc-test={"sign-in-submit"}
              style={{ height: 34 }}
              className="pull-right"
              onClick={sign_in}
            >
              Sign&nbsp;in
            </Button>
          </Col>
        </Row>
        <Row>
          <Col xs={7} xsOffset={5} style={{ paddingLeft: 15 }}>
            <div style={{ marginTop: "1ex" }}>
              <a
                style={{ fontSize: forgot_font_size(), color: "white" }}
                href={join(appBasePath, "/auth/password-reset")}
              >
                Forgot Password?
              </a>
            </div>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>{render_passports()}</Col>
        </Row>
        <Row
          className={"form-inline pull-right"}
          style={{ clear: "right", width: "100%" }}
        >
          <Col xs={12}>{render_error()}</Col>
        </Row>
      </div>
    );
  }

  return render_full_size();
  /*
  if (props.xs) {
    return render_extra_small();
  } else {
    return render_full_size();
  }
  */
};
