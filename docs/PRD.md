# Chore-App PRD

Splitwise, but for chores: rotating room checklists, roommate verification, and a fair-share balance for shared houses.

## Stories

### Story 1 — Create household and invite roommates (Release 1)
As the admin, I create a household and invite roommates by link.
- [ ] Invitee joins from the link and sees the household.

### Story 2 — Set up rooms and checklists (Release 1)
As the admin, I set up each room with its weekly, monthly, and seasonal checklists.
- [ ] All 7 spaces load from seed data.
- [ ] Points calculate from item count.

### Story 3 — See my auto-rotated chores (Release 2)
As a roommate, I see my chores for this week, auto-rotated.
- [ ] Weekly chores follow the 4-week rotation grid.
- [ ] Monthly chores shift one person each month.
- [ ] Seasonal leads rotate each season.

### Story 4 — Complete a chore (Release 2)
As a roommate, I complete a chore by ticking every checklist item and adding a photo.
- [ ] Can't submit until all items are ticked.
- [ ] Photo is optional per chore, as set by the admin.

### Story 5 — Verify a roommate's chore (Release 3)
As a roommate, I approve or send back someone else's chore.
- [ ] Can't verify your own chore.
- [ ] Send-back requires a note.
- [ ] A second send-back flags the chore for a roommate meeting.
- [ ] Points post only on approval.

### Story 6 — Household balance (Release 3)
As a roommate, I see the household balance.
- [ ] Shows points earned vs. assigned per person.
- [ ] "Behind" means unfinished assigned work.
- [ ] Anyone behind gets one extra chore next week.

### Story 7 — Reminders (Release 4)
As a roommate, I get reminders.
- [ ] Notification on the day a chore is due.
- [ ] Notification when a chore goes overdue.

### Story 8 — Chore swaps (Release 4)
As a roommate, I offer a chore swap and another roommate accepts.
- [ ] Both roommates see the new assignment.
- [ ] Points go to whoever completes the chore.
