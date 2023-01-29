import server from './server.js'
import HtmlDate from './HtmlDate.js'
import {
  a,
  aside,
  details,
  div,
  em,
  figure,
  figcaption,
  h3,
  img,
  p,
  section,
  summary,
  sub
} from 'https://unpkg.com/ez-html-elements'

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

const faviconImg = (host) =>
  img(['inline'], {
    src: `https://${host}/favicon.ico`,
    alt: host
  })

/** Create an account object from the JSON returned from the server. */
function Account (account) {
  // Account PUBLIC:
  return Object.freeze({
    /** Is the given id the same as this account's id? */
    sameId: (id) => id === account.id,

    /** Generate HTML text */
    html: () => {
      const accountServer = account.url.match(/https:\/\/([^/]+)\//)[1]

      return (
        a(
          { href: `#accounts/${account.id}` },
          h3(
            ' @' +
              account.username +
              img(['inline'], {
                src: account.avatar,
                alt: `@${account.username}`
              }) +
              ' ' +
              sub('@' + accountServer + faviconImg(accountServer))
          )
        ) + em(account.display_name)
      )
    }
  })
}

// const accountFromUsername = username => server.

/** Create a card object from the JSON returned from the server. */
function Card (card) {
  // Card PRIVATE:
  const caption =
    a({ href: card.url }, card.title) +
    (card.description ? p(card.description) : '')

  // Card PUBLIC:
  return Object.freeze({
    /** Generate HTML text */
    html: () => {
      switch (card.type) {
        case 'link':
        case 'video':
          return aside(
            a(
              { href: card.url, alt: card.title },
              img({ width: card.width, height: card.height, src: card.image }),
              caption
            )
          )
        default:
          return ''
      }
    }
  })
}

/** Create an attachment object from the JSON returned from the server. */
function Attachment (attachment, isSensitive) {
  // Attachment PRIVATE:
  /** Generate HTML for the media item */
  function mediaHtml () {
    if (!attachment.meta || !attachment.meta.small) {
      return ''
    }
    const { width, height } = attachment.meta.small
    switch (attachment.type) {
      case 'image':
      case 'video':
      case 'gifv':
        return figure(
          a(
            { href: attachment.url },
            img({
              alt: attachment.description,
              src: attachment.preview_url,
              width,
              height
            })
          ) + figcaption(attachment.description)
        )

      default:
        console.warn(`Unrecognized media attachment type "${attachment.type}"`)
        return ''
    }
  }

  // Attachment PUBLIC:
  return Object.freeze({
    /** Generate HTML text */
    html: () => {
      const media = mediaHtml()
      if (media === '') {
        return ''
      }
      if (!isSensitive) {
        return media
      }
      return details(summary('⚠️🫣 ' + attachment.description), media)
    }
  })
}

const attachmentListHtml = (as, isSensitive) =>
  as.map((a) => Attachment(a, isSensitive).html()).join('')

/** Creates a Status object from the JSON returned from the server. */
function Status (status) {
  // Status PRIVATE:
  const account = Account(status.account)

  function html () {
    const mediaSection =
      status.media_attachments && status.media_attachments.length > 0
        ? section(
          attachmentListHtml(status.media_attachments, status.sensitive)
        )
        : ''
    const cardHtml = status.card ? Card(status.card).html() : ''
    const createdAt = HtmlDate(status.created_at)
    const contentSection = section(
      cardHtml,
      status.content,
      p(em(createdAt.html()))
    )
    return status.spoiler_text
      ? details(summary(status.spoiler_text), contentSection + mediaSection)
      : div(contentSection + mediaSection)
  }

  function filterStatus ($status) {
    $status.querySelectorAll('a.hashtag').forEach((a) => {
      a.href = a.href.replace(/^.*\/tags\/(.+)$/, '#tags/$1')
    })
    $status.querySelectorAll('a.u-url').forEach((a) => {
      const parsed = a.href.match(/^https:\/\/(.+)\/@(.+)$/)
      if (parsed) {
        const [, mentionedServer, mentionedPerson] = parsed
        a.innerHTML =
          '@' +
          mentionedPerson +
          sub('@' + mentionedServer + faviconImg(mentionedServer))
      }
    })
  }

  async function fetchAndAddAfter ($summary) {
    const inReplyTo = Status(await server.status(status.in_reply_to_id))
    inReplyTo.addAfter($summary)
  }

  // Status PUBLIC:
  return Object.freeze({
    /** Insert into the given parent element the HTML text for this post and any preceding posts in the thread. */
    thread: async ($parent) => {
      if (status.reblog) {
        $parent.insertAdjacentHTML('beforeend', section(account.html() + '♻️'))
        const $subArticle = document.createElement('article')
        Status(status.reblog).thread($subArticle)
        $parent.append($subArticle)
        return
      }

      $parent.insertAdjacentHTML('beforeend', section(account.html()) + html())
      filterStatus($parent.lastElementChild)
      if (status.in_reply_to_id) {
        const $details = document.createElement('details')
        const $summary = document.createElement('summary')
        $summary.innerText = '🧵'
        $details.append($summary)
        $parent.insertAdjacentElement('afterbegin', $details)
        fetchAndAddAfter($summary, status.in_reply_to_id) // no await, so happens asynchronously
      }
    },

    /** Insert after the given sibling element the HTML for this post. */
    addAfter: ($sibling) => {
      $sibling.insertAdjacentHTML('afterend', html())
      filterStatus($sibling.nextElementSibling)
      if (!account.sameId(status.in_reply_to_account_id)) {
        $sibling.insertAdjacentHTML('afterend', section(account.html()))
      }
      if (status.in_reply_to_id) {
        fetchAndAddAfter($sibling, status.in_reply_to_id) // no await, so happens asynchronously
      }
    }
  })
}

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
