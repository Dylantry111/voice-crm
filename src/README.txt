How to use this package

1. Copy the src/ files into your Vite project's src/ folder.
2. Keep your existing src/lib/supabase.js file.
3. If your contacts table does not have email or tags columns, either:
   - add them in Supabase, or
   - remove those fields from contactsService.js and App.jsx.

Included in this modular version:
- Split pages/components/services/lib structure
- Working contact list/detail flow
- Delete customer
- Change status
- Manage tags (DB update is attempted, but still works locally if tags column is missing)
- Capture -> create contact -> create booking
- Booking calendar shared between Capture and Calendar pages
- Settings page for Status / Tag / Event Type options (local UI state)
