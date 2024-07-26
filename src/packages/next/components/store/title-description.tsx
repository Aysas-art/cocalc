/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Divider, Form, Input } from "antd";

export function TitleDescription({ form, showExplanations, disabled = false }) {
  return (
    <>
      <Divider plain>Customizable Descriptors</Divider>
      <Form.Item
        label="Title"
        name="title"
        style={{ width: "100%" }}
        extra={
          showExplanations ? (
            <p>
              Given your license a title makes it easier to keep track of. You
              can change it at any time.
            </p>
          ) : undefined
        }
      >
        <Input
          disabled={disabled}
          placeholder="Enter the title of your license (optional)"
          value={form.getFieldValue("title")}
          onChange={(e) => {
            form.setFieldValue({ title: e.target.value });
          }}
        />
      </Form.Item>
      <Form.Item
        label="Description"
        name="description"
        extra={
          showExplanations ? (
            <p>
              Given your license a longer description to record extra
              information that isn't always shown with the license. You can
              change this at any time.
            </p>
          ) : undefined
        }
      >
        <Input.TextArea
          disabled={disabled}
          placeholder="Describe your license (optional)"
          rows={2}
          value={form.getFieldValue("description")}
          onChange={(e) => {
            form.setFieldValue({ description: e.target.value });
          }}
        />
      </Form.Item>
    </>
  );
}
