import server from './server.js'
import Account from './Account.js'
import Attachment from './Attachment.js'
import Card from './Card.js'
import Host from './Host.js'
import HtmlDate from './HtmlDate.js'
import {
  details,
  div,
  input,
  p,
  summary
} from 'https://unpkg.com/ez-html-elements'

/** Creates a Status object from the JSON returned from the server. */
function Status (status) {
  // Status PRIVATE:
  const account = Account(status.account)
  const createdAt = HtmlDate(status.created_at)

  const attachmentListHtml = (as, isSensitive) =>
    as.map((a) => Attachment(a, isSensitive).html()).join('')

  function html () {
    const mediaSection =
      status.media_attachments && status.media_attachments.length > 0
        ? attachmentListHtml(status.media_attachments, status.sensitive)
        : ''
    const cardHtml = status.card ? Card(status.card).html() : ''
    const contentSection = cardHtml + status.content
    return status.spoiler_text
      ? details(summary(status.spoiler_text), contentSection + mediaSection)
      : div(contentSection + mediaSection)
  }

  function filterStatus ($status) {
    $status.querySelectorAll('a.hashtag').forEach((a) => {
      a.href = a.href.replace(/^.*\/tags\/(.+)$/, '#tags/$1')
      a.removeAttribute('target') // stay in current window
    })
    $status.querySelectorAll('a.u-url').forEach((a) => {
      const parsed = a.href.match(/^https:\/\/(.+)\/@(.+)$/)
      if (parsed) {
        const [, mentionedServer, mentionedPerson] = parsed
        a.innerHTML =
          Host(mentionedServer).faviconHtml() +
          '@' +
          mentionedPerson +
          '@' +
          mentionedServer
      }
    })
  }

  async function fetchAndAddAfter ($summary) {
    const inReplyTo = Status(await server.status(status.in_reply_to_id))
    inReplyTo.addAfter($summary)
  }
  const favId = `fav-${status.id}`
  const boostId = `boost-${status.id}`
  const bookmarkId = `bookmark-${status.id}`

  const favHtml = input(['fav'], {
    id: favId,
    type: 'checkbox',
    checked: status.favourited
  })
  const boostHtml = input(['boost'], {
    id: boostId,
    type: 'checkbox',
    checked: status.reblogged
  })
  const bookmarkHtml = input(['bookmark'], {
    id: bookmarkId,
    type: 'checkbox',
    checked: status.bookmarked
  })
  const header = p(
    account.html(),
    createdAt.html(),
    favHtml,
    boostHtml,
    bookmarkHtml
  )
  function nextTick (callback) {
    setTimeout(callback, 0)
  }
  function addListeners () {
    nextTick(() => {
      const $fav = document.querySelector('#' + favId)
      const $boost = document.querySelector('#' + boostId)
      const $bookmark = document.querySelector('#' + bookmarkId)
      $fav.addEventListener('change', () => {
        server.fav(status.id, $fav.checked)
      })
      $boost.addEventListener('change', () => {
        server.boost(status.id, $boost.checked)
      })
      $bookmark.addEventListener('change', () => {
        server.bookmark(status.id, $bookmark.checked)
      })
    })
  }

  // Status PUBLIC:
  return Object.freeze({
    /** Insert into the given parent element the HTML text for this post and any preceding posts in the thread. */
    thread: async ($parent) => {
      if (status.reblog) {
        $parent.insertAdjacentHTML('beforeend', header + '♻️')
        addListeners()
        const $subArticle = document.createElement('article')
        Status(status.reblog).thread($subArticle)
        $parent.append($subArticle)
        return
      }

      $parent.insertAdjacentHTML('beforeend', header + html())
      addListeners()
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
        $sibling.insertAdjacentHTML('afterend', header)
        addListeners()
      }
      if (status.in_reply_to_id) {
        fetchAndAddAfter($sibling, status.in_reply_to_id) // no await, so happens asynchronously
      }
    }
  })
}

export default Status
