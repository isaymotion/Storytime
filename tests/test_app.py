import json, os, sys, subprocess, time, urllib.parse, pathlib
from playwright.sync_api import sync_playwright
APP = sys.argv[1]
OUT = os.environ.get('ST_OUT', '/tmp/storytime-qa'); os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--directory', APP], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
def item(id, title, author, ty, avail, owned=5, holds=0, days=None):
    return {"id": id, "title": title, "firstCreatorName": author, "creators":[{"name":author}], "type": {"id": ty}, "isAvailable": avail, "availableCopies": 2 if avail else 0, "ownedCopies": owned, "holdsCount": holds, "estimatedWaitDays": days, "isHoldable": owned > 0}
CAT = {
 'nypl': [item('101','Project Hail Mary','Andy Weir','ebook',False,250,204,12), item('102','Project Hail Mary','Andy Weir','audiobook',True),
          item('103','The Martian','Andy Weir','ebook',True), item('104','Piranesi','Susanna Clarke','ebook',False,10,40,35),
          item('105','It Ends with Us','Colleen Hoover','ebook',True), item('106','Hail Mary Study Guide','Someone Else','ebook',True)],
 'lapl': [item('201','Project Hail Mary','Andy Weir','ebook',True), item('202','Piranesi','Susanna Clarke','audiobook',False,3,9,None)],
}
RSS = '''<?xml version="1.0"?><rss><channel><title>shelf</title>
<item><title>Project Hail Mary</title><author_name>Andy Weir</author_name><isbn>0593135202</isbn><book_id>54493401</book_id></item>
<item><title>Piranesi</title><author_name>Susanna Clarke</author_name><isbn></isbn><book_id>50202953</book_id></item></channel></rss>'''
CSV = 'Book Id,Title,Author,ISBN,ISBN13,Exclusive Shelf,Date Read\n1,"The Martian",Andy Weir,"=""0553418025""","=""9780553418026""",to-read,\n2,"It (Stephen King, #1)",Stephen King,,,to-read,\n3,"Dune",Frank Herbert,,,read,2025/01/02\n54493401,"Project Hail Mary",Andy Weir,,,to-read,\n4,"Obscure Zine: A Subtitle, with comma",Nobody Known,,,to-read,\n'
seen = []
def handler(route):
    u = route.request.url
    seen.append(u)
    if 'thunder.api.overdrive.com' in u:
        path = urllib.parse.urlparse(u).path.split('/')
        if len(path) == 3:
            pgn = int(urllib.parse.parse_qs(urllib.parse.urlparse(u).query).get('page', ['1'])[0])
            names = [('spl','Seattle Public Library'),('sno-isle','Sno-Isle Libraries'),('bpl','Boston Public Library'),('dead','Closed Library')] if pgn == 1 else [('lib%d' % (pgn*10+i), 'Sample Town Library %d' % (pgn*10+i)) for i in range(4)]
            return route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'content-type': 'application/json'}, body=json.dumps({'totalItems': 20, 'items': [{'id': k, 'preferredKey': k, 'name': n, 'status': 'Closed' if k == 'dead' else 'Live'} for k, n in names], 'links': {'next': {'page': pgn + 1}}}))
        key = path[3]
        hdr = {'access-control-allow-origin': '*', 'content-type': 'application/json'}
        if key not in CAT: return route.fulfill(status=404, headers=hdr, body='{}')
        if len(path) == 4: return route.fulfill(status=200, headers=hdr, body=json.dumps({'id': key, 'preferredKey': key, 'name': {'nypl':'New York Public Library','lapl':'Los Angeles Public Library'}[key]}))
        return route.fulfill(status=200, headers=hdr, body=json.dumps({'items': CAT[key]}))
    if 'goodreads.com' in u and 'allorigins' not in u: return route.abort()          # no CORS: direct is refused
    if 'allorigins' in u:
        return route.fulfill(status=200, headers={'access-control-allow-origin': '*'}, body=RSS if 'to-read' in urllib.parse.unquote(u) else '<rss><channel></channel></rss>')
    if 'fonts.g' in u: return route.abort()
    return route.continue_()
fails = []
def ok(c, msg):
    print(('ok   ' if c else 'FAIL ') + msg)
    if not c: fails.append(msg)
with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: d.accept())
    pg.route('**/*', handler)
    B = 'http://localhost:8765/'
    pg.goto(B); ok('Two steps to start' in pg.inner_text('#main'), 'home shows setup steps')
    # unit checks
    r = pg.evaluate("""() => { const s = window.__storytime; return {
      uid1: s.grUserId('https://www.goodreads.com/user/show/12345678-isa'), uid2: s.grUserId('987'), uid3: s.grUserId('hello'),
      it: s.pickFormats({title:'It (Stephen King, #1)', author:'Stephen King'}, [{id:'1',title:'It Ends with Us',firstCreatorName:'Colleen Hoover',type:{id:'ebook'},isAvailable:true}]),
      sub: s.pickFormats({title:'Sapiens: A Brief History of Humankind', author:'Yuval Noah Harari'}, [{id:'9',title:'Sapiens',firstCreatorName:'Yuval Noah Harari',type:{id:'audiobook'},isAvailable:false,ownedCopies:4,holdsCount:8,estimatedWaitDays:21}]),
      acc: s.pickFormats({title:'Les Misérables', author:'Victor Hugo'}, [{id:'7',title:'Les Miserables',firstCreatorName:'Victor Hugo',type:{id:'ebook'},isAvailable:true}])
    }; }""")
    ok(r['uid1']=='12345678' and r['uid2']=='987' and r['uid3']=='', 'goodreads id parsing')
    ok(r['it']['ebook']['s']=='none', 'short title does not match a different author')
    ok(r['sub']['audiobook']['s']=='wait' and r['sub']['audiobook']['days']==21, 'subtitle dropped, wait kept')
    ok(r['acc']['ebook']['s']=='now', 'accents ignored')
    # libraries
    pg.goto(B+'#/libraries'); pg.fill('#lib-in', 'https://nypl.overdrive.com'); pg.click('form[data-form=add-lib] button[type=submit]'); pg.wait_for_selector('.libcard h3')
    ok('New York Public Library' in pg.inner_text('#main'), 'library added from web address')
    pg.fill('#lib-in', 'nypl, libbyapp.com/library/lapl, nosuchlib'); pg.click('form[data-form=add-lib] button[type=submit]'); pg.wait_for_selector('#lib-status.is-error')
    ok(pg.locator('.libcard h3').count()==2 and 'Added Los Angeles Public Library' in pg.inner_text('#lib-status') and 'No library uses: nosuchlib' in pg.inner_text('#lib-status'), 'several libraries at once: ' + pg.inner_text('#lib-status'))
    pg.fill('#lib-find', 'seattle public'); pg.wait_for_selector('.found')
    pg.wait_for_function("document.querySelector('#lib-results .status-line').textContent===''", timeout=20000)
    ok(pg.locator('.found').count()==1 and 'Code: spl' in pg.inner_text('.found'), 'finder shows the code: ' + pg.inner_text('.found').replace('\n',' | '))
    pg.fill('#lib-find', 'library'); pg.wait_for_function("document.querySelectorAll('.found').length>=18")
    ok('Closed Library' not in pg.inner_text('#lib-results') and pg.locator('.found').count()==18, 'whole list loaded across pages, closed libraries left out')
    pg.locator('#lib-find').scroll_into_view_if_needed(); pg.screenshot(path=OUT + '/finder.png')
    pg.fill('#lib-find', 'boston'); pg.click('[data-act=lib-add]'); pg.wait_for_function("document.querySelectorAll('.libcard h3').length===3")
    ok(pg.input_value('#lib-find')=='boston' and 'Added' in pg.inner_text('#lib-results'), 'added from finder, search kept')
    pg.click('.libcard:has-text("Boston") [data-act=lib-remove]'); pg.wait_for_function("document.querySelectorAll('.libcard h3').length===2")
    # goodreads link through relay
    pg.goto(B+'#/import'); pg.fill('#gr-in', 'https://www.goodreads.com/user/show/12345678-isa'); pg.click('form[data-form=gr-link] button[type=submit]')
    pg.wait_for_function("document.getElementById('gr-status').textContent.indexOf('Added')>-1")
    ok('Added 2 books' in pg.inner_text('#gr-status'), 'goodreads feed read via relay: ' + pg.inner_text('#gr-status'))
    ok(any('allorigins' in u for u in seen), 'relay used after direct refusal')
    # csv
    pathlib.Path('/tmp/gr.csv').write_text(CSV)
    pg.set_input_files('#csv-file', '/tmp/gr.csv'); pg.wait_for_function("document.getElementById('csv-status').textContent.indexOf('file read')>-1")
    ok('Added 4 books' in pg.inner_text('#csv-status'), 'csv merged without duplicating: ' + pg.inner_text('#csv-status'))
    # check
    pg.goto(B+'#/books'); ok('5 books to read' in pg.inner_text('.page__head'), 'five books on the list: ' + pg.inner_text('.page__head p'))
    pg.click('[data-act=check]'); pg.wait_for_function("document.getElementById('chk').textContent.indexOf('Checked')>-1", timeout=30000)
    ok('Checked 10 listings' in pg.inner_text('#chk'), pg.inner_text('#chk'))
    rows = pg.evaluate("""() => [...document.querySelectorAll('.book')].map(b => [b.querySelector('h3').textContent, b.className.replace('book book--',''), [...b.querySelectorAll('.av')].map(a => a.textContent.trim()+(a.href?' -> '+a.href:''))])""")
    for x in rows: print('    ', x)
    d = {x[0]: x for x in rows}
    ok(d['Project Hail Mary'][1]=='now' and '/page-1/201' in d['Project Hail Mary'][2][0] and '/page-1/102' in d['Project Hail Mary'][2][1], 'best copy per format across libraries, Libby links')
    lb = pg.evaluate("() => Object.fromEntries([...document.querySelectorAll('.book')].map(b => [b.querySelector('h3').textContent, [...b.querySelectorAll('.libby-btn')].map(a => a.textContent.trim() + ' ' + a.href)]))")
    ok(lb['Project Hail Mary']==['Open ebook in Libby app https://libbyapp.com/search/lapl/search/query-Project%20Hail%20Mary%20Weir/page-1/201', 'Open audiobook in Libby app https://libbyapp.com/search/nypl/search/query-Project%20Hail%20Mary%20Weir/page-1/102'], 'ebook and audiobook Libby buttons: ' + str(lb['Project Hail Mary']))
    ok(lb['The Martian']==['Open ebook in Libby app https://libbyapp.com/search/nypl/search/query-The%20Martian%20Weir/page-1/103'], 'only the held format gets a button')
    ok(lb['It (Stephen King, #1)']==['Search in Libby app https://libbyapp.com/search/nypl/search/query-It%20King/page-1'], 'search button when not held')
    ok(d['Piranesi'][1]=='wait' and 'about 5 wk' in d['Piranesi'][2][0], 'holds queue with wait')
    ok(d['It (Stephen King, #1)'][1]=='none', 'not held is red')
    ok(rows[0][1]=='now' and rows[-1][1]=='none', 'sorted green first')
    pg.screenshot(path=OUT + '/books-light.png', full_page=True)
    n0 = len(seen); pg.click('[data-act=check]'); pg.wait_for_timeout(500)
    ok(len(seen)==n0 and 'last 6 hours' in pg.inner_text('#chk'), 'fresh results are not fetched again')
    # detail + finish
    pg.click('.book__main >> text=Project Hail Mary'); pg.wait_for_selector('.libcard')
    ok('Los Angeles Public Library' in pg.inner_text('#main') and 'lapl.overdrive.com/media/201' in pg.content(), 'detail lists each library')
    pg.screenshot(path=OUT + '/book-light.png', full_page=True)
    pg.click('[data-act=finish]'); pg.wait_for_selector('.callout--good')
    ok('goodreads.com/book/show/54493401' in pg.content(), 'finished shows Goodreads page link')
    pg.goto(B+'#/finished'); ok(pg.locator('.book').count()==2, 'read list has imported + marked book')
    pg.click('[data-act=check-read]'); pg.wait_for_function("document.getElementById('chk').textContent.indexOf('Checked')>-1", timeout=30000)
    ok(pg.locator('.book--now').count()==1 and pg.locator('.book--none').count()==1, 'read books checked for rereading')
    with pg.expect_download() as dl: pg.click('[data-act=export-finished]')
    txt = pathlib.Path(dl.value.path()).read_text(); ok('Project Hail Mary,Andy Weir' in txt and 'Dune' in txt, 'finished CSV export')
    # re-import must not undo a local finish
    pg.goto(B+'#/import'); pg.click('form[data-form=gr-link] button[type=submit]'); pg.wait_for_function("document.getElementById('gr-status').textContent.indexOf('No new')>-1")
    pg.goto(B+'#/books'); ok('4 books to read' in pg.inner_text('.page__head'), 'refresh keeps the book finished')
    pg.goto(B+'#/'); ok(pg.locator('.stat').count()>=3, 'home shows counts'); pg.screenshot(path=OUT + '/home-light.png', full_page=True)
    # search
    pg.fill('#q', 'piranesi'); pg.wait_for_selector('.suggest__item'); ok('Piranesi' in pg.inner_text('#suggest'), 'books are searchable')
    # all relays down -> Goodreads widget route, in a fresh profile
    c2 = br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); p2 = c2.new_page(); e2 = []
    p2.on('pageerror', lambda e: None if 'context is sandboxed' in str(e) else e2.append(str(e)))
    W = """var widget_code = '<div class="gr_custom_container_1"><div class="gr_custom_each_container_1"><div class="gr_custom_title_1"><a href="#">Circe</a></div><div class="gr_custom_author_1"> by <a href="#">Madeline Miller</a></div></div></div>'; var d = document.getElementById('gr_custom_widget_1'); if (d) { d.innerHTML = widget_code }"""
    def h2(route):
        u = route.request.url
        if 'custom_widget' in u: return route.fulfill(status=200, content_type='text/javascript', body=W if 'shelf=to-read' in u else """document.getElementById('gr_custom_widget_1').innerHTML='<div class="gr_custom_container_1"></div>'""")
        if 'localhost' in u: return route.continue_()
        return route.abort()
    p2.route('**/*', h2); p2.goto(B+'#/import'); p2.fill('#gr-in', 'https://www.goodreads.com/user/show/57096661-chuu'); p2.click('form[data-form=gr-link] button[type=submit]')
    p2.wait_for_function("document.getElementById('gr-status').textContent.length>25 && document.getElementById('gr-status').textContent.indexOf('Reading')<0", timeout=90000)
    ok('Added 1 book' in p2.inner_text('#gr-status') and 'export file' in p2.inner_text('#gr-status'), 'widget route when every relay is down: ' + p2.inner_text('#gr-status'))
    p2.goto(B+'#/books'); ok('Circe' in p2.inner_text('#main') and 'Madeline Miller' in p2.inner_text('#main'), 'widget title and author parsed'); ok(not e2, 'no script errors on widget route: ' + ' | '.join(e2)); c2.close()
    # catalogue unreachable
    pg.unroute('**/*'); pg.route('**/*', lambda r: r.abort() if ('overdrive' in r.request.url or 'allorigins' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    pg.goto(B+'#/books'); pg.click('[data-act=check-all]'); pg.wait_for_function("document.getElementById('chk').textContent.indexOf('could not reach')>-1", timeout=20000)
    ok(pg.locator('.book--now').count()>=1, 'a failed recheck keeps earlier answers')
    # dark + overflow
    pg.emulate_media(color_scheme='dark'); pg.goto(B+'#/books'); pg.wait_for_selector('.book'); pg.screenshot(path=OUT + '/books-dark.png', full_page=True)
    ok(pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth"), 'no sideways scroll at 390px')
    small = pg.evaluate("[...document.querySelectorAll('#main a.av, #main .btn, #main a.filter')].filter(e=>e.getBoundingClientRect().height<43.5).length")
    ok(small==0, 'tap targets at least 44px (%d small)' % small)
    ok(not errs, 'no script errors ' + '; '.join(errs))
    br.close()
srv.terminate()
print('FAILS:', fails)
