import { COLORS } from "@cocalc/util/theme";
import { Paragraph } from "components/misc";
import A from "components/misc/A";
import { MAX_WIDTH } from "lib/config";
import { useCustomize } from "lib/customize";

export default function BannerWithLinks() {
  const { siteName } = useCustomize();
  return (
    <div style={{ backgroundColor: COLORS.YELL_LL }}>
      <Paragraph
        style={{
          fontSize: "12pt",
          margin: "0 auto",
          padding: "10px",
          textAlign: "center",
          maxWidth: MAX_WIDTH,
        }}
      >
        {siteName} is used in{" "}
        <A href="https://link.springer.com/article/10.1007/s11538-022-00999-4">
          large in-person courses at UCLA
        </A>
        , by{" "}
        <A href="https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/jfm-notebooks">
          Cambridge's books and journals
        </A>
        , is embedded in{" "}
        <A href="https://www.yields.io/">
          Yields.io's risk management platform,
        </A>{" "}
        and{" "}
        <A href="/features/openai-chatgpt">
          features extensive ChatGPT integration
        </A>
        . Browse <A href="/share/public_paths/page/1">public files</A>{" "}
        and <A href="/info/status">usage stats</A>.
      </Paragraph>
    </div>
  );
}
