# ToolShed Development Plan

This document outlines the remaining features and improvements planned for ToolShed.

## Completed Features

- [x] Learning Postcards (create, view, edit, delete)
- [x] 3-2-1 Reflections (create, view, edit, delete)
- [x] Ten-Minute Takeovers (create, view, edit, delete)
- [x] Theme system with filtering
- [x] Global search across all content types
- [x] Visibility controls (org-wide vs team)
- [x] User authentication with Supabase
- [x] Row-level security policies
- [x] Profile auto-creation on signup
- [x] Responsive UI with card-based layouts
- [x] Interactive flipping postcard component
- [x] Learning models documentation

---

## Priority 1: Core Missing Functionality

### Role-Based Access Control
The database schema includes a `role` field (staff, manager, admin) on profiles, but permissions are not enforced anywhere in the application.

- [ ] Define permission matrix for each role
- [ ] Implement role checking middleware/hooks
- [ ] Add manager-specific views and actions
- [ ] Create admin dashboard access controls
- [ ] Update RLS policies to respect roles

### Team Management Interface
Teams exist in the database but there's no UI to manage them.

- [ ] Create team listing page
- [ ] Add team creation form
- [ ] Build team member management interface
- [ ] Implement team invitation system
- [ ] Add team settings/edit page
- [ ] Create team-specific content views

### Notifications System
No notification system currently exists.

- [ ] Set up email service integration
- [ ] Implement new content notifications
- [ ] Add takeover reminder emails (day before meeting)
- [ ] Create notification preferences page
- [ ] Build in-app notification center

---

## Priority 2: User Value Features

### Analytics Dashboard
Users have no visibility into their learning progress or patterns.

- [ ] Personal learning statistics (count by type, by month)
- [ ] Theme engagement visualization
- [ ] Takeover completion tracking
- [ ] Team-level learning metrics
- [ ] Organization-wide trends (admin view)

### Content Export
No way to export content for sharing or archival.

- [ ] PDF export for individual reflections
- [ ] Bulk export as CSV/Excel
- [ ] Print-friendly views
- [ ] Export by date range or theme

### Favorites and Bookmarks
- [ ] Add favorite/bookmark toggle to all content types
- [ ] Create favorites page to view saved content
- [ ] Quick access from dashboard

### Advanced Search and Filtering
Current search is limited to text and themes.

- [ ] Filter by author
- [ ] Filter by date range
- [ ] Filter by visibility level
- [ ] Sort options (newest, oldest, most bookmarked)
- [ ] Saved searches

---

## Priority 3: Engagement Features

### Comments and Discussion
No way for users to interact with each other's reflections.

- [ ] Add comment thread to each content type
- [ ] Implement reply functionality
- [ ] Add @mentions for colleagues
- [ ] Email notification for new comments
- [ ] Comment moderation for admins

### Learning Paths
No way to group related content into sequences.

- [ ] Create learning path data model
- [ ] Build path creation interface
- [ ] Display paths on dashboard
- [ ] Track progress through paths
- [ ] Recommend paths based on role/team

### Recommendations
- [ ] "Related reflections" based on shared themes
- [ ] "You might like" based on viewing history
- [ ] "Popular in your team" section

---

## Priority 4: Administrative Features

### Admin Dashboard
No centralized admin interface exists.

- [ ] User management (view, edit roles, deactivate)
- [ ] Team management
- [ ] Content moderation queue
- [ ] System-wide analytics
- [ ] Theme management (merge, delete, rename)

### Content Moderation
- [ ] Flag content for review
- [ ] Admin review queue
- [ ] Content approval workflow for org-wide posts
- [ ] Audit log of administrative actions

### Bulk Operations
- [ ] Bulk user import from CSV
- [ ] Bulk content archive/delete
- [ ] Bulk theme assignment

---

## Priority 5: Polish and Quality of Life

### Drafts and Publishing
- [ ] Save content as draft before publishing
- [ ] Draft list on user profile
- [ ] Schedule content for future publication

### Accessibility Improvements
- [ ] Keyboard navigation for all interactive elements
- [ ] Screen reader optimization
- [ ] High contrast mode
- [ ] Reduce motion preference support

### Mobile Experience
- [ ] Optimize forms for mobile input
- [ ] Touch-friendly interactions
- [ ] Progressive Web App (PWA) support

---

## Technical Debt and Improvements

### Performance
- [ ] Add pagination to list views (currently loads all)
- [ ] Implement infinite scroll or load more
- [ ] Optimize image loading if attachments are added
- [ ] Add caching layer for frequently accessed data

### Testing
- [ ] Set up testing framework
- [ ] Write unit tests for utility functions
- [ ] Add integration tests for forms
- [ ] End-to-end tests for critical flows

### Code Quality
- [ ] Add comprehensive TypeScript strict mode
- [ ] Set up linting rules
- [ ] Add pre-commit hooks
- [ ] Document component API with Storybook

---

## Future Considerations

These items are not planned for immediate development but may be valuable later:

- **Gamification**: Badges, points, leaderboards for engagement
- **AI Integration**: Summarize learnings, suggest themes, auto-generate golden nuggets
- **Calendar Integration**: Sync takeovers with Google Calendar/Outlook
- **Slack/Teams Integration**: Post new reflections to channels
- **API Access**: Public API for integrations
- **Multi-tenancy**: Support multiple organizations
- **Offline Mode**: Service worker for offline access
- **Content Templates**: Pre-built reflection templates for common training types
