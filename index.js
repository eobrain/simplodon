import {
  article,
  figure,
  figcaption,
  img,
  li,
  section,
  span,
  time,
  ul,
  video,
} from "https://unpkg.com/ez-html-elements";

const SERVER_KEY = "server";
let server = localStorage.getItem(SERVER_KEY);

function dateView(dateString) {
  const ms = Date.now() - Date.parse(dateString);
  if (ms < 1500) {
    return `${ms} ms`;
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 90) {
    return `${seconds} seconds`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) {
    return `${minutes} minutes`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 90) {
    return `${hours} hours`;
  }
  const days = Math.round(hours / 24);
  return `${days} days`;
}

const dateHtml = (dateString) =>
  time({ datetime: dateString }, dateView(dateString) + " ago");

function accountHtml(account) {
  const { avatar, username, url, display_name, followers_count } = account;
  const accountServer = url.match(/https:\/\/([^\/]+)\//)[1];
  const avatarSize = Math.sqrt(followers_count);
  return (
    img({ src: avatar, width: avatarSize, height: avatarSize }) +
    span(
      " @" +
        username +
        img({ src: `https://${accountServer}/favicon.ico` }, ["favicon"])
    ) +
    display_name
  );
}

function attachementHtml(attachement) {
  const { type, preview_url, meta, description } = attachement;
  if (!meta.small) {
    return "";
  }
  const { width, height } = meta.small;
  switch (type) {
    case "image":
      return figure(
        img({ alt: description, src: preview_url, width, height }) +
          figcaption(description)
      );
    case "video":
      return figure(
        video({ controls: true, src: preview_url, width, height }) +
          figcaption(description)
      );
  }
}

const attachementListHtml = (as) => as.map(attachementHtml).join("");

function statusHtml(status) {
  const { created_at, content, account, media_attachments } = status;
  const mediaSection =
    media_attachments && media_attachments.length > 0
      ? section(attachementListHtml(media_attachments))
      : "";
  return (
    section(["metadata"], accountHtml(account) + " " + dateHtml(created_at)) +
    section(content) +
    mediaSection
  );
}

/** Recursive */
async function statusChain(status) {
  const { in_reply_to_id } = status;
  if (!in_reply_to_id) {
    return statusHtml(status);
  }
  try {
    const response = await fetch(
      `https://${server}/api/v1/statuses/${in_reply_to_id}`
    );
    const inReplyTo = await response.json();
    return (await statusChain(inReplyTo)) + "🧵" + statusHtml(status);
  } catch {
    return statusHtml(status);
  }
}

async function showTimeline(querySuffix) {
  const response = await fetch(
    `https://${server}/api/v1/timelines/${querySuffix}`
  );
  const statuses = await response.json();
  timelineElement.replaceChildren();
  for (const status of statuses) {
    const { in_reply_to_id } = status;
    timelineElement.insertAdjacentHTML(
      "beforeend",
      article(await statusChain(status))
    );
  }
}

async function hasServer() {
  noServerElement.classList.add("hidden");
  headerElement.innerHTML = server;
  if (!location.hash) {
    location.hash = "#public";
  } else {
    app();
  }
}

async function app() {
  switch (location.hash) {
    case "#public":
      await showTimeline("public?limit=40");
      break;
    case "#public/local":
      await showTimeline("public?limit=40&local=true");
      break;
  }
}

window.onhashchange = app;

if (server) {
  hasServer();
} else {
  noServerElement.classList.remove("hidden");
  serverElement.addEventListener("keyup", async (event) => {
    if (event.key === "Enter") {
      server = serverElement.value.trim();
      if (server && server.match(/[a-z]+\.[a-z]+/)) {
        localStorage.setItem(SERVER_KEY, server);
        await hasServer();
      }
    }
  });
}
