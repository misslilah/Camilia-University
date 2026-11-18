# Camilia University

The Camilia University reception. Push open the doors of a lecture hall, choose a chair, and the menu is written on the board.

## Using the hall

1. Click a door. Enroll at the academy, or sign in. Until Supabase is connected, the record stays in this browser. With Supabase, the same form creates a student account and the character is kept for the next visit.
2. Open the doors, or enter directly.
3. Click a chair. The arrow keys move the selection, and Enter confirms it.
4. Once seated, click a title on the board. Keys 1 to 4 open the chapters. Escape steps back, then stands you up. Standing in the hall, Back to the hallway (or Escape) fades to black and returns you outside the doors.

The chapters: courses, examinations, academic records, and study materials.

Right of the double doors, a smaller door leads to a bedroom with blue walls: a bed under the window, a desk with a working computer, a wardrobe and a standing mirror. Open it by clicking the door or the Bedroom link. Move the mouse (or drag on a phone, or use the arrow keys) to look around, and press Escape or Back to the hallway to leave.

### The wardrobe and the mirror

In the bedroom, click (or tap) the wardrobe. Its doors swing open and you step in front of a standing mirror, where your character appears, with a simple stylised face that blinks now and then.

The first time, you create your character: choose Men or Women, then set the height, skin tone, hairstyle and hair colour, and press Create character. The body is then fixed and cannot be edited again.

After that, the wardrobe panel (on the right, or at the bottom on a phone) is for getting dressed. Pick one item per category by clicking it: Underwear (always worn: boxer briefs for Men, a briefs and bralette set for Women, in a few plain colours), Tops, Pants and Shoes. Tops, Pants and Shoes also have None, so the character can stand in underwear. Items are fixed and not customisable. A new character starts in a grey T-shirt, dark jeans and white sneakers (Men) or a white T-shirt, blue jeans and white sneakers (Women). Bodies are smooth, mannequin-like figures with no anatomical detail.

Every change shows in the mirror straight away. Drag on the scene, use the turn buttons, or press the arrow keys to turn the character. Done, Back to the room, or Escape closes the wardrobe. The character and outfit are saved in this browser, and on the student record when Supabase is connected. Create those three values in the Supabase project settings: the project URL, the anon key, and the service role key. After enrolling, the student confirms the account from the link in the email, then signs in.

### The computer

In the bedroom, hover the monitor (it lights up) and click or tap it: you sit down at the desk and the camera moves in on the screen, which becomes a working desktop. On a phone the desktop fills the page.

The desktop shows the Camilia wallpaper and six icons: My Files, Courses, Browser, Notes, Trash and Patreon. Click an icon to select it and double-click (double-tap on a phone) to open it. Browser and Patreon open their own windows; the other apps are not built yet and open a "coming soon" window. Windows can be dragged by their title bar, brought to the front, minimised to the taskbar and closed. Icons can be dragged to another spot on the grid. The taskbar has a Start menu (signed in as Student, with the apps and Shut down), the open windows, a system tray and the local time and date.

Patreon is the creator's library. Its icon is an original coral rounded tile with a white capital P, and the name Patreon is plain text under it. The window has a Video tab and an Audio tab, pills, and cards. Connect with Patreon opens the visitor's own Patreon account (scopes `identity`, `identity.memberships`, and `campaigns`) and returns to `/api/patreon/callback`. The server keeps the refresh token, and each visit refreshes the membership so the tier stays current. The creator of the campaign is the only admin: the window shows a Creator chip, and only they see Upload and Delete. Before a file is chosen, the creator picks one of the campaign's tiers. A subscriber can play the file when that tier is one of their entitled tiers, or when their tier amount is at least the file's amount. Everyone else is a subscriber.

An upload is limited to 2 GB. The file is sent directly to Supabase Storage in 6 MB pieces, because Vercel cannot receive a file of that size. Supabase itself must allow it: in Storage, then Settings, the global file size limit has to be 2 GB. The Free plan cannot go above 50 MB. The creator picks a tier from the campaign. An active patron can play a file when that tier is one of their currently entitled tiers on this campaign, or when their tier amount is at least the file's amount. A file outside the tier is listed as locked and is not streamed. With no active membership the window stays open, with a short explanation, and paid files stay hidden. The creator's files are stored in Supabase Storage when `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set, and the catalogue stays in the app's Postgres database. Without Supabase, the file itself is stored in Postgres. Every subscriber sees the same library.

Until `PATREON_CLIENT_ID`, `PATREON_CLIENT_SECRET`, and `PATREON_CAMPAIGN_ID` are set, the connect button explains that Patreon is not configured yet and the library shows labeled sample files. There is no stand-in login. Register these redirect URIs on the Patreon client:

- `http://127.0.0.1:3847/api/patreon/callback`
- `https://camilia-university.apps.grok.bot/api/patreon/callback`
- `https://camilia-university-misslilahs-projects.vercel.app/api/patreon/callback`

A later custom domain can be set with `APP_ORIGIN` (for example `https://camilia.example`). Register that same origin plus `/api/patreon/callback` on the Patreon client.

The three values are read from the server environment only. The host sets `DATABASE_URL` for the published database; it is not one of the Patreon secrets. The window can be resized or maximised, like Browser.

#### The browser

Browser opens a larger window that can be resized from its bottom-right corner or maximised (it opens maximised on a phone). It has tabs (+ to open one, × to close), Back, Forward, Reload and Home buttons, and an address bar. The start page has tiles for the sites on the Camilia network, and typing part of a site's address suggests it. Any other address shows "This site can't be reached". All sites are fictional and drawn in the page; nothing loads from the internet.

- **avazon.com**: a parody furniture store with its own lowercase wordmark. It has search and category tabs for Beds, Desks, Chairs, Wardrobes & storage, Lighting and Decor. Each product has a page with a price, a rating and Add to cart. The cart drawer changes quantities and shows the subtotal; checkout is not available yet.
- **threadline.com**: a clothing shop with Tops, Pants, Shoes and Underwear for Women or Men. It sells the same pieces as the wardrobe, and has its own bag. Buying does not change the wardrobe yet.

Each site's cart is saved in this browser. A third site is registered as locked: it is not on the start page and is never suggested, and its address answers like an unknown site until it is unlocked in a later update.

Shut down, Back to the room, or Escape returns to the bedroom. While the desktop is open, the mouse no longer turns the view and the hall's keyboard shortcuts are off.

Recorded sounds follow those motions: the latch and the double doors, footsteps on stone then carpet, the wooden tiers, the chair, and the chalk. The hall adds its own reverb. The button at the top right mutes them, and the choice is remembered in this browser. Sources and licenses are in `public/sounds/CREDITS.md`.

## Run locally

```bash
npm install
npm run dev
```

The site is served on port 3847.

```bash
npm run build
npm start
```
