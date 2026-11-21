/* What's new. Newest entry FIRST. version = semver string (also the key for the unseen badge),
   date = ISO YYYY-MM-DD. Item type: feature | update | correction | content.
   Optional per item: href (an in-app '#/...' link) shown as "Open". Add an entry for every release,
   then bump APP_META.version, VERSION in sw.js, and "Latest version" in the footer / README. */
window.APP_CHANGELOG = [
  {
    version: '1.1.0',
    date: '2026-11-21',
    title: 'Find your library by name',
    items: [
      { type: 'feature', text: 'My libraries: type a library name, town or county to see its Libby code, and add it with one tap.', href: '#/libraries' },
      { type: 'update', text: 'The coloured Ebook and Audiobook buttons now open the Libby app the same way as the “Open in Libby app” buttons.', href: '#/books' }
    ]
  },
  {
    version: '1.0.5',
    date: '2026-11-21',
    title: 'Separate Libby buttons for ebook and audiobook',
    items: [
      { type: 'feature', text: 'Each book now has “Open ebook in Libby app” and “Open audiobook in Libby app”, one for each format your libraries hold. Books not found yet get “Search in Libby app”.', href: '#/books' }
    ]
  },
  {
    version: '1.0.4',
    date: '2026-11-21',
    title: 'Open in Libby app button',
    items: [
      { type: 'feature', text: 'My books and Read: every book has an “Open in Libby app” button. It goes to the best copy found, or searches Libby for the book if it has not been checked yet.', href: '#/books' }
    ]
  },
  {
    version: '1.0.3',
    date: '2026-11-21',
    title: 'Add several libraries at once',
    items: [
      { type: 'feature', text: 'My libraries: paste several library codes separated by commas and Storytime adds them all.', href: '#/libraries' }
    ]
  },
  {
    version: '1.0.2',
    date: '2026-11-21',
    title: 'Clearer help for library codes',
    items: [
      { type: 'correction', text: 'My libraries: the help text now explains where a library code really comes from. The earlier Libby menu steps were wrong.', href: '#/libraries' }
    ]
  },
  {
    version: '1.0.1',
    date: '2026-11-21',
    title: 'Read shelf for rereading, and more ways to reach Goodreads',
    items: [
      { type: 'feature', text: 'Read: your Goodreads Read shelf now comes in too, and you can check those books at your libraries when you want to reread one.', href: '#/finished' },
      { type: 'correction', text: 'Goodreads profile link: if one relay is down, Storytime now tries two more, then Goodreads’ own shelf widget, before giving up.', href: '#/import' }
    ]
  },
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
