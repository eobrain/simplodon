import {
  a,
  details,
  figure,
  figcaption,
  img,
  summary
} from 'https://unpkg.com/ez-html-elements'

/** Create an attachment object from the JSON returned from the server. */
export default (attachment, isSensitive) => {
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
