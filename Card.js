import { a, aside, img, p } from 'https://unpkg.com/ez-html-elements'

/** Create a card object from the JSON returned from the server. */
export default (card) => {
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
