/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { fromJS, Map as immutableMap } from "immutable";

import { Actions } from "@cocalc/frontend/app-framework";
import type {
  HashtagState,
  SelectedHashtags,
} from "@cocalc/frontend/editors/task-editor/types";
import { open_new_tab } from "@cocalc/frontend/misc";
import { History as ChatGPTHistory } from "@cocalc/frontend/misc/openai";
import enableSearchEmbeddings from "@cocalc/frontend/search/embeddings";
import track from "@cocalc/frontend/user-tracking";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { SyncDB } from "@cocalc/sync/editor/db";
import type { Model } from "@cocalc/util/db-schema/openai";
import { cmp, parse_hashtags } from "@cocalc/util/misc";
import { getSortedDates } from "./chat-log";
import { message_to_markdown } from "./message";
import { ChatState, ChatStore } from "./store";
import { getSelectedHashtagsSearch } from "./utils";
import { isValidUUID, uuid } from "@cocalc/util/misc";

const MAX_CHATSTREAM = 10;

export class ChatActions extends Actions<ChatState> {
  public syncdb?: SyncDB;
  private store?: ChatStore;
  // We use this to ensure at most once chatgpt output is streaming
  // at a time in a given chatroom.  I saw a bug where hundreds started
  // at once and it really did send them all to openai at once, and
  // this prevents that at least.
  private chatStreams: Set<string> = new Set([]);

  public set_syncdb(syncdb: SyncDB, store: ChatStore): void {
    this.syncdb = syncdb;
    this.store = store;

    enableSearchEmbeddings({
      project_id: store.get("project_id")!,
      path: store.get("path")!,
      syncdb,
      transform: (elt) => {
        if (elt["event"] != "chat") return;
        return {
          date: elt["date"],
          content: elt["history"]?.[0]?.content,
          sender_id: elt["sender_id"],
        };
      },
      primaryKey: "date",
      textColumn: "content",
      metaColumns: ["sender_id"],
    });
  }

  public close(): void {
    this.syncdb?.close();
    delete this.syncdb;
  }

  private process_syncdb_obj(x) {
    if (x.event !== "chat") {
      // Event used to be used for video chat, etc...; but we have a better approach now, so
      // all events we care about are chat.
      return;
    }
    if (x.video_chat != null ? x.video_chat.is_video_chat : undefined) {
      // discard/ignore anything else related to the old old video chat approach
      return;
    }
    x.date = new Date(x.date);
    if ((x.history != null ? x.history.length : undefined) > 0) {
      // nontrivial history -- nothing to do
    } else if (x.payload != null) {
      // for old chats with payload: content (2014-2016)... plus the script @hsy wrote in the work project ;-(
      x.history = [];
      x.history.push({
        content: x.payload.content,
        author_id: x.sender_id,
        date: new Date(x.date),
      });
      delete x.payload;
    } else if (x.mesg != null) {
      // for old chats with mesg: content (up to 2014)
      x.history = [];
      x.history.push({
        content: x.mesg.content,
        author_id: x.sender_id,
        date: new Date(x.date),
      });
      delete x.mesg;
    }
    if (x.history == null) {
      x.history = [];
    }
    if (!x.editing) {
      x.editing = {};
    }
    return x;
  }

  // Initialize the state of the store from the contents of the syncdb.
  public init_from_syncdb(): void {
    if (this.syncdb == null) return;
    const v = {};
    for (let x of this.syncdb.get().toJS()) {
      x = this.process_syncdb_obj(x);
      if (x != null) {
        v[x.date.valueOf()] = x;
      }
    }

    this.setState({
      messages: fromJS(v) as any,
    });
  }

  public syncdb_change(changes): void {
    changes.map((obj) => {
      if (this.syncdb == null) return;
      obj = obj.toJS();
      if (obj.event == "draft") {
        let drafts = this.store?.get("drafts") ?? (fromJS({}) as any);
        // used to show that another user is editing a message.
        const record = this.syncdb.get_one(obj);
        if (record == null) {
          drafts = drafts.delete(obj.sender_id);
        } else {
          const sender_id = record.get("sender_id");
          drafts = drafts.set(sender_id, record);
        }
        this.setState({ drafts });
        return;
      }
      if (obj.event == "chat") {
        let changed: boolean = false;
        let messages = this.store?.get("messages") ?? (fromJS({}) as any);
        obj.date = new Date(obj.date);
        const record = this.syncdb.get_one(obj);
        let x: any = record?.toJS();
        if (x == null) {
          // delete
          messages = messages.delete(`${obj.date.valueOf()}`);
          changed = true;
        } else {
          x = this.process_syncdb_obj(x);
          if (x != null) {
            messages = messages.set(`${x.date.valueOf()}`, fromJS(x));
            changed = true;
          }
        }
        if (changed) {
          this.setState({ messages });
        }
      }
    });
  }

  // The second parameter is used for sending a message by
  // chatgpt, which is currently managed by the frontend
  // (not the project).  Also the async doesn't finish until
  // chatgpt is totally done.
  send_chat({
    input,
    sender_id,
    reply_to,
    tag,
    noNotification,
  }: {
    input?: string;
    sender_id?: string;
    reply_to?: Date;
    tag?: string;
    noNotification?: boolean;
  }): string {
    if (this.syncdb == null || this.store == null) {
      console.warn("attempt to send_chat before chat actions initialized");
      // WARNING: give an error or try again later?
      return "";
    }
    if (input == null) {
      input = this.store.get("input");
    }
    input = input.trim();
    if (input.length == 0 || this.store.get("is_uploading")) {
      // do not send while uploading or there is nothing to send.
      return "";
    }
    if (sender_id == null) {
      sender_id = this.redux.getStore("account").get_account_id();
    }
    const time_stamp = webapp_client.server_time().toISOString();
    const message = {
      sender_id,
      event: "chat",
      history: [{ author_id: sender_id, content: input, date: time_stamp }],
      date: time_stamp,
      reply_to: reply_to?.toISOString(),
    };
    this.syncdb.set(message);
    if (!reply_to) {
      this.delete_draft(0);
    }
    // NOTE: we also clear search, since it's confusing to send a message and not
    // even see it (if it doesn't match search).  We do NOT clear the hashtags though,
    // since by default the message you are sending has those tags.
    this.setState({
      input: "",
      search: "",
    });
    this.ensureDraftStartsWithHashtags(false);

    if (this.store) {
      const project_id = this.store.get("project_id");
      const path = this.store.get("path");
      // set notification saying that we sent an actual chat
      let action;
      if (
        noNotification ||
        mentionsChatGPT(input) ||
        this.isChatGPTThread(reply_to)
      ) {
        // Note: don't mark it is a chat if it is with chatgpt,
        // since no point in notifying all collabs of this.
        action = "edit";
      } else {
        action = "chat";
      }
      webapp_client.mark_file({
        project_id,
        path,
        action,
        ttl: 10000,
      });
      track("send_chat", { project_id, path });
    }
    this.save_to_disk();
    (async () => {
      await this.processChatGPT(fromJS(message), reply_to, tag);
    })();
    return time_stamp;
  }

  public set_editing(message, is_editing) {
    if (this.syncdb == null) {
      // WARNING: give an error or try again later?
      return;
    }
    const author_id = this.redux.getStore("account").get_account_id();

    // "FUTURE" = save edit changes
    const editing = message
      .get("editing")
      .set(author_id, is_editing ? "FUTURE" : null);

    // console.log("Currently Editing:", editing.toJS())
    this.syncdb.set({
      history: message.get("history").toJS(),
      editing: editing.toJS(),
      date: message.get("date").toISOString(),
    });
    // commit now so others users know this user is editing
    this.syncdb.commit();
  }

  // Used to edit sent messages.
  // TODO: this is **Extremely** shockingly inefficient; it assumes
  //       the number of edits is small.
  public send_edit(message, content) {
    if (this.syncdb == null) {
      // WARNING: give an error or try again later?
      return;
    }
    const author_id = this.redux.getStore("account").get_account_id();
    // OPTIMIZATION: send less data over the network?
    const date = webapp_client.server_time().toISOString();

    this.syncdb.set({
      history: [{ author_id, content, date }].concat(
        message.get("history").toJS()
      ),
      editing: message.get("editing").set(author_id, null).toJS(),
      date: message.get("date").toISOString(),
    });
    this.delete_draft(message.get("date")?.valueOf());
    this.save_to_disk();
  }

  send_reply({
    message,
    reply,
    from,
    noNotification,
  }: {
    message: string | immutableMap<string, any>;
    reply: string;
    from?: string;
    noNotification?: boolean;
  }): string {
    // the reply_to field of the message is *always* the root.
    // the order of the replies is by timestamp.  This is meant
    // to make sure chat is just 1 layer deep, rather than a
    // full tree structure, which is powerful but too confusing.
    const reply_to = getReplyToRoot(
      message,
      this.store?.get("messages") ?? fromJS({})
    );
    const time = reply_to?.valueOf() ?? 0;
    this.delete_draft(-time);
    return this.send_chat({
      input: reply,
      sender_id: from ?? this.redux.getStore("account").get_account_id(),
      reply_to,
      noNotification,
    });
  }

  // negative date is used for replies.
  public delete_draft(
    date: number,
    commit: boolean = true,
    sender_id: string | undefined = undefined
  ) {
    if (!this.syncdb) return;
    this.syncdb.delete({
      event: "draft",
      sender_id: sender_id ?? this.redux.getStore("account").get_account_id(),
      date,
    });
    if (commit) {
      this.syncdb.commit();
    }
  }

  // Make sure everything saved to DISK.
  public async save_to_disk(): Promise<void> {
    if (this.syncdb == null) return;
    try {
      this.setState({ is_saving: true });
      await this.syncdb.save_to_disk();
    } finally {
      this.setState({ is_saving: false });
    }
  }

  public set_input(input: string): void {
    this.setState({ input });
  }

  public set_is_preview(is_preview): void {
    this.setState({ is_preview });
  }

  public set_use_saved_position(use_saved_position): void {
    this.setState({ use_saved_position });
  }

  public save_scroll_state(position, height, offset): void {
    if (height == 0) {
      // height == 0 means chat room is not rendered
      return;
    }
    this.setState({ saved_position: position, height, offset });
  }

  public scrollToBottom() {
    // whenever this counter gets incremented, the UI should scroll chat
    // to the bottom:
    this.setState({
      scrollToBottom: (this.store?.get("scrollToBottom") ?? 0) + 1,
    });
  }

  public set_uploading(is_uploading: boolean): void {
    this.setState({ is_uploading });
  }

  public change_font_size(delta: number): void {
    if (!this.store) return;
    const font_size = this.store.get("font_size") + delta;
    this.setState({ font_size });
  }

  // Scan through all messages and figure out what hashtags are used.
  // Of course, at some point we should try to use efficient algorithms
  // to make this faster incrementally.
  public update_hashtags(): void {}

  // Exports the currently visible chats to a markdown file and opens it.
  public async export_to_markdown(): Promise<void> {
    if (!this.store) return;
    const messages = this.store.get("messages");
    if (messages == null) return;
    const path = this.store.get("path") + ".md";
    const project_id = this.store.get("project_id");
    if (project_id == null) return;
    const sorted_dates = getSortedDates(messages, this.store.get("search"));
    const v: string[] = [];
    for (const date of sorted_dates) {
      const message = messages.get(date);
      if (message == null) continue;
      v.push(message_to_markdown(message));
    }
    const content = v.join("\n\n---\n\n");
    await webapp_client.project_client.write_text_file({
      project_id,
      path,
      content,
    });
    this.redux
      .getProjectActions(project_id)
      .open_file({ path, foreground: true });
  }

  setHashtagState(tag: string, state?: HashtagState): void {
    if (!this.store) return;
    // similar code in task list.
    let selectedHashtags: SelectedHashtags =
      this.store.get("selectedHashtags") ??
      immutableMap<string, HashtagState>();
    selectedHashtags =
      state == null
        ? selectedHashtags.delete(tag)
        : selectedHashtags.set(tag, state);
    this.setState({ selectedHashtags });
    this.ensureDraftStartsWithHashtags(true);
  }

  private ensureDraftStartsWithHashtags(commit: boolean = false): void {
    if (this.syncdb == null || this.store == null) return;
    // set draft input to match selected hashtags, if any.
    const hashtags = this.store.get("selectedHashtags");
    if (hashtags == null) return;
    const { selectedHashtagsSearch } = getSelectedHashtagsSearch(hashtags);
    let input = this.store.get("input");
    const prefix = selectedHashtagsSearch.trim() + " ";
    if (input.startsWith(prefix)) {
      return;
    }
    const v = parse_hashtags(input);
    if (v.length > 0) {
      input = input.slice(v[v.length - 1][1]);
    }

    input = prefix + input;
    this.setState({ input });
    const sender_id = this.redux.getStore("account").get_account_id();
    this.syncdb.set({
      event: "draft",
      active: Date.now(),
      sender_id,
      input,
      date: 0,
    });
    if (commit) {
      this.syncdb.commit();
    }
  }

  help() {
    open_new_tab("https://doc.cocalc.com/chat.html");
  }

  undo() {
    this.syncdb?.undo();
  }
  redo() {
    this.syncdb?.redo();
  }

  isChatGPTThread(date?: Date): false | Model {
    if (date == null) {
      return false;
    }
    const messages = this.store?.get("messages");
    if (!messages) return false;
    let message = messages.get(`${date.valueOf()}`);
    let i = 0;
    while (message != null && i < 1000) {
      i += 1; // just in case some weird corrupted file has a time loop in it.
      const input = message.getIn(["history", 0, "content"])?.toLowerCase();
      if (
        input?.includes("account-id=openai-") ||
        input?.includes("account-id=chatgpt")
      ) {
        return getChatGPTModel(input);
      }
      const reply_to = message.get("reply_to");
      if (reply_to == null) return false;
      message = messages.get(`${new Date(reply_to).valueOf()}`);
    }
    return false; // never reached
  }

  private async processChatGPT(message, reply_to?: Date, tag?: string) {
    if (
      !tag &&
      !reply_to &&
      !this.redux.getStore("projects").hasOpenAI(this.store?.get("project_id"))
    ) {
      // No need to check whether chatgpt is enabled at all.
      // We only do this check if tag is not set, e.g., directly typing @chatgpt
      // into the input box.  If the tag is set, then the request to use
      // chatgpt came from some place, e.g., the "Explain" button, so
      // we trust that.
      // We also do the check when replying.
      return;
    }
    if (!isValidUUID(message.getIn(["history", 0, "author_id"]))) {
      // do NOT respond to a message that chatgpt is sending, because that would
      // result in an infinite recursion.
      // Note that openai chatgpt etc., do not use a uuid for the author_id,
      // but instead use "chatgpt" or "openai-", etc.
      return;
    }
    let input = message.getIn(["history", 0, "content"]);
    if (!input) return;
    const store = this.store;
    if (!store) return;

    let model: Model | false;
    if (!mentionsChatGPT(input)) {
      // doesn't mention chatgpt explicitly, but might be a reply
      // to something that does:
      if (reply_to == null) {
        return;
      }
      model = this.isChatGPTThread(reply_to);
      if (!model) {
        // definitely not a chatgpt situation
        return;
      }
    } else {
      // it mentions chatgpt -- which model?
      model = getChatGPTModel(input);
    }

    // without any mentions, of course:
    input = stripMentions(input);
    // also important to strip details, since they tend to confuse chatgpt:
    //input = stripDetails(input);
    const sender_id = `openai-${model}`;
    let date: string = this.send_reply({
      message,
      reply: ":robot: Thinking...",
      from: sender_id,
      noNotification: true,
    });

    if (this.chatStreams.size > MAX_CHATSTREAM) {
      console.trace(
        `processChatGPT called when ${MAX_CHATSTREAM} streams active`
      );
      if (this.syncdb != null) {
        // This should never happen in normal use, but could prevent an expensive blowup due to a bug.
        this.syncdb.set({
          date,
          history: [
            {
              author_id: sender_id,
              content: `\n\n<span style='color:#b71c1c'>There are already ${MAX_CHATSTREAM} ChatGPT response being written. Please try again once one finishes.</span>\n\n`,
              date,
            },
          ],
          event: "chat",
          sender_id,
        });
        this.syncdb.commit();
      }
      return;
    }

    // keep updating that chatgpt is doing something:
    const project_id = store.get("project_id");
    const path = store.get("path");
    if (!tag && reply_to) {
      tag = "reply";
    }

    // record that we're about to submit message to chatgpt.
    track("chatgpt", {
      project_id,
      path,
      type: "chat",
      is_reply: !!reply_to,
      tag,
    });

    // submit question to chatgpt
    const id = uuid();
    this.chatStreams.add(id);
    setTimeout(() => {
      this.chatStreams.delete(id);
    }, 3 * 60 * 1000);
    const chatStream = webapp_client.openai_client.chatgptStream({
      input,
      history: reply_to ? this.getChatGPTHistory(reply_to) : undefined,
      project_id,
      path,
      model,
      tag,
    });
    this.scrollToBottom();
    let content: string = "";
    let halted = false;
    chatStream.on("token", (token) => {
      if (halted || this.syncdb == null) return;
      const cur = this.syncdb.get_one({ event: "chat", sender_id, date });
      if (cur?.get("generating") === false) {
        halted = true;
        this.chatStreams.delete(id);
        return;
      }
      if (token != null) {
        content += token;
        this.syncdb.set({
          event: "chat",
          sender_id,
          date,
          history: [{ author_id: sender_id, content, date }],
          generating: true,
        });
      } else {
        this.chatStreams.delete(id);
        this.syncdb.set({
          event: "chat",
          sender_id,
          date,
          history: [{ author_id: sender_id, content, date }],
          generating: false,
        });
        this.syncdb.commit();
      }
    });
    chatStream.on("error", (err) => {
      this.chatStreams.delete(id);
      if (this.syncdb == null || halted) return;
      content += `\n\n<span style='color:#b71c1c'>${err}</span>\n\n---\n\nOpenAI [status](https://status.openai.com) and [downdetector](https://downdetector.com/status/openai).`;
      this.syncdb.set({
        date,
        history: [{ author_id: sender_id, content, date }],
        event: "chat",
        sender_id,
      });
      this.syncdb.commit();
    });
  }

  // the input and output for the thread ending in the
  // given message, formatted for chatgpt, and heuristically
  // truncated to not exceed a limit in size.
  private getChatGPTHistory(reply_to: Date): ChatGPTHistory {
    const messages = this.store?.get("messages");
    const history: ChatGPTHistory = [];
    if (!messages) return history;
    // Next get all of the messages with this reply_to or that are the root of this reply chain:
    const d = reply_to.toISOString();
    for (const message of messages // @ts-ignore -- immutablejs typings are wrong (?)
      .filter(
        (message) =>
          message.get("reply_to") == d || message.get("date").toISOString() == d
      )
      .valueSeq()
      .sort((a, b) => cmp(a.get("date"), b.get("date")))) {
      const content = stripMentions(
        message.get("history").last().get("content")
      );
      history.push({
        content,
        role: message.getIn(["history", 0, "author_id"])?.startsWith("chatgpt")
          ? "assistant"
          : "user",
      });
    }

    return history;
  }

  chatgptStopGenerating(date: Date) {
    if (this.syncdb == null) return;
    this.syncdb.set({
      event: "chat",
      date: date.toISOString(),
      generating: false,
    });
    this.syncdb.commit();
  }

  chatgptRegenerate(date0: Date) {
    if (this.syncdb == null) return;
    const date = date0.toISOString();
    const cur = this.syncdb.get_one({ event: "chat", date });
    if (cur == null) return;
    const reply_to = cur.get("reply_to");
    if (!reply_to) return;
    const message = this.syncdb.get_one({ event: "chat", date: reply_to });
    if (!message) return;
    this.syncdb.delete({
      event: "chat",
      date,
    });
    this.processChatGPT(message, undefined, "regenerate");
  }
}

function getReplyToRoot(message, messages): Date | undefined {
  while (message.get("reply_to")) {
    message = messages.get(`${new Date(message.get("reply_to")).valueOf()}`);
  }
  const date = message.get("date");
  return date ? new Date(date) : undefined;
}

function stripMentions(value: string): string {
  // We strip out any cased version of the string @chatgpt and also all mentions.
  for (const name of ["@chatgpt4", "@chatgpt"]) {
    while (true) {
      const i = value.toLowerCase().indexOf(name);
      if (i == -1) break;
      value = value.slice(0, i) + value.slice(i + name.length);
    }
  }
  // The mentions looks like this: <span class="user-mention" account-id=openai-... >@ChatGPT</span> ...
  while (true) {
    const i = value.indexOf('<span class="user-mention"');
    if (i == -1) break;
    const j = value.indexOf("</span>", i);
    if (j == -1) break;
    value = value.slice(0, i) + value.slice(j + "</span>".length);
  }
  return value.trim();
}

// not necessary
// // Remove instances of <details> and </details> from value:
// function stripDetails(value: string): string {
//   return value.replace(/<details>/g, "").replace(/<\/details>/g, "");
// }

function mentionsChatGPT(input?: string): boolean {
  return !!(
    input?.toLowerCase().includes("account-id=chatgpt") ||
    input?.toLowerCase().includes("account-id=openai-")
  );
}

function getChatGPTModel(input?: string): false | Model {
  if (!input) return false;
  const x = input.toLowerCase();
  if (x.includes("account-id=chatgpt4")) {
    return "gpt-4";
  }
  if (x.includes("account-id=chatgpt")) {
    return "gpt-3.5-turbo";
  }
  const i = x.indexOf("account-id=openai-");
  if (i != -1) {
    const j = x.indexOf(">", i);
    return x.slice(i + "account-id=openai-".length, j).trim() as any;
  }
  return false;
}
