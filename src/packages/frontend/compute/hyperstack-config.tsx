import type {
  State,
  HyperstackConfiguration,
} from "@cocalc/util/db-schema/compute-servers";
import { Divider, Select, Spin } from "antd";
import { getHyperstackPriceData, setServerConfiguration } from "./api";
import { useEffect, useMemo, useState } from "react";
import SelectImage, { ImageDescription, ImageLinks } from "./select-image";
import ExcludeFromSync from "./exclude-from-sync";
import ShowError from "@cocalc/frontend/components/error";
import Ephemeral from "./ephemeral";
import { SELECTOR_WIDTH } from "./google-cloud-config";
import Proxy from "./proxy";
import { useImages } from "./images-hook";
import type { HyperstackPriceData } from "@cocalc/util/compute/cloud/hyperstack/pricing";
import { GPU_SPECS } from "@cocalc/util/compute/gpu-specs";
import { currency } from "@cocalc/util/misc";
import { field_cmp } from "@cocalc/util/misc";

interface Props {
  configuration: HyperstackConfiguration;
  editable?: boolean;
  // if id not set, then doesn't try to save anything to the backend
  id?: number;
  project_id: string;
  // called whenever changes are made.
  onChange?: (configuration: HyperstackConfiguration) => void;
  disabled?: boolean;
  state?: State;
  data?;
}

export default function HyperstackConfig({
  configuration: configuration0,
  editable,
  id,
  project_id,
  onChange,
  disabled,
  state,
  data,
}: Props) {
  const [priceData, setPriceData] = useState<HyperstackPriceData | null>(null);
  const [IMAGES, ImagesError] = useImages();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [configuration, setLocalConfiguration] =
    useState<HyperstackConfiguration>(configuration0);

  useEffect(() => {
    if (!editable) {
      setLocalConfiguration(configuration0);
    }
  }, [configuration0]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getHyperstackPriceData();
        setPriceData(data);
      } catch (err) {
        setError(`${err}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setConfig = async (changes) => {
    try {
      const newConfiguration = { ...configuration, ...changes };
      setLoading(true);
      if (onChange != null) {
        onChange(newConfiguration);
      }
      setLocalConfiguration(newConfiguration);
      if (id != null) {
        await setServerConfiguration({ id, configuration: changes });
      }
    } catch (err) {
      setError(`${err}`);
    } finally {
      setLoading(false);
    }
  };

  if (!editable || !project_id) {
    return (
      <div>
        {configuration0.flavor_name} in {configuration0.region_name}
      </div>
    );
  }

  if (ImagesError != null) {
    return ImagesError;
  }

  return (
    <div style={{ marginBottom: "30px" }}>
      <div style={{ color: "#666", marginBottom: "10px" }}>
        <div style={{ marginBottom: "5px" }}>
          <b>NVIDIA GPU's</b>
          <br />
          Select up to 8 GPU's for your compute server. Your selection also
          determines the number of CPUs, RAM and disk of the underlying VM.
        </div>
        <MachineType
          setConfig={setConfig}
          configuration={configuration}
          state={state}
          disabled={disabled}
          priceData={priceData}
        />
      </div>
      <Image
        state={state}
        disabled={loading || disabled}
        setConfig={setConfig}
        configuration={configuration}
      />
      <ShowError error={error} setError={setError} />
      <Divider />
      <Proxy
        id={id}
        project_id={project_id}
        setConfig={setConfig}
        configuration={configuration}
        data={data}
        state={state}
        IMAGES={IMAGES}
      />
      {loading && <Spin style={{ marginLeft: "15px" }} />}
    </div>
  );
}

function gpuToLabel(gpu) {
  if (gpu.endsWith("-sm")) {
    return gpu.slice(0, -3);
  }
  return gpu;
}

function MachineType({ disabled, setConfig, configuration, state, priceData }) {
  if (!priceData) {
    return <Spin />;
  }
  const options = priceData
    .filter((x) => x.available)
    .sort(field_cmp("cost_per_hour"))
    .map((x) => {
      return {
        label: `${x.gpu_count}x ${gpuToLabel(x.gpu)} - ${currency(
          x.cost_per_hour,
        )}/hour`,
        value: `${x.region_name}|${x.flavor_name}`,
      };
    });
  const value = `${configuration.region_name}|${configuration.flavor_name}`;
  return (
    <div>
      <Select
        disabled={disabled || (state ?? "deprovisioned") != "deprovisioned"}
        style={{ width: SELECTOR_WIDTH }}
        value={value}
        options={options}
        onChange={(type) => {
          const [region_name, flavor_name] = type.split("|");
          setConfig({ region_name, flavor_name });
        }}
      />
      <Specs flavor_name={configuration.flavor_name} priceData={priceData} />
    </div>
  );
}

function Specs({ flavor_name, priceData }) {
  const data = useMemo(() => {
    for (const x of priceData) {
      if (x.flavor_name == flavor_name) {
        return x;
      }
    }
    return null;
  }, [flavor_name, priceData]);
  if (data == null) {
    return null;
  }
  const gpuSpec = GPU_SPECS[gpuToLabel(data.gpu)];
  return <pre>{JSON.stringify({ ...gpuSpec, ...data }, undefined, 2)}</pre>;
}

function Image(props) {
  const { state = "deprovisioned" } = props;
  return (
    <div>
      <div style={{ color: "#666", marginBottom: "5px" }}>
        <b>Image</b>
      </div>
      {(state == "deprovisioned" || state == "off") && (
        <div style={{ color: "#666", marginBottom: "5px" }}>
          Select compute server image. You will be able to use sudo with no
          password and can easily install anything into the Ubuntu Linux image.
          Click "advanced" for more options, which may be less tested or take
          MUCH longer to start up the first time, depending on image size.
        </div>
      )}
      <SelectImage {...props} gpu={true} arch={"x86_64"} maxDockerSizeGb={2} />
      <div style={{ color: "#666", marginTop: "5px" }}>
        <ImageDescription configuration={props.configuration} />
        <ImageLinks
          image={props.configuration.image}
          style={{ flexDirection: "row" }}
        />
        {!(state == "deprovisioned" || state == "off") && (
          <div style={{ color: "#666", marginTop: "5px" }}>
            You can only edit the image when server is deprovisioned or off.
          </div>
        )}
      </div>
      <ExcludeFromSync {...props} />
      <Divider />
      <Ephemeral style={{ marginTop: "30px" }} {...props} />
    </div>
  );
}
