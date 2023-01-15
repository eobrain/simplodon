import { article, time, section } from "https://unpkg.com/ez-html-elements";

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

async function showPublicTimeline() {
  const response = await fetch(`https://${server}/api/v1/timelines/public`);
  const statuses = await response.json();
  for (const status of statuses) {
    const { created_at, content } = status;
    timelineElement.insertAdjacentHTML(
      "beforeend",
      article(
        section(time({ datetime: created_at }, dateView(created_at) + " ago")) +
          section(content)
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
