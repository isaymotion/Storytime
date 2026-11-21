/* What's new. Newest entry FIRST. version = semver string (also the key for the unseen badge),
   date = ISO YYYY-MM-DD. Item type: feature | update | correction | content.
   Optional per item: href (an in-app '#/...' link) shown as "Open". Add an entry for every release,
   then bump APP_META.version, VERSION in sw.js, and "Latest version" in the footer / README. */
window.APP_CHANGELOG = [
  {
    version: '1.0.0',
    date: '2026-11-21',
    title: 'First release',
    items: [
      { type: 'feature', text: 'Bring in your reading list from a Goodreads profile link, a Goodreads or StoryGraph export file, or by hand.', href: '#/import' },
      { type: 'feature', text: 'Add the libraries you use in Libby and check every book at each of them: green to borrow now, orange for a holds queue, red if not held. Ebooks and audiobooks are shown separately.', href: '#/libraries' },
      { type: 'feature', text: 'Tap a coloured button to open the book in Libby.', href: '#/books' },
      { type: 'feature', text: 'Mark books as finished, with one-tap links to update Goodreads and StoryGraph, and a CSV export of your finished list.', href: '#/finished' }
    ]
  }
];
