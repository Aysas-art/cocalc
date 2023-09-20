/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Alert, Button, Input } from "antd";
import { useEffect, useState } from "react";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";

import { Icon } from "@cocalc/frontend/components/icon";
import Contact from "components/landing/contact";
import Logo from "components/logo";
import { CSS } from "components/misc";
import A from "components/misc/A";
import apiPost from "lib/api/post";
import useCustomize from "lib/use-customize";
import { LOGIN_STYLE } from "./shared";
import SSO, { RequiredSSO, useRequiredSSO } from "./sso";

export const BODY_STYLE: CSS = { margin: "30px", minHeight: "50vh" };

interface Props {
  minimal?: boolean;
  onSuccess?: () => void; // if given, call after sign in *succeeds*.
}

export default function SignIn(props: Props) {
  const { reCaptchaKey } = useCustomize();

  const body = <SignIn0 {...props} />;
  if (reCaptchaKey == null) {
    return body;
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={reCaptchaKey}>
      {body}
    </GoogleReCaptchaProvider>
  );
}

function SignIn0(props: Props) {
  const { minimal = false, onSuccess } = props;
  const { anonymousSignup, reCaptchaKey, siteName, strategies } =
    useCustomize();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [haveSSO, setHaveSSO] = useState<boolean>(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  useEffect(() => {
    setHaveSSO(strategies != null && strategies.length > 0);
  }, []);

  // based on email: if user has to sign up via SSO, this will tell which strategy to use.
  const requiredSSO = useRequiredSSO(strategies, email);

  async function signIn() {
    if (signingIn) return;
    setError("");
    try {
      setSigningIn(true);

      let reCaptchaToken: undefined | string;
      if (reCaptchaKey) {
        if (!executeRecaptcha) {
          throw Error("Please wait a few seconds, then try again.");
        }
        reCaptchaToken = await executeRecaptcha("signin");
      }

      await apiPost("/auth/sign-in", {
        email,
        password,
        reCaptchaToken,
      });
      onSuccess?.();
    } catch (err) {
      setError(`${err}`);
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div style={BODY_STYLE}>
      {!minimal && (
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <Logo
            type="icon"
            style={{ width: "100px", height: "100px", marginBottom: "15px" }}
            priority={true}
          />
          <h1>Sign In to {siteName}</h1>
        </div>
      )}

      <div style={LOGIN_STYLE}>
        <div style={{ margin: "10px 0" }}>
          {strategies == null
            ? "Sign in"
            : haveSSO
            ? requiredSSO != null
              ? "Sign in using your single sign-on provider"
              : "Sign in using your email address or a single sign-on provider."
            : "Sign in using your email address."}
        </div>
        <form>
          {haveSSO && (
            <div
              style={{
                textAlign: "center",
                margin: "20px 0",
                display: requiredSSO == null ? "inherit" : "none",
              }}
            >
              <SSO
                size={email ? 24 : undefined}
                style={
                  email
                    ? { textAlign: "right", marginBottom: "20px" }
                    : undefined
                }
              />
            </div>
          )}
          <Input
            autoFocus
            style={{ fontSize: "12pt" }}
            placeholder="Email address"
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
          />

          <RequiredSSO strategy={requiredSSO} />
          {/* Don't remove password input, since that messes up autofill. Hide for forced SSO. */}
          <div
            style={{
              marginTop: "30px",
              display: requiredSSO == null ? "inherit" : "none",
            }}
          >
            <p>Password </p>
            <Input.Password
              style={{ fontSize: "12pt" }}
              autoComplete="current-password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              onPressEnter={(e) => {
                e.preventDefault();
                signIn();
              }}
            />
          </div>
          {email && requiredSSO == null && (
            <Button
              disabled={signingIn || !(password?.length >= 6)}
              shape="round"
              size="large"
              type="primary"
              style={{ width: "100%", marginTop: "20px" }}
              onClick={signIn}
            >
              {signingIn ? (
                <>
                  <Icon name="spinner" spin /> Signing In...
                </>
              ) : !password || password.length < 6 ? (
                "Enter your password above."
              ) : (
                "Sign In"
              )}
            </Button>
          )}
        </form>
        {error && (
          <>
            <Alert
              style={{ marginTop: "20px" }}
              message="Error"
              description={
                <>
                  <p>
                    <b>{error}</b>
                  </p>
                  <p>
                    If you can't remember your password,{" "}
                    <A href="/auth/password-reset">reset it</A>. If that doesn't
                    work <Contact />.
                  </p>
                </>
              }
              type="error"
              showIcon
            />
            <div
              style={{
                textAlign: "center",
                marginTop: "15px",
                fontSize: "14pt",
              }}
            >
              <A href="/auth/password-reset">Forgot password?</A>
            </div>
          </>
        )}
      </div>

      {!minimal && (
        <div
          style={{
            ...LOGIN_STYLE,
            backgroundColor: "white",
            margin: "30px auto",
            padding: "15px",
          }}
        >
          New to {siteName}? <A href="/auth/sign-up">Sign Up</A>
          {anonymousSignup && (
            <div style={{ marginTop: "15px" }}>
              Don't want to provide any information?
              <br />
              <A href="/auth/try">
                Try {siteName} without creating an account.
              </A>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
