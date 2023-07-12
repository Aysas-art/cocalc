/*

The subscriptions look like this in the database:

[
  {
    id: 1,
    account_id: "8e138678-9264-431c-8dc6-5c4f6efe66d8",
    created: "2023-07-03T03:40:51.798Z",
    cost: 5.4288,
    interval: "month",
    current_period_start: "2023-07-02T07:00:00.000Z",
    current_period_end: "2023-08-03T06:59:59.999Z",
    latest_purchase_id: 220,
    status: "active",
    metadata: {
      type: "license",
      license_id: "a3e17422-8f09-48d4-bc34-32f0bdc77f73",
    },
  },
];
*/

import {
  Alert,
  Button,
  Collapse,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  getSubscriptions as getSubscriptionsUsingApi,
  cancelSubscription,
  resumeSubscription,
  renewSubscription,
} from "./api";
import type { Subscription } from "@cocalc/util/db-schema/subscriptions";
import { STATUS_TO_COLOR } from "@cocalc/util/db-schema/subscriptions";
import { SettingBox } from "@cocalc/frontend/components/setting-box";
import { TimeAgo } from "@cocalc/frontend/components/time-ago";
import { Icon } from "@cocalc/frontend/components/icon";
import { currency } from "./util";
import { capitalize } from "@cocalc/util/misc";
import { SiteLicensePublicInfo } from "@cocalc/frontend/site-licenses/site-license-public-info-component";
import { webapp_client } from "@cocalc/frontend/webapp-client";

function SubscriptionStatus({ status }) {
  return (
    <Tag color={STATUS_TO_COLOR[status]}>
      {capitalize(status.replace("_", " "))}
    </Tag>
  );
}

function SubscriptionActions({ id, status, refresh, cost }) {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const handleCancel = async (now: boolean = false) => {
    try {
      setLoading(true);
      setError("");
      await cancelSubscription({ subscription_id: id, now });
      refresh();
    } catch (error) {
      setError(`${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setLoading(true);
      setError("");
      await resumeSubscription(id);
      refresh();
    } catch (error) {
      setError(`${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubscription = async () => {
    try {
      setLoading(true);
      setError("");
      try {
        await renewSubscription(id);
      } catch (_) {
        await webapp_client.purchases_client.quotaModal({
          service: "edit-license",
          cost,
        });
        await renewSubscription(id);
      }
      refresh();
    } catch (error) {
      setError(`${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical">
      {loading && <Spin />}
      {error && !loading && (
        <Alert
          type="error"
          description={error}
          style={{ marginBottom: "15px" }}
          closable
          onClose={() => setError("")}
        />
      )}
      {(status === "unpaid" || status === "past_due") && (
        <Popconfirm
          title={
            <div style={{ maxWidth: "450px" }}>
              Are you sure you want to pay for the next month of this
              subscription? The corresponding license will be renewed and your
              balance will be reduced by the subscription amount.
            </div>
          }
          onConfirm={handleRenewSubscription}
          okText="Yes"
          cancelText="No"
        >
          <Button disabled={loading} type="primary">
            Pay Now
          </Button>
        </Popconfirm>
      )}
      {status !== "canceled" && (
        <Button
          disabled={loading}
          type="default"
          onClick={() => setModalVisible(true)}
        >
          Cancel...
        </Button>
      )}
      {status !== "canceled" && modalVisible && (
        <Modal
          title="Cancel Subscription"
          visible={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={[
            <Button key="nothing" onClick={() => setModalVisible(false)}>
              Make No Change
            </Button>,
            <Button key="cancelNow" onClick={() => handleCancel(true)}>
              Cancel Now
            </Button>,
            <Button
              key="cancelEnd"
              type="primary"
              onClick={() => handleCancel(false)}
            >
              Cancel at Period End
            </Button>,
          ]}
        >
          <div style={{ maxWidth: "450px" }}>
            Are you sure you want to cancel this subscription? The corresponding
            license will not be renewed.
            <ul style={{ margin: "15px 0" }}>
              <li>
                Select "Cancel at Period End" to let your license continue to
                the end of the current period.
              </li>
              <li>
                To receive a prorated credit for the remainder of this license,
                select "Cancel Now". You can spend your credit on another
                license, pay-as-you-go project upgrades, etc.
              </li>
              <li>You can always resume a canceled subscription later.</li>
            </ul>
          </div>
        </Modal>
      )}
      {status == "canceled" && (
        <Popconfirm
          title={
            <div style={{ maxWidth: "450px" }}>
              Are you sure you want to resume this subscription? The
              corresponding license will become active again.
            </div>
          }
          onConfirm={handleResume}
          okText="Yes"
          cancelText="No"
        >
          <Button disabled={loading} type="default">
            Resume
          </Button>
        </Popconfirm>
      )}
    </Space>
  );
}
function LicenseDescription({ license_id }) {
  return (
    <Collapse>
      <Collapse.Panel
        key="license"
        header={`Subscription for the license ${license_id}`}
      >
        <SiteLicensePublicInfo license_id={license_id} />
      </Collapse.Panel>
    </Collapse>
  );
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const getSubscriptions = async () => {
    try {
      setLoading(true);
      setError("");
      // [ ] TODO: pager, which is only needed if one user has more than 100 subscriptions...
      setSubscriptions(await getSubscriptionsUsingApi({ limit: 100 }));
    } catch (err) {
      setError(`${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getSubscriptions();
  }, []);

  const columns = useMemo(
    () => [
      {
        title: "Id",
        dataIndex: "id",
        key: "id",
      },
      {
        title: "Created",
        dataIndex: "created",
        key: "created",
        render: (date) => <TimeAgo date={date} />,
      },
      {
        title: "Cost per Period",
        dataIndex: "cost",
        key: "cost",
        render: (cost) => currency(cost),
      },
      {
        title: "Period",
        dataIndex: "interval",
        key: "interval",
        render: (interval) => {
          if (interval == "month") {
            return "Monthly";
          } else if (interval == "year") {
            return "Yearly";
          } else {
            return interval;
          }
        },
      },
      {
        width: "20%",
        title: "Current Period",
        key: "period",
        render: (_, record) => {
          return (
            <>
              <TimeAgo date={record.current_period_start} /> to{" "}
              <TimeAgo date={record.current_period_end} />
            </>
          );
        },
      },
      {
        title: "Last Transaction Id",
        dataIndex: "latest_purchase_id",
        key: "latest_purchase_id",
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => <SubscriptionStatus status={status} />,
      },
      {
        title: "Action",
        key: "action",
        render: (_, { status, cost, id }) => (
          <SubscriptionActions
            id={id}
            status={status}
            refresh={getSubscriptions}
            cost={cost}
          />
        ),
      },
      {
        width: "40%",
        title: "Description",
        key: "desc",
        render: (_, { metadata }) => {
          if (metadata.type == "license" && metadata.license_id) {
            return <LicenseDescription license_id={metadata.license_id} />;
          }
          return <>{JSON.stringify(metadata, undefined, 2)}</>;
        },
      },
    ],
    []
  );

  return (
    <SettingBox
      title={
        <>
          <Icon name="calendar" /> Subscriptions
          <Button
            style={{ marginRight: "15px", float: "right" }}
            onClick={() => {
              getSubscriptions();
            }}
          >
            <Icon name="refresh" /> Refresh
          </Button>
        </>
      }
    >
      {error && (
        <Alert
          type="error"
          description={error}
          style={{ marginBottom: "15px" }}
        />
      )}
      {loading ? (
        <Spin />
      ) : (
        <div style={{ overflow: "auto", width: "100%" }}>
          <Table
            rowKey={"id"}
            pagination={{ hideOnSinglePage: true, defaultPageSize: 10 }}
            dataSource={subscriptions ?? undefined}
            columns={columns}
          />
        </div>
      )}
    </SettingBox>
  );
}
