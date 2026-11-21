/* What's new. Newest entry FIRST. version = semver string (also the key for the unseen badge),
   date = ISO YYYY-MM-DD. Item type: feature | update | correction | content.
   Optional per item: href (an in-app '#/...' link) shown as "Open". Add an entry for every release,
   then bump APP_META.version, VERSION in sw.js, and "Latest version" in the footer / README. */
window.APP_CHANGELOG = [
  {
    version: '1.3.2',
    date: '2026-11-21',
    title: 'Support link on every page',
    items: [
      { type: 'update', text: 'The “Support this app on Ko-fi” link is now at the bottom of every page, the same as in the other isaymotion apps.' }
    ]
  },
  {
    version: '1.3.1',
    date: '2026-11-21',
    title: 'Support Storytime',
    items: [
      { type: 'feature', text: 'Storytime stays free. If it helps you, there is now a “Support on Ko-fi” button on the home screen and the About page.', href: '#/about' }
    ]
  },
  {
    version: '1.3.0',
    date: '2026-11-21',
    title: 'Covers, holds, shelves and sharing',
    items: [
      { type: 'feature', text: 'Book covers on your list and on each book’s page.', href: '#/books' },
      { type: 'feature', text: 'Hold tracker: after placing a hold in Libby, tap “I placed a hold” on the book’s page. Storytime shows where it is and roughly when to expect it.', href: '#/books/hold' },
      { type: 'feature', text: 'Filter My books by your own Goodreads shelves, StoryGraph tags or a series. Books you are reading now stay on top.', href: '#/books' },
      { type: 'feature', text: 'My libraries shows how many of your books each library has, and can remind you when a card needs renewing.', href: '#/libraries' },
      { type: 'feature', text: 'Books none of your libraries has: how to ask for them in Libby, and a bookshop link.' },
      { type: 'feature', text: 'Share a book, or your whole borrow-now list, as a message.', href: '#/books' },
      { type: 'update', text: 'Each book’s page lists the library with the shortest wait first.' },
      { type: 'update', text: 'New Privacy page and a short “How it works” on the first screen.', href: '#/privacy' }
    ]
  },
  {
    version: '1.2.0',
    date: '2026-11-21',
    title: 'Faster checking with favourite libraries',
    items: [
      { type: 'feature', text: 'Check my libraries is much quicker: it looks in your favourite libraries first and stops looking for a book as soon as you can borrow it.', href: '#/books' },
      { type: 'feature', text: 'My libraries: mark the libraries you use most as favourites, and choose ebooks only, audiobooks only or either.', href: '#/libraries' },
      { type: 'update', text: '“Check every library” is still there when you want the full picture, for the whole list or for one book.', href: '#/books' },
      { type: 'correction', text: 'A book is only marked red once every one of your libraries has answered.' }
    ]
  },
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
