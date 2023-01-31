import Host from './Host.js'
import { a, em, h2, img, sub } from 'https://unpkg.com/ez-html-elements'

/** Create an account object from the JSON returned from the server. */
export default (account) => {
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
          h2(
            ' @' +
              account.username +
              img(['inline'], {
                src: account.avatar,
                width: 48,
                height: 48,
                alt: `@${account.username}`
              }) +
              ' ' +
              sub('@' + accountServer + Host(accountServer).faviconHtml())
          )
        ) + em(account.display_name)
      )
    }
  })
}
