/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Button, Layout } from "antd";

import { Icon, IconName } from "@cocalc/frontend/components/icon";
import { AVG_MONTH_DAYS } from "@cocalc/util/consts/billing";
import { DOC_CLOUD_STORAGE_URL } from "@cocalc/util/consts/project";
import { PRICES } from "@cocalc/util/upgrades/dedicated";
import { List } from "antd";
import Footer from "components/landing/footer";
import Head from "components/landing/head";
import Header from "components/landing/header";
import PricingItem, { Line } from "components/landing/pricing-item";
import { Paragraph, Text, Title } from "components/misc";
import A from "components/misc/A";
import { listedPrices } from "components/share/pricing";
import { MAX_WIDTH } from "lib/config";
import { Customize } from "lib/customize";
import withCustomize from "lib/with-customize";
import { useRouter } from "next/router";

interface Item {
  title: string;
  icon: IconName;
  disk?: number;
  ram?: number;
  cores?: number;
  price: number;
  iops?: string;
  mbps?: string;
}

const ICONS = [
  "battery-empty",
  "battery-quarter",
  "battery-half",
  "battery-full",
] as const;

const VMS = [
  PRICES.vms["n2-highmem-2"],
  PRICES.vms["n2-standard-4"],
  PRICES.vms["n2-highmem-8"],
  PRICES.vms["n2-standard-16"],
] as const;

const VM_CONFIGS: Item[] = ICONS.map((battery, idx) => {
  const vm = VMS[idx];
  if (vm == null) throw new Error("this should never happen");
  return {
    title: `Example ${idx + 1}`,
    icon: battery,
    ram: vm.spec.mem,
    cores: vm.spec.cpu,
    price: Math.round(vm.price_day * AVG_MONTH_DAYS),
  };
});

const disk_configs = [
  PRICES.disks["128-standard"],
  PRICES.disks["128-balanced"],
  PRICES.disks["128-ssd"],
] as const;

const DISK_CONFIGS: Item[] = ICONS.slice(1).map((battery, idx) => {
  const dc = disk_configs[idx];
  if (dc == null) throw new Error("this should never happen");
  return {
    title: dc.title,
    icon: battery,
    disk: dc.quota.dedicated_disk.size_gb,
    price: Math.round(AVG_MONTH_DAYS * dc.price_day),
    iops: dc.iops,
    mbps: dc.mbps,
  };
});

export default function Products({ customize }) {
  const { siteName } = customize;
  const router = useRouter();
  return (
    <Customize value={customize}>
      <Head title={`${siteName} – Dedicated virtual machines and disks`} />
      <Layout>
        <Header page="pricing" subPage="dedicated" />
        <Layout.Content style={{ backgroundColor: "white" }}>
          <div
            style={{
              maxWidth: MAX_WIDTH,
              margin: "15px auto",
              padding: "15px",
              backgroundColor: "white",
            }}
          >
            <Title level={1} style={{ textAlign: "center" }}>
              <Icon name="server" style={{ marginRight: "30px" }} /> Dedicated
              VMs and Disks
            </Title>
            <Title level={2}>
              <strong>Dedicated Virtual Machines</strong>
            </Title>
            <Paragraph>
              Upgrade one of your projects to run on a <b>Dedicated VM</b>. This
              is an additional node in {siteName}'s cluster, where resources are
              not shared with other projects. That machine can be <b>much</b>{" "}
              larger than any of our generic machines as well. This allows you
              to run much more intensive workloads with consistent performance,
              because the usual quota limitations do not apply. You can also
              rent additional disk space for faster additional storage.
            </Paragraph>
            <Paragraph>
              The list of dedicated VM options below are just examples. Visit
              the <A href={"/store/dedicated?type=vm"}>Dedicated VM Store</A> to
              see current options. Besides that, we can provide VM's with almost
              any configuration{" "}
              <A href="https://cloud.google.com/compute/docs/machine-types">
                that Google Cloud offers:
              </A>{" "}
              <b>up to 224 CPUs and 12 TB of RAM!</b>
            </Paragraph>
            <br />
            <List
              grid={{ gutter: 15, column: 4, xs: 1, sm: 1 }}
              dataSource={VM_CONFIGS}
              renderItem={(item) => (
                <PricingItem title={item.title} icon={item.icon}>
                  <Line amount={item.cores} desc="CPU" />
                  <Line amount={item.ram} desc="RAM" />
                  <br />
                  <br />
                  <Text strong style={{ fontSize: "18pt" }}>
                    ${item.price}/month
                  </Text>
                </PricingItem>
              )}
            />
            <Paragraph style={{ textAlign: "center" }}>
              <Button
                size={"large"}
                type={"primary"}
                onClick={() => router.push("/store/dedicated?type=vm")}
                icon={<Icon name="shopping-cart" />}
              >
                Order a VM license
              </Button>
            </Paragraph>

            <Title level={2} style={{ marginTop: "60px" }}>
              <strong>Dedicated Disks</strong>
            </Title>
            <Paragraph>
              A <strong>Dedicated Disk</strong> is an additional storage device
              mounted into your project. Their{" "}
              <A href="https://cloud.google.com/compute/docs/disks/performance">
                speed
              </A>{" "}
              ranges from traditional spinning disks with a rather slow number
              of operations per second up to fast SSD disks. You do not need to
              rent a Dedicated VM in order to subscribe to a Dedicated Disk.
            </Paragraph>
            <Paragraph>
              The list of dedicated disk options below are just exmples. Visit
              the{" "}
              <A href={"/store/dedicated?type=disk"}>Dedicated Disk store</A> to
              see available options. Usual disk sizes are{" "}
              <strong>64, 128 and 256 GB</strong>, but we could provide disks{" "}
              <A href="https://cloud.google.com/compute/docs/disks/performance">
                that GCP offers
              </A>{" "}
              with up to 64TB of disk space.
            </Paragraph>
            <Paragraph>
              <Text strong>Note:</Text> When the subscription ends, all data
              stored on such a disk will be deleted!
            </Paragraph>
            <List
              grid={{ gutter: 10, column: 3, xs: 1, sm: 1 }}
              dataSource={DISK_CONFIGS}
              renderItem={(item) => (
                <PricingItem title={item.title} icon={item.icon}>
                  <Line amount={item.disk} desc="Disk space" />
                  <Line amount={"regular"} desc="Snapshots" />
                  <Line amount={item.iops} desc="IOPS r/w" />
                  <Line amount={item.mbps} desc="MBps r/w" />
                  <br />
                  <br />
                  <Text strong style={{ fontSize: "18pt" }}>
                    ${item.price}/month
                  </Text>
                </PricingItem>
              )}
            />
            <Paragraph style={{ textAlign: "center" }}>
              <Button
                size={"large"}
                type={"primary"}
                onClick={() => router.push("/store/dedicated?type=disk")}
                icon={<Icon name="shopping-cart" />}
              >
                Subscribe for a dedicated disk
              </Button>
            </Paragraph>
            <Paragraph>
              <Icon name="info-circle" /> To ease data transfer, make sure to
              check out how to mount{" "}
              <A href={DOC_CLOUD_STORAGE_URL}>
                cloud storage or remote filesystems
              </A>{" "}
              into your project as well.
            </Paragraph>
            <hr style={{ marginTop: "60px" }} />
            {listedPrices()}
          </div>
          <Footer />
        </Layout.Content>
      </Layout>
    </Customize>
  );
}

export async function getServerSideProps(context) {
  return await withCustomize({ context });
}
