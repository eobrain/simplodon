import {
  article,
  figure,
  figcaption,
  img,
  section,
  span,
  time,
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
  const { avatar, username, acct, display_name, followers_count } = account;
  const accountServer = acct.replace(/^[^@]+@/, "");
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

const htmlAttachementList = (as) => as.map(attachementHtml).join("");

async function showPublicTimeline() {
  const response = await fetch(`https://${server}/api/v1/timelines/public`);
  const statuses = await response.json();
  for (const status of statuses) {
    const { created_at, content, account, media_attachments } = status;
    timelineElement.insertAdjacentHTML(
      "beforeend",
      article(
        section(
          ["metadata"],
          accountHtml(account) + " " + dateHtml(created_at)
        ) +
          section(content) +
          section(htmlAttachementList(media_attachments))
      )
    );
  }
}

async function hasServer() {
  noServerElement.classList.add("hidden");
  headerElement.innerHTML = server;
  await showPublicTimeline();
}

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
