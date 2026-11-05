# 60-second judge walkthrough

Kept up to date as the build progresses (CLAUDE.md §10). Full audit results: [docs/AUDIT.md](docs/AUDIT.md).

1. ✅ Hero: type "robotics" → matching programmes appear instantly in the gold block. Press **Find** on "I want to become a dentist" → answer card with real eligibility + entrance from the data (no AI, no cost). Try Tamil "எனக்கு ரோபோக்கள் பிடிக்கும்" or Hindi "मुझे डॉक्टर बनना है"; "astronaut chef" shows the honest "I'm not sure" + admissions numbers.
2. ✅ Scroll to Act II → Team Camber Racing pinned scene (scrubs once car frames are supplied; callouts work now).
3. ✅ Explore map → click "Chennai region" → camera flies in → click Kattankulathur (address, directions, street map).
   Then "here's a parent in Madurai": pick **Madurai** under "Where are you coming from?" → arcs fly out to every campus, Tiruchirappalli is marked nearest (≈ 135 km, as the crow flies), the list re-sorts, and its Directions start from Madurai.
4. ✅ Scroll to the end of Act III: the tree is fully grown and every leaf is a real alumnus, team or startup. Hover Sriram Krishnan's leaf, then point to the gold leaf at the top: "This one's yours" (it opens Apply).
5. ✅ "Take the 360° tour" → SRM's real Kattankulathur tour opens in-page (modal; Esc closes).
6. ✅ Toggle Tamil: header switcher **EN · த · हि** (top right; inside "Menu" on phones) — same page, now in Tamil.
7. ✅ Click the hero's **Parents** chip (or the Parent mode toggle on any programme page, e.g. /programmes/bds) → the page leads with plain answers: cost, admission, location + directions, safety/hostel links, jobs, big Call admissions buttons. Scroll the student view for **Ask a Senior** (demo threads + moderation states).
8. ✅ **Ask SRM** (chat button, bottom-right on every page): "fees for B.Tech CSE" → ₹4,75,000 a year from SRM's 2026 fee table, with the source link; "fees for MBBS" → honest "not published yet" + call buttons; "where is the main campus?" → address + directions; Tamil "விடுதி உள்ளதா?"; "can I bring my pet tiger" → "no verified answer" + question forwarded to the enquiry form. Free, no AI.
9. ✅ Press ⌘K (or tap the search icon on a phone), type "dentist", press Enter: the programme's title travels into its page. Tick **Compare** on two programmes, then **Compare** in the tray: fees, eligibility and deadlines side by side, in a link you can share.
10. ✅ Works offline: open a programme page, tap **Save for offline**, then turn on airplane mode and reload: "Still here, fees and all." A page that wasn't saved shows the offline page, with saved pages and admissions numbers that work without data.
11. ✅ Lighthouse mobile: Performance 96 (English) / 95 (Tamil, Hindi), Accessibility 100, Best Practices 100, SEO 100, CLS 0. Take the screenshot from a production build (`npm run build:verify && npm run start:verify`), not `npm run dev`: dev mode always scores low.

Before the demo: paste a programme link into WhatsApp Web and check the preview card appears (it needs `NEXT_PUBLIC_SITE_URL` set to the live https address in Vercel). Keep the walkthrough under 90 seconds, and record it as a screen capture in case the venue's Wi-Fi fails.

Bonus: turn on "Reduce motion" in OS settings → Lite Mode switches on automatically and says why.

Also worth a look: **/hostels**. It covers every block with photos and warden contacts, the 2026–27 fee tables, how to apply, mess timings, canteens and safety rules. On a phone, the fee table turns into cards.
