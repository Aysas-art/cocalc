import type { ReactNode } from "react";
import { currency, round2, round3, round4 } from "@cocalc/util/misc";
import { Tooltip, Statistic } from "antd";
import { zIndexTip } from "./zindex";

interface Props {
  value: number;
  title: ReactNode;
  costPerMonth?: number;
}
export default function MoneyStatistic({ value, title, costPerMonth }: Props) {
  let body;
  if (value >= 0.0095) {
    body = (
      <Statistic
        title={<>{title} (USD)</>}
        value={round2(value)}
        precision={2}
        prefix={"$"}
      />
    );
  } else if (Math.abs(value) <= 0.0001) {
    body = (
      <Statistic
        title={<>{title} (USD)</>}
        value={0}
        precision={0}
        prefix={"$"}
      />
    );
  } else {
    body = (
      <Statistic
        title={<>{title} (USD)</>}
        value={round3(value)}
        precision={3}
        prefix={"$"}
      />
    );
  }

  return (
    <Tooltip
      mouseEnterDelay={0.5}
      zIndex={zIndexTip}
      title={() => (
        <>
          {title} (USD): ${round4(value)}
          {costPerMonth ? (
            <>
              <br /> Cost per month (USD): {currency(costPerMonth)}
            </>
          ) : (
            ""
          )}
        </>
      )}
    >
      {body}
    </Tooltip>
  );
}
