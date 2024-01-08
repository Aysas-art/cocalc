/* Setting the name of a public share. */

import { useEffect, useState } from "react";
import { Alert, Button, Input, Space } from "antd";
import { redux, useTypedRedux } from "@cocalc/frontend/app-framework";
import { client_db } from "@cocalc/util/schema";
import { Icon } from "@cocalc/frontend/components/icon";

interface Props {
  project_id: string;
  path: string;
  saveRedirect: (string) => void;
  disabled?: boolean;
}

export default function ConfigureName({
  project_id,
  path,
  saveRedirect,
  disabled,
}: Props) {
  const public_paths = useTypedRedux({ project_id }, "public_paths");
  const id = client_db.sha1(project_id, path);

  const [name, setName] = useState<string>(
    (public_paths?.getIn([id, "name"]) ?? "") as any,
  );
  const [redirect, setRedirect] = useState<string>(
    (public_paths?.getIn([id, "redirect"]) ?? "") as any,
  );
  const [choosingName, setChoosingName] = useState<boolean>(!!name);
  const [choosingRedirect, setChoosingRedirect] = useState<boolean>(!!redirect);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const name = (public_paths?.getIn([id, "name"]) ?? "") as string;
    const redirect = (public_paths?.getIn([id, "redirect"]) ?? "") as string;
    setName(name);
    setChoosingName(!!name);
    setRedirect(redirect);
    setChoosingRedirect(!!redirect);
  }, [id]);

  async function save(e) {
    try {
      setSaving(true);
      setError("");
      const name = e.target.value;
      await redux.getProjectActions(project_id).setPublicPathName(path, name);
      setSaved(true);
    } catch (err) {
      setError(`${err}`);
    } finally {
      setSaving(false);
    }
  }

  // if user presses the Esc key, we set choosingName to false and don't save
  async function keyup(e) {
    if (e.key === "Escape") {
      setChoosingName(false);
    }
  }

  return (
    <div style={{ margin: "15px 0" }}>
      <div style={{ float: "right" }}>
        {name
          ? "This name will be used to provide a nicer URL. "
          : "Name this public path so that it has a memorable URL. "}
      </div>
      <h4>
        <Icon name="global" /> Name{name ? `: ${name}` : " - optional"}
      </h4>
      {!name && !choosingName ? (
        <Button onClick={() => setChoosingName(true)}>Choose a name...</Button>
      ) : (
        <div>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              allowClear
              disabled={disabled}
              onPressEnter={save}
              onKeyUp={keyup}
              onBlur={save}
              onChange={(e) => {
                if (e.target.value != name) {
                  setSaved(false);
                }
                setName(e.target.value);
              }}
              value={name}
              readOnly={saving}
            />
            <Button
              disabled={
                saving ||
                disabled ||
                public_paths?.getIn([id, "name"], "") == name
              }
              onClick={save}
            >
              Save
            </Button>
          </Space.Compact>
          {saving ? "Saving... " : ""}
          {saved ? "Saved. " : ""}
          {error && (
            <Alert style={{ margin: "15px 0" }} type="error" message={error} />
          )}
          {(name || choosingName) && (
            <div style={{ color: "#666", marginTop: "5px" }}>
              Edit the name of this shared path. The name can be up to 100
              letters, digits, dashes and periods, and must be unique in this
              project. For a nice URL, also set both the project name in Project
              Settings <b>and</b> the project owner's name in Account
              Preferences. (WARNING: If you change the name, existing public
              shared links using the previous name will break, so change with
              caution. Instead, create a new shared document and define a
              redirect below.)
            </div>
          )}
        </div>
      )}{" "}
      <h4>
        <Icon name="retweet" /> Redirect
      </h4>
      <div>
        {!redirect && !choosingRedirect ? (
          <Button onClick={() => setChoosingRedirect(true)}>
            Set redirect URL...
          </Button>
        ) : (
          <Space.Compact style={{ width: "100%" }}>
            <Input
              allowClear
              disabled={disabled}
              onChange={(e) => {
                setRedirect(e.target.value);
              }}
              value={redirect}
              readOnly={saving}
              onBlur={() => {
                saveRedirect(redirect);
              }}
            />
            <Button
              disabled={
                disabled || public_paths?.getIn([id, "redirect"]) == redirect
              }
              onClick={() => {
                saveRedirect(redirect);
              }}
            >
              Save
            </Button>
          </Space.Compact>
        )}
        {(redirect || choosingRedirect) && (
          <div style={{ color: "#666", marginTop: "5px" }}>
            If you move this content somewhere else, put the full URL here and
            when people visit this share, they will be redirected there. If the
            URL is to another publicly shared path then it will be automatic; if
            it is to an external site, the user will see a message with a link.
          </div>
        )}
      </div>
    </div>
  );
}
