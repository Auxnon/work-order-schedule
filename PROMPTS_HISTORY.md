# Prompts History

This document tracks the conversation and feature requests that shaped this work order scheduler application.

## Initial Requirements (Original Prompt)

There is a timescale drop down button in the top left. Immediately below that is our main work order component. The scheduler component takes up the bulk of it spanning full 100% width and height. The customer overlay is stretched over from the left side and spans 380px and lists current clients. Add 6 random client samples. You can hover on scheduler which creates an effect thats spans the 100% scheduler width that lines up with whatever client row the mouse is within. The effect is color rgba(238, 240, 255, 1);. An additional hover effect shows the X position of the mouse on that clickable area. This effect is:
- width: 113px
- height: 38px
- border: 1px solid rgba(195, 199, 255, 1)
- border-radius: 8px
- background-color: rgba(101, 112, 255, 0.1)

Clicking creates a new task. It cannot overlap with existing tasks for that client. Tasks show the client name and have a status tag on the far right followed by a menu button that's only visible on hover of the task. Clicking the menu button gives an Edit and Delete option. Edit opens the Work Order Details side bar on the right.

The Work Order Details side bar is a modal, it's background overlay is rgba(247, 249, 252, 0.5); and cancels the menu on click. The the side bar itself is 100% page height. Cancel and Create buttons are at the top right. below that the angular form is:
- label: Work Order Name, input: name
- label: Status, input: enum dropdown (Open, In Progress, Complete, Blocked)
- label: End Date, input: date formatted MM.DD.YYYY
- label: Start Date, input: date formatted MM.DD.YYYY

## Iteration 1: Fixed Interaction Pane

**Prompt:** Transfer the mouse move logic on to a new pane that exactly aligns with the bottom of the header row on the scheduler. The scheduler underneath can scroll but the pane is fixed. The hover effects are bound by this pane as well as they directly correspond to the mouse movement. Clicking will have to calculate the scheduler based position relative to this new click pane instead. Avoid magic adjustments inline the angular html and prefer calculating this within ts file or scss instead.

**Implementation:**
- Created `.interaction-pane` layer positioned at 52px from top (header height)
- Pane stays fixed while scroll container scrolls underneath
- All mouse events bound to this fixed pane
- Removed magic number adjustments from HTML
- Added TypeScript constants: `HEADER_HEIGHT`, `ROW_HEIGHT`, `MIN_TASK_WIDTH_RATIO`
- Created position calculation methods in TS

## Iteration 2: Work Center Renaming & Auto-Task Creation

**Prompt:** Great! Rename everywhere the customer-overlay to work-center-overlay. Clicking should automatically create a task starting from where the mouse-hover-effect starts to being exactly 3.5 months in length. The task should take the work center name the click aligns with as the default and not open the edit menu. It will default to In Progress status. Please show an error if a task overlaps with another on the same work center.

**Implementation:**
- Renamed `customer-overlay` to `work-center-overlay` everywhere
- Changed `Client` interface to `WorkCenter`, `clientId` to `workCenterId`
- Clicking scheduler now auto-creates tasks starting from mouse position
- Tasks are exactly 3.5 months in duration (uses actual month lengths)
- Task name defaults to work center name
- Default status is "In Progress"
- No edit menu opened on creation
- Overlap detection shows error message (auto-dismisses after 5 seconds)

## Iteration 3: Non-Blocking Interactions & Status Colors

**Prompt:** Interaction pane interferes with scroll, keep it in place for effects but make it pointer-events: none and move mouse interaction back to scroll area. We want tasks to be visible on top of the row highlight effect so let's make a new panel above the interaction pane that spans the container. We will need to adjust mouse x y for drawing our effect elements relative to the old interaction pane.

The current month (or hour etc) should have a tab underneath it that reads "Current month" and of styling:
- width: 93px
- height: 18px
- color: rgba(62, 64, 219, 1)
- font-family: CircularStd-Book
- font-size: 14px
- font-weight: 400
- font-style: book

Timescale button has label that reads Timescale with background rgba(241, 243, 248, 0.75); and text color rgba(104, 113, 150, 1); merged with dropdown button on it's right. The dropdown menu is custom styling and would appear as:
- width: 200px
- box-shadow: 0 0 0 1px rgba(104, 113, 150, 0.1), 0 2.5px 3px -1.5px rgba(200, 207, 233, 1), 0 4.5px 5px -1px rgba(216, 220, 235, 1)
- border-radius: 5px
- background-color: rgba(255, 255, 255, 1)

Tasks should be colored based on their status:
- **"In Progress"**: tag background rgba(214, 216, 255, 1), color rgba(62, 64, 219, 1); task background rgba(237, 238, 255, 1), box-shadow 0 0 0 1px rgba(222, 224, 255, 1)
- **"Blocked"**: tag background rgba(252, 238, 181, 1), color rgba(177, 54, 0, 1); task background rgba(237, 238, 255, 1), box-shadow 0 0 0 1px rgba(255, 245, 207, 1)
- **"Completed"**: tag background rgba(225, 255, 204, 1), color rgba(8, 162, 104, 1); task background rgba(248, 255, 243, 1), box-shadow 0 0 0 1px rgba(209, 250, 179, 1)

**Implementation:**
- Interaction pane now `pointer-events: none` with mouse handlers moved to scroll-container
- Created tasks-panel (z-index: 8) above interaction pane for proper layering
- Added "Current month/hour/day/week" label below current period header
- Styled timescale button with label and merged dropdown
- Status-based task coloring implemented for all three statuses
- Mouse coordinates adjusted relative to scroll container

## Iteration 4: Enhanced Functionality & Refinements (Current)

**Prompt:** Please document my prompts in this PR into a file PROMPTS_HISTORY.md in project root

Please reuse the delete edit menu for the timescale dropdown.

Properly scale the tasks relative to the timescale rather then simply clamp. If a task ends in the middle of the month it should end in the middle of the column. Make day the new default timescale.

The overlap error message is perfect but make absolute so it doesn't adjust the dom elements below it.

The mouse hover effect shouldn't be visible while over the task elements, and shouldn't be able to trigger a task creation click while hovering over task elements either. Same goes for work center overlay. The row effect can still remain on hover over any.

Allow up to +2 or -2 the timescale unit behind the oldest or newest tasks. behind for the scheduler. Start scrolled to the current day/month/week by default. Remove the hour timescale.

Changing the timescales from month to day shows tasks offset to the wrong day and month. Please fix.

**Implementation:** (In progress)
- Document all prompts in PROMPTS_HISTORY.md
- Reuse task menu styling for timescale dropdown
- Properly scale tasks relative to timescale (no clamping to minimum)
- Make "Day" the default timescale
- Make error message absolute positioned
- Hide mouse hover effect over tasks and work center overlay
- Prevent task creation clicks over tasks and work center overlay
- Dynamic column range based on task dates (±2 units)
- Auto-scroll to current period on load
- Remove Hour timescale option
- Fix task positioning calculation for accurate date alignment across timescales
