/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Alert, Button, Checkbox, Input } from "antd";
import { CSSProperties, useEffect, useRef, useState } from "react";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";

import Markdown from "@cocalc/frontend/editors/slate/static-markdown";
import {
  is_valid_email_address as isValidEmailAddress,
  len,
} from "@cocalc/util/misc";
import { Strategy } from "@cocalc/util/types/sso";
import A from "components/misc/A";
import Loading from "components/share/loading";
import apiPost from "lib/api/post";
import useCustomize from "lib/use-customize";
import SSO, { RequiredSSO, useRequiredSSO } from "./sso";
import AuthPageContainer from "./fragments/auth-page-container";

const LINE: CSSProperties = { margin: "15px 0" } as const;

interface SignUpProps {
  minimal?: boolean; // use a minimal interface with less explanation and instructions (e.g., for embedding in other pages)
  requiresToken?: boolean; // will be determined by API call if not given.
  onSuccess?: (opts?: {}) => void; // if given, call after sign up *succeeds*.
  has_site_license?: boolean;
  publicPathId?: string;
  showSignIn?: boolean;
  signInAction?: () => void; // if given, replaces the default sign-in link behavior.
}

export default function SignUp(props: SignUpProps) {
  const { reCaptchaKey } = useCustomize();

  const body = <SignUp0 {...props} />;
  if (reCaptchaKey == null) {
    return body;
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={reCaptchaKey}>
      {body}
    </GoogleReCaptchaProvider>
  );
}

function SignUp0({
  requiresToken,
  minimal,
  onSuccess,
  has_site_license,
  publicPathId,
  signInAction,
  showSignIn,
}: SignUpProps) {
  const {
    anonymousSignup,
    anonymousSignupLicensedShares,
    siteName,
    emailSignup,
    accountCreationInstructions,
    reCaptchaKey,
  } = useCustomize();
  const [email, setEmail] = useState<string>("");
  const [registrationToken, setRegistrationToken] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [signingUp, setSigningUp] = useState<boolean>(false);
  const [issues, setIssues] = useState<{
    email?: string;
    password?: string;
    error?: string;
    registrationToken?: string;
    reCaptcha?: string;
  }>({});

  const submittable = useRef<boolean>(false);
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { strategies } = useCustomize();

  // Sometimes the user if this component knows requiresToken and sometimes they don't.
  // If they don't, we have to make an API call to figure it out.
  const [requiresToken2, setRequiresToken2] = useState<boolean | undefined>(
    requiresToken,
  );

  useEffect(() => {
    if (requiresToken2 === undefined) {
      (async () => {
        try {
          setRequiresToken2(await apiPost("/auth/requires-token"));
        } catch (err) {}
      })();
    }
  }, []);

  // based on email: if user has to sign up via SSO, this will tell which strategy to use.
  const requiredSSO = useRequiredSSO(strategies, email);

  if (requiresToken2 === undefined || strategies == null) {
    return <Loading />;
  }

  submittable.current = !!(
    requiredSSO == null &&
    (!requiresToken2 || registrationToken) &&
    email &&
    isValidEmailAddress(email) &&
    password &&
    firstName?.trim() &&
    lastName?.trim()
  );

  async function signUp() {
    if (signingUp) return;
    setIssues({});
    try {
      setSigningUp(true);

      let reCaptchaToken: undefined | string;
      if (reCaptchaKey) {
        if (!executeRecaptcha) {
          throw Error("Please wait a few seconds, then try again.");
        }
        reCaptchaToken = await executeRecaptcha("signup");
      }

      const result = await apiPost("/auth/sign-up", {
        terms: true,
        email,
        password,
        firstName,
        lastName,
        registrationToken,
        reCaptchaToken,
        publicPathId,
      });
      if (result.issues && len(result.issues) > 0) {
        setIssues(result.issues);
      } else {
        onSuccess?.({});
      }
    } catch (err) {
      setIssues({ error: `${err}` });
    } finally {
      setSigningUp(false);
    }
  }

  if (!emailSignup && strategies.length == 0) {
    return (
      <Alert
        style={{ margin: "30px 15%" }}
        type="error"
        showIcon
        message={"No Account Creation Allowed"}
        description={
          <div style={{ fontSize: "14pt", marginTop: "20px" }}>
            <b>
              There is no method enabled for creating an account on this server.
            </b>
            {(anonymousSignup ||
              (anonymousSignupLicensedShares && has_site_license)) && (
              <>
                <br />
                <br />
                However, you can still{" "}
                <A href="/auth/try">
                  try {siteName} without creating an account.
                </A>
              </>
            )}
          </div>
        }
      />
    );
  }

  function renderFooter() {
    return (!minimal || showSignIn) && (
      <>
        <div>
          Already have an account? {
            signInAction
              ? <a onClick={signInAction}>Sign In</a>
              : <A href="/auth/sign-in">Sign In</A>
          } {anonymousSignup && (
            <>
              or <A href="/auth/try"> try {siteName} without creating an account. </A>
            </>
          )}
        </div>
      </>
    );
  }

  function renderError() {
    return issues.error && (
      <Alert style={LINE} type="error" showIcon message={issues.error}/>
    );
  }

  function renderSubtitle() {
    return <>
      <h4 style={{ color: "#666", marginBottom: "35px" }}>
        Start collaborating for free today.
      </h4>
      {accountCreationInstructions && (
        <Markdown value={accountCreationInstructions}/>
      )}
    </>;
  }

  return (
    <AuthPageContainer
      error={renderError()}
      footer={renderFooter()}
      subtitle={renderSubtitle()}
      minimal={minimal}
      title={`Create a free account with ${siteName}`}
    >
      <div>
        By creating an account, you agree to the{" "}
        <A external={true} href="/policies/terms">
          Terms of Service
        </A>
        .
      </div>
      <form>
        {issues.reCaptcha && (
          <Alert
            style={LINE}
            type="error"
            showIcon
            message={issues.reCaptcha}
            description={<>You may have to contact the site administrator.</>}
          />
        )}

        {issues.registrationToken && (
          <Alert
            style={LINE}
            type="error"
            showIcon
            message={issues.registrationToken}
            description={
              <>
                You may have to contact the site administrator for a
                registration token.
              </>
            }
          />
        )}
        {requiresToken2 && (
          <div style={LINE}>
            <p>Registration Token</p>
            <Input
              style={{ fontSize: "12pt" }}
              value={registrationToken}
              placeholder="Enter your secret registration token"
              onChange={(e) => setRegistrationToken(e.target.value)}
            />
          </div>
        )}
        <EmailOrSSO
          email={email}
          setEmail={setEmail}
          signUp={signUp}
          strategies={strategies}
          hideSSO={requiredSSO != null}
        />
        <RequiredSSO strategy={requiredSSO}/>
        {issues.email && (
          <Alert
            style={LINE}
            type="error"
            showIcon
            message={issues.email}
            description={
              <>
                Choose a different email address,{" "}
                <A href="/auth/sign-in">sign in</A>, or{" "}
                <A href="/auth/password-reset">reset your password</A>.
              </>
            }
          />
        )}
        {requiredSSO == null && (
          <div style={LINE}>
            <p>Password</p>
            <Input.Password
              style={{ fontSize: "12pt" }}
              value={password}
              placeholder="Password"
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              onPressEnter={signUp}
            />
          </div>
        )}
        {issues.password && (
          <Alert style={LINE} type="error" showIcon message={issues.email}/>
        )}
        {requiredSSO == null && (
          <div style={LINE}>
            <p>First name (Given name)</p>
            <Input
              style={{ fontSize: "12pt" }}
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onPressEnter={signUp}
            />
          </div>
        )}
        {requiredSSO == null && (
          <div style={LINE}>
            <p>Last name (Family name)</p>
            <Input
              style={{ fontSize: "12pt" }}
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onPressEnter={signUp}
            />
          </div>
        )}
      </form>
      <div style={LINE}>
        <Button
          shape="round"
          size="large"
          disabled={!submittable.current || signingUp}
          type="primary"
          style={{ width: "100%", marginTop: "15px" }}
          onClick={signUp}
        >
          {requiresToken2 && !registrationToken
            ? "Enter the secret registration token"
            : !email
              ? "How will you sign in?"
              : requiredSSO != null
                ? "You must sign up via SSO"
                : !password || password.length < 6
                  ? "Choose password with at least 6 characters"
                  : !firstName?.trim()
                    ? "Enter your first name above"
                    : !lastName?.trim()
                      ? "Enter your last name above"
                      : !isValidEmailAddress(email)
                        ? "Enter a valid email address above"
                        : signingUp
                          ? ""
                          : "Sign Up!"}
          {signingUp && (
            <span style={{ marginLeft: "15px" }}>
              <Loading>Signing Up...</Loading>
            </span>
          )}
        </Button>
      </div>
    </AuthPageContainer>
  );
}

interface EmailOrSSOProps {
  email: string;
  setEmail: (email: string) => void;
  signUp: () => void;
  strategies?: Strategy[];
  hideSSO?: boolean;
}

function EmailOrSSO(props: EmailOrSSOProps) {
  const { email, setEmail, signUp, strategies = [], hideSSO = false } = props;
  const { emailSignup } = useCustomize();

  function renderSSO() {
    if (strategies.length == 0) return;

    const emailStyle: CSSProperties = email
      ? { textAlign: "right", marginBottom: "20px" }
      : {};

    const style: CSSProperties = {
      display: hideSSO ? "none" : "block",
      ...emailStyle,
    };

    return (
      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <SSO size={email ? 24 : undefined} style={style} />
      </div>
    );
  }

  return (
    <div>
      <div>
        <p style={{ color: "#444", marginTop: "10px" }}>
          {hideSSO
            ? "Sign up using your single sign-on provider"
            : strategies.length > 0 && emailSignup
            ? "Sign up using either your email address or a single sign-on provider."
            : emailSignup
            ? "Enter the email address you will use to sign in."
            : "Sign up using a single sign-on provider."}
        </p>
      </div>
      {renderSSO()}
      {emailSignup && (
        <p>
          <Input
            style={{ fontSize: "12pt" }}
            placeholder="Email address"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onPressEnter={signUp}
          />
        </p>
      )}
    </div>
  );
}

export function TermsCheckbox({
  checked,
  onChange,
  style,
}: {
  checked?: boolean;
  onChange?: (boolean) => void;
  style?: CSSProperties;
}) {
  return (
    <Checkbox
      checked={checked}
      style={style}
      onChange={(e) => onChange?.(e.target.checked)}
    >
      I agree to the{" "}
      <A external={true} href="/policies/terms">
        Terms of Service
      </A>
      .
    </Checkbox>
  );
}
