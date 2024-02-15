import type {
  Architecture,
  State,
  Configuration,
  Images,
  GoogleCloudImages,
} from "@cocalc/util/db-schema/compute-servers";
import { makeValidGoogleName } from "@cocalc/util/db-schema/compute-servers";
import { Alert, Select, Spin } from "antd";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Icon, Markdown } from "@cocalc/frontend/components";
import { A } from "@cocalc/frontend/components/A";
import { field_cmp } from "@cocalc/util/misc";
import { useImages } from "./images-hook";
import SelectVersion from "./select-version";
import Advanced from "./advanced";

interface Props {
  setConfig;
  configuration: Configuration;
  disabled?: boolean;
  state?: State;
  style?: CSSProperties;
  // if explicitly set, only gpu images shown when
  // gpu true, and only non-gpu when false.
  gpu: boolean;
  // if googleImages is set, use this to restrict list of images to only
  // what is actually available in non-advanced view, and to enhance the
  // view otherwise (explicitly saying images aren't actually available)
  googleImages?: GoogleCloudImages;
  arch: Architecture;
}

export default function SelectImage({
  setConfig,
  configuration,
  disabled,
  state = "deprovisioned",
  style,
  gpu,
  googleImages,
  arch,
}: Props) {
  const [advanced, setAdvanced] = useState<boolean>(false);
  const [IMAGES, ImagesError] = useImages();
  const [value, setValue] = useState<string | undefined>(configuration.image);
  useEffect(() => {
    setValue(configuration.image);
  }, [configuration.image]);
  // [ ] TODO: MAYBE we should allow gpu/non-gpu options in
  // all cases, but just suggest one or the other?
  const options = useMemo(() => {
    if (IMAGES == null || typeof IMAGES == "string") {
      return [];
    }
    return getOptions({
      IMAGES,
      googleImages,
      gpu,
      advanced,
      value,
      selectedTag: configuration.tag,
      arch,
    });
  }, [IMAGES, gpu, advanced, value, configuration.tag]);

  if (IMAGES == null) {
    return <Spin />;
  }
  if (ImagesError != null) {
    return ImagesError;
  }
  const filterOption = (input: string, option?: { search: string }) =>
    (option?.search ?? "").includes(input.toLowerCase());

  return (
    <div>
      <Advanced
        advanced={advanced}
        setAdvanced={setAdvanced}
        style={{ float: "right", marginTop: "10px" }}
        title={
          "Show possibly untested, old, missing, or broken images and versions."
        }
      />
      <Select
        size="large"
        disabled={disabled || state != "deprovisioned"}
        placeholder="Select compute server image..."
        defaultOpen={!value && state == "deprovisioned"}
        value={value}
        style={style}
        options={options}
        onChange={(val) => {
          setValue(val);
          const x: any = { image: val };
          for (const option of options) {
            if (option.value == val) {
              x.tag = option.tag;
              break;
            }
          }
          setConfig(x);
        }}
        showSearch
        filterOption={filterOption}
      />
      {advanced && IMAGES != null && typeof IMAGES != "string" && value && (
        <SelectVersion
          style={{ margin: "10px 0" }}
          disabled={disabled || state != "deprovisioned"}
          image={value}
          IMAGES={IMAGES}
          setConfig={setConfig}
          configuration={configuration}
        />
      )}
    </div>
  );
}

function getOptions({
  IMAGES,
  advanced,
  googleImages,
  gpu,
  value,
  selectedTag,
  arch,
}: {
  IMAGES: Images;
  advanced?: boolean;
  gpu?: boolean;
  value?: string;
  selectedTag?: string;
  googleImages?: GoogleCloudImages;
  arch: Architecture;
}) {
  const options: {
    key: string;
    tag: string;
    priority: number;
    value: string;
    search: string;
    label: JSX.Element;
  }[] = [];
  for (const name in IMAGES) {
    const image = IMAGES[name];
    let { label, icon, versions, priority = 0 } = image;
    if (image.system) {
      continue;
    }
    if (image.disabled && !advanced) {
      continue;
    }
    if (gpu != null && gpu != image.gpu) {
      continue;
    }
    if (!advanced) {
      // restrict to only tested versions.
      versions = versions.filter((x) => x.tested);

      if (googleImages != null) {
        const x = googleImages[name];
        // on google cloud, so make sure image is built and tested
        versions = versions.filter(
          (y) =>
            x[`${makeValidGoogleName(y.tag)}-${makeValidGoogleName(arch)}`]
              ?.tested,
        );
      }
    }
    if (versions.length == 0) {
      // no available versions, so no point in showing this option
      continue;
    }
    let tag;
    let versionLabel: string | undefined = undefined;
    if (selectedTag && name == value) {
      tag = selectedTag;
      for (const x of versions) {
        if (x.tag == tag) {
          versionLabel = x.label ?? tag;
          break;
        }
      }
    } else {
      tag = versions[versions.length - 1]?.tag;
      versionLabel = versions[versions.length - 1]?.label ?? tag;
    }

    let extra = "";
    if (advanced && googleImages != null) {
      const img =
        googleImages[name]?.[
          `${makeValidGoogleName(tag)}-${makeValidGoogleName(arch)}`
        ];
      if (!img) {
        extra = " (no image)";
      } else {
        const tested = img?.tested;
        if (!tested) {
          extra = " (not tested)";
        }
      }
    }

    options.push({
      key: name,
      value: name,
      priority,
      search: label?.toLowerCase() ?? "",
      tag,
      label: (
        <div style={{ fontSize: "12pt" }}>
          <div style={{ float: "right" }}>{versionLabel}</div>
          <Icon name={icon} style={{ marginRight: "5px" }} /> {label}
          {image.disabled && <> (disabled)</>}
          {extra}
        </div>
      ),
    });
  }
  options.sort(field_cmp("priority")).reverse();
  return options;
}

export function ImageLinks({ image, style }: { image; style? }) {
  const [IMAGES, ImagesError] = useImages();
  if (IMAGES == null) {
    return <Spin />;
  }
  if (typeof IMAGES == "string") {
    return ImagesError;
  }
  const data = IMAGES[image];
  if (data == null) {
    return null;
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        marginTop: "10px",
        height: "90px", // so not squished vertically
        ...style,
      }}
    >
      <A style={{ flex: 1 }} href={data.url}>
        <Icon name="external-link" /> {data.label}
      </A>
      <A style={{ flex: 1 }} href={data.source}>
        <Icon name="github" /> Source
      </A>
      <A style={{ flex: 1 }} href={packageNameToUrl(data.package)}>
        <Icon name="docker" /> dockerhub
      </A>
    </div>
  );
}

// this is a heuristic but is probably right in many cases, and
// right now the only case is n<=1, where it is right.
function packageNameToUrl(name: string): string {
  const n = name.split("/").length - 1;
  if (n <= 1) {
    return `https://hub.docker.com/r/${name}`;
  } else {
    // e.g., us-docker.pkg.dev/colab-images/public/runtime
    return `https://${name}`;
  }
}

export function DisplayImage({
  configuration,
}: {
  configuration: { image: string };
}) {
  const [IMAGES, ImagesError] = useImages();
  if (IMAGES == null) {
    return <Spin />;
  }
  if (ImagesError != null) {
    return ImagesError;
  }
  const { image } = configuration ?? {};
  if (image == null) return null;
  const data = IMAGES[image];
  if (data == null) {
    return <span>{image}</span>;
  }
  return (
    <span>
      <Icon name={data.icon} style={{ marginRight: "5px" }} /> {data.label}
    </span>
  );
}

export function ImageDescription({
  configuration,
}: {
  configuration: { image: string };
}) {
  const [IMAGES, ImagesError] = useImages();
  if (IMAGES == null) {
    return <Spin />;
  }
  if (typeof IMAGES == "string") {
    return ImagesError;
  }
  return (
    <Alert
      style={{ padding: "7.5px 15px", marginTop: "10px" }}
      type="info"
      description={
        <Markdown
          value={IMAGES[configuration?.image ?? ""]?.description ?? ""}
        />
      }
    />
  );
}
