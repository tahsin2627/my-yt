window.utils = {
  applyShowThumbnails(showThumbnails) {
    if (showThumbnails) {
      document.body.classList.remove('hide-thumbnails')
    } else {
      document.body.classList.add('hide-thumbnails')
    }
    const $showThumbnailsCheckbox = document.getElementById('show-thumbnails')
    if ($showThumbnailsCheckbox) $showThumbnailsCheckbox.checked = showThumbnails
  },

  applyShowBigPlayer(showBigPlayer) {
    if (showBigPlayer) {
      document.body.classList.add('show-big-player')
    } else {
      document.body.classList.remove('show-big-player')
    }
    const $showBigPlayerCheckbox = document.getElementById('show-big-player')
    if ($showBigPlayerCheckbox) $showBigPlayerCheckbox.checked = showBigPlayer
  },

  addClickListener ($el, handler) {
    if (!$el) return
    $el.addEventListener('click', handler)
    $el.addEventListener('keydown', (event) => event.key === 'Enter' && handler(event))
  },

  removeClickListener ($el, handler) {
    if (!$el) return
    $el.removeEventListener('click', handler)
    $el.removeEventListener('keydown', (event) => event.key === 'Enter' && handler(event))
  }
}

