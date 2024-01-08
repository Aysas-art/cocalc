import { Button, Popover } from "antd";
import { Icon } from "@cocalc/frontend/components/icon";
import { CSSProperties, useRef, useState } from "react";
import SiteName from "components/share/site-name";
import A from "components/misc/A";
import { trunc_middle } from "@cocalc/util/misc";

interface Props {
  src: string;
  appURL?: string;
  path?: string;
  style?: CSSProperties;
  fullscreen?: boolean;
  description?: string;
  start?: boolean; // if true, immediately load iframe rather than waiting for user to click a button.
}

export default function IFrame({
  src: src0,
  appURL,
  path,
  style,
  fullscreen: fullscreen0,
  start: start0,
  description,
}: Props) {
  const [fullscreen, setFullscreen] = useState<boolean>(!!fullscreen0);
  const [reload, setReload] = useState<number>(0);
  const iframeRef = useRef<any>(null);
  const [start, setStart] = useState<boolean>(!!start0);

  const url = new URL("http://example.com" + src0);
  url.search += (url.search ? "&" : "") + `reload=${reload}`;
  const src = url.pathname + url.search + url.hash;

  return (
    <div
      style={
        fullscreen
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 1000,
              background: "white",
            }
          : {
              padding: "5px 15px",
              height: start ? "95vh" : undefined,
              border: "1px solid #ddd",
              borderRadius: "5px",
              boxShadow: "5px 5px 5px #eee",
              display: "flex",
              flexDirection: "column",
              background: "white",
              ...style,
            }
      }
    >
      <div>
        {start && (
          <div style={{ display: "flex" }}>
            <Button
              title="Reload this"
              size="small"
              type="text"
              onClick={() => {
                setReload(reload + 1);
                //iframeRef.current?.contentWindow.location.reload();
              }}
            >
              <Icon name={"reload"} />
            </Button>
            <div
              style={{
                flex: 1,
                textAlign: "center",
                paddingTop: "2.5px",
                paddingLeft: fullscreen ? "15px" : undefined,
              }}
            >
              {appURL && (
                <Popover
                  title="Open in the App"
                  content={
                    <div style={{ maxWidth: "350px" }}>
                      Open {path} in the <SiteName /> app for more options and
                      to see your other files...
                    </div>
                  }
                >
                  <A href={appURL} external>
                    <Icon name="external-link" style={{ marginRight: "5px" }} />
                    {path ? trunc_middle(path, 50) : ""}
                  </A>
                </Popover>
              )}
            </div>
            <Button
              size="small"
              type="text"
              title="Full screen"
              onClick={() => {
                if (!fullscreen) {
                  document.documentElement.requestFullscreen();
                } else {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  }
                }
                setFullscreen(!fullscreen);
              }}
            >
              <Icon name={fullscreen ? "compress" : "expand"} />
            </Button>
          </div>
        )}
      </div>
      {start && <hr style={{ width: "100%" }} />}
      {!start ? (
        <Button
          style={{ margin: "15px auto" }}
          size="large"
          type="primary"
          shape="round"
          onClick={() => setStart(true)}
        >
          <span style={{ marginRight: "10px" }}>
            <Icon name={"run"} />{" "}
          </span>{" "}
          Load {description ?? "Editor"}...
        </Button>
      ) : (
        <iframe
          ref={iframeRef}
          src={src}
          width={"100%"}
          height={"100%"}
          frameBorder="0"
        />
      )}
    </div>
  );
}
