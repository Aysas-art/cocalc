/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
The Landing Page
*/

import { Alert, Col, Row } from "@cocalc/frontend/antd-bootstrap";
import {
  Component,
  rclass,
  Rendered,
  rtypes,
  TypedMap,
} from "@cocalc/frontend/app-framework";
import { APP_ICON_WHITE, APP_LOGO_NAME_WHITE } from "@cocalc/frontend/art";
import {
  ComputeImages,
  launchcode2display,
} from "@cocalc/frontend/custom-software/init";
import { NAME as ComputeImageStoreName } from "@cocalc/frontend/custom-software/util";
import { Footer, SiteDescription } from "@cocalc/frontend/customize";
import { appBasePath } from "@cocalc/frontend/customize/app-base-path";
import {
  LaunchTypes,
  launch_action_description,
  NAME as LAUNCH_ACTIONS_NAME,
} from "@cocalc/frontend/launch/actions";
import { capitalize } from "@cocalc/util/misc";
import { COLORS } from "@cocalc/util/theme";
import { PassportStrategyFrontend } from "@cocalc/util/types/passport-types";
import * as immutable from "immutable";
import { join } from "path";
import { A, UNIT } from "../components";
import { QueryParams } from "../misc/query-params";
import { Connecting } from "./connecting";
import { SignIn } from "./sign-in";

const DESC_FONT = "sans-serif";

interface Props {
  strategies?: immutable.List<TypedMap<PassportStrategyFrontend>>;
  exclusive_sso_domains?: Set<string>;
  sign_in_error?: string;
  signing_in?: boolean;
  token?: boolean;
  remember_me?: boolean;
  has_remember_me?: boolean;
  has_account?: boolean;
}

interface reduxProps {
  get_api_key?: string;

  site_name?: string;
  is_commercial?: boolean;
  _is_configured?: boolean;
  logo_square?: string;
  logo_rectangular?: string;
  help_email?: string;
  terms_of_service?: string;
  terms_of_service_url?: string;
  email_signup?: boolean;

  sign_in_email_address?: string;

  type?: LaunchTypes;
  launch?: string;
  images?: ComputeImages;
}

interface State {
  show_terms: boolean;
}

class LandingPage extends Component<Props & reduxProps, State> {
  constructor(props) {
    super(props);
    const show_terms =
      props.terms_of_service?.length > 0 ||
      props.terms_of_service_url?.length > 0;
    this.state = {
      show_terms,
    };
  }

  static reduxProps() {
    return {
      page: {
        get_api_key: rtypes.string,
      },
      customize: {
        site_name: rtypes.bool,
        is_commercial: rtypes.bool,
        _is_configured: rtypes.bool,
        logo_square: rtypes.string,
        logo_rectangular: rtypes.string,
        help_email: rtypes.string,
        terms_of_service: rtypes.string,
        terms_of_service_url: rtypes.string,
        email_signup: rtypes.bool,
      },
      account: {
        sign_in_email_address: rtypes.string,
      },
      [LAUNCH_ACTIONS_NAME]: {
        type: rtypes.string,
        launch: rtypes.string,
      },
      [ComputeImageStoreName]: {
        images: rtypes.immutable,
      },
    };
  }


  private render_forgot_password(): Rendered {
    return (
      <a href={join(appBasePath, "/auth/password-reset")}>Forgot Password?</a>
    );
  }

  private render_launch_action(): Rendered {
    if (
      this.props.type == null ||
      this.props.launch == null ||
      this.props.images == null
    ) {
      return;
    }
    const descr = launch_action_description(this.props.type);
    if (descr == null) return;
    let message;
    let bsStyle: "info" | "danger" = "info";

    if (this.props.type == "csi") {
      const display = launchcode2display(this.props.images, this.props.launch);

      if (display == null) {
        bsStyle = "danger";
        message = (
          <>
            Custom Software Image <code>{this.props.launch}</code> does not
            exist!
          </>
        );
      } else {
        message = (
          <>
            {descr} "{display}"
          </>
        );
      }
    } else {
      message = (
        <>
          {descr}: <code>{this.props.launch}</code>
        </>
      );
    }

    return (
      <Row style={{ marginBottom: "20px", textAlign: "center" }}>
        <Alert bsStyle={bsStyle} banner={true} style={{ width: "100%" }}>
          <b>Launch action:</b> {message}
        </Alert>
      </Row>
    );
  }

  private render_main_page(): Rendered {
    let main_row_style;
    if (
      (this.props.remember_me || QueryParams.get("auth_token")) &&
      !this.props.get_api_key
    ) {
      // Just assume user will be signing in.
      return <Connecting />;
    }

    const img_icon = !!this.props.logo_square
      ? this.props.logo_square
      : APP_ICON_WHITE;
    const img_name = !!this.props.logo_rectangular
      ? this.props.logo_rectangular
      : APP_LOGO_NAME_WHITE;
    const customized =
      !!this.props.logo_square && !!this.props.logo_rectangular;

    const topbar = {
      img_icon,
      img_name,
      customized,
      img_opacity: 1.0,
      color: customized ? COLORS.GRAY_D : "white",
      bg_color: customized ? COLORS.BLUE_LLL : COLORS.LANDING.LOGIN_BAR_BG,
      border: `5px solid ${COLORS.LANDING.LOGIN_BAR_BG}`,
    };

    main_row_style = {
      fontSize: UNIT,
      backgroundColor: COLORS.LANDING.LOGIN_BAR_BG,
      padding: 5,
      margin: 0,
      borderRadius: 4,
    };

    return (
      <div style={{ margin: UNIT }}>
        {this.render_launch_action()}
        {this.render_forgot_password()}
        <Row style={main_row_style} className={"visible-xs"}>
          <SignIn
            get_api_key={this.props.get_api_key}
            signing_in={this.props.signing_in}
            sign_in_error={this.props.sign_in_error}
            has_account={this.props.has_account}
            xs={true}
            strategies={this.props.strategies}
            color={topbar.color}
          />
          <div style={{ clear: "both" }}></div>
        </Row>
        <Row
          style={{
            backgroundColor: topbar.bg_color,
            border: topbar.border,
            padding: 5,
            margin: 0,
            marginBottom: 20,
            borderRadius: 5,
            position: "relative",
            whiteSpace: "nowrap",
            minHeight: 160,
          }}
          className="hidden-xs"
        >
          <div
            style={{
              width: 490,
              zIndex: 10,
              position: "absolute",
              top: UNIT,
              right: UNIT,
              fontSize: "11pt",
              float: "right",
            }}
          >
            <SignIn
              get_api_key={this.props.get_api_key}
              signing_in={this.props.signing_in}
              sign_in_error={this.props.sign_in_error}
              has_account={this.props.has_account}
              xs={false}
              strategies={this.props.strategies}
              color={topbar.color}
            />
          </div>
          {this.props._is_configured ? (
            <div
              style={{
                display: "inline-block",
                backgroundImage: `url('${topbar.img_icon}')`,
                backgroundSize: "contain",
                height: 75,
                width: 75,
                margin: 5,
                verticalAlign: "center",
                backgroundRepeat: "no-repeat",
              }}
            ></div>
          ) : undefined}

          {!topbar.customized ? (
            <div
              className="hidden-sm"
              style={{
                display: "inline-block",
                fontFamily: DESC_FONT,
                fontSize: "28px",
                top: UNIT,
                left: UNIT * 7,
                width: 300,
                height: 75,
                position: "absolute",
                color: topbar.color,
                opacity: topbar.img_opacity,
                backgroundImage: `url('${topbar.img_name}')`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
              }}
            ></div>
          ) : undefined}
          {topbar.customized ? (
            <img
              className="hidden-sm"
              src={topbar.img_name}
              style={{
                display: "inline-block",
                top: UNIT,
                left: UNIT * 7,
                width: "auto",
                height: 50,
                position: "absolute",
                color: topbar.color,
                opacity: topbar.img_opacity,
              }}
            />
          ) : undefined}

          <div className="hidden-sm">
            <SiteDescription
              style={{
                fontWeight: 700,
                fontSize: "15px",
                fontFamily: "sans-serif",
                bottom: 10,
                left: UNIT * 7,
                display: "inline-block",
                position: "absolute",
                color: topbar.color,
              }}
            />
          </div>
        </Row>
        {!this.props.get_api_key && (
          <Row
            style={{
              color: COLORS.GRAY,
              fontSize: "16pt",
              margin: "150px 0",
              textAlign: "center",
            }}
          >
            <Col sm={12}>
              <a href={join(appBasePath, "/auth/sign-up")}>
                Create a new account
              </a>{" "}
              or{" "}
              <a href={join(appBasePath, "/auth/sign-in")}>
                sign in with an existing account
              </a>
              .
            </Col>
          </Row>
        )}
        <Footer />
      </div>
    );
  }

  public render(): Rendered {
    const main_page = this.render_main_page();
    if (!this.props.get_api_key) {
      return main_page;
    }
    const app = capitalize(this.props.get_api_key);
    return (
      <div>
        <div style={{ padding: "15px" }}>
          <h1>CoCalc API Key Access for {app}</h1>
          <div style={{ fontSize: "12pt", color: "#444" }}>
            {app} would like your CoCalc API key.
            <br />
            <br />
            Sign in below to grant <b>full access</b> to all of your CoCalc
            projects to {app}, until you explicitly revoke your API key in
            Account preferences.
            <br />
            <br />
            If necessary, please{" "}
            <A href={join(appBasePath, "/auth/sign-up")}>
              create a new account
            </A>{" "}
            then revisit this page and sign in here.
          </div>
        </div>
        <hr />
        {main_page}
      </div>
    );
  }
}

const tmp = rclass(LandingPage);
export { tmp as LandingPage };
