import server from './server.js'
import Status from './Status.js'

/* global alert $settings $cssSelect $timeline $login $header $server */

function settings (shown) {
  if (shown) {
    $timeline.classList.add('hidden')
    $settings.classList.remove('hidden')
  } else {
    $timeline.classList.remove('hidden')
    $settings.classList.add('hidden')
  }
}

// const accountFromUsername = username => server.

async function showStatusList (header, statuses) {
  if (statuses.error) {
    alert(statuses.error)
    return
  }
  $header.innerHTML = header
  $timeline.replaceChildren()
  for (const statusJson of statuses) {
    const status = Status(statusJson)
    const $article = document.createElement('article')
    $timeline.append($article)
    await status.thread($article)
  }
}

async function showTimeline (header, querySuffix) {
  await showStatusList(header, await server.timeline(querySuffix))
}

async function showAccountTimeline (accountId, querySuffix) {
  await showStatusList(
    '🧑',
    await server.accountTimeline(accountId, querySuffix)
  )
}

async function hasServer () {
  server.setAuthorizeHref($login)
  server.updateNavButtons()
  settings(false)
  if (!document.location.hash || document.location.hash === '#') {
    document.location.hash = server.isLoggedIn() ? '#home' : '#public'
  } else {
    app()
  }
  settings(false)
}

async function noServer () {
  server.updateNavButtons()
  settings(true)
  $header.innerHTML = ''
}

let appRunning = false
async function app () {
  if (appRunning) {
    return
  }
  appRunning = true

  const codeMatch = document.location.search.match(/code=(.+)$/)
  if (codeMatch) {
    await server.login(codeMatch[1])
    document.location.search = ''
    document.location.hash = '#home'
    appRunning = false
    return
  }
  switch (document.location.hash) {
    case '#home':
      await showTimeline('🏠', 'home?limit=40')
      break
    case '#public':
      await showTimeline('🌐', 'public?limit=40')
      break
    case '#public/local':
      await showTimeline('🧑🏽‍🤝‍🧑🏽', 'public?limit=40&local=true')
      break
    case '#settings':
      settings(true)
      break
    default: {
      const hashtagMatch = document.location.hash.match(/#tags\/(.+)$/)
      if (hashtagMatch) {
        const hashtag = hashtagMatch[1]
        await showTimeline(`#${hashtag}`, `tag/${hashtag}?limit=40`)
        break
      }
      const accountMatch = document.location.hash.match(/#accounts\/(.+)$/)
      if (accountMatch) {
        const accountId = accountMatch[1]
        await showAccountTimeline(accountId, 'limit=40')
        break
      }
      console.warn(`Unexpected hash ${document.location.hash}`)
    }
  }
  appRunning = false
}

window.onhashchange = app

if (server.hasHostname()) {
  hasServer()
} else {
  noServer()
}

$server.addEventListener('keyup', async (event) => {
  if (event.key === 'Enter') {
    const hostname = $server.value.trim()
    if (hostname && hostname.match(/[a-z]+\.[a-z]+/)) {
      server.setHostname(hostname)
      await hasServer()
    }
  }
})

$cssSelect.addEventListener('change', (event) => {
  server.setCssTheme()
  settings(false)
})

app()
