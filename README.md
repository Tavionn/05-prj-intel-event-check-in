# Intel Sustainability Summit: Event Check-in App

The app uses Supabase so check-ins are shared between the local page and the
GitHub Pages site. Attendance updates refresh automatically every five seconds.

If Supabase is not configured, the app runs in local mode instead. Check-ins
are saved in the current browser only and are not shared across browsers or
devices.

## Set up shared attendance

1. Create a project at [supabase.com](https://supabase.com/).
2. In the Supabase dashboard, open **SQL Editor**, create a query, paste in the
   contents of [`supabase-schema.sql`](./supabase-schema.sql), and run it. This
   creates the attendee table and the database function used for check-ins.
3. In the project settings, copy the **Project URL** and the **publishable key**
   (or the legacy `anon` key).
4. Replace the two example values in [`supabase-config.js`](./supabase-config.js)
   with the Project URL and publishable key.
5. Commit and push the updated configuration file. GitHub Pages will then use
   the same Supabase project as the local app.

The publishable/`anon` key is intended to be used in a public website. Never put
the Supabase `service_role` key in this app or commit it to the repository.
Attendee names are visible to visitors because the app displays a shared
attendee list.

Check-ins saved in a browser before Supabase is configured are not automatically
copied into the shared database. After setup, enter those attendees once in the
app to add them to shared attendance.
