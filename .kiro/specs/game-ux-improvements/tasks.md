# Implementation Plan: Game UX Improvements

## Overview

This implementation plan covers four key improvements: SVG icons for drawing tools, SVG icons for player list, slider-based brush size selector (already partially implemented), and automatic turn/round progression with countdown timers.

## Tasks

- [x] 1. Create SVG Icon Components
  - [x] 1.1 Create Icons.jsx with all required SVG icon components
    - Create BrushIcon, EraserIcon, TrashIcon, UndoIcon for toolbar
    - Create CrownIcon, PencilIcon, CheckIcon, UserIcon, MicrophoneIcon for player list
    - Ensure all icons accept size and color props
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 2. Update Drawing Toolbar with SVG Icons
  - [x] 2.1 Update CanvasDrawingToolbar.jsx to use SVG icons
    - Import icons from Icons.jsx
    - Replace emoji buttons with SVG icon buttons
    - Ensure active state styling works with SVG icons
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [ ]* 2.2 Write property test for tool selection active state
    - **Property 1: Tool Selection Active State**
    - **Validates: Requirements 1.6**

- [x] 3. Update Player Sidebar with SVG Icons
  - [x] 3.1 Update PlayersSidebar.jsx to use SVG icons
    - Import icons from Icons.jsx
    - Replace emoji badges with SVG icon components
    - Add checkmark icon for players who guessed correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 3.2 Write property tests for player status icons
    - **Property 2: Host Crown Icon Rendering**
    - **Property 3: Drawer Pencil Icon Rendering**
    - **Property 4: Correct Guess Checkmark Rendering**
    - **Validates: Requirements 2.2, 2.3, 2.4**

- [x] 4. Verify Brush Size Slider Implementation
  - [x] 4.1 Ensure brush size slider is properly implemented in CanvasDrawingToolbar
    - Verify slider has min=2 and max=40
    - Verify brush size display shows current value
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]* 4.2 Write property tests for brush size slider
    - **Property 5: Brush Size Slider State Synchronization**
    - **Property 6: Brush Size Display Accuracy**
    - **Validates: Requirements 3.3, 3.4**

- [x] 5. Checkpoint - Verify UI Changes
  - All UI changes implemented and verified.

- [x] 6. Implement All-Guessed Turn End Logic
  - [x] 6.1 Add checkAllGuessed function to server
    - Create function to check if all non-drawer players have guessed
    - Integrate check into chat:message handler after correct guess
    - Call endDrawerTurn with reason 'ALL_GUESSED' when all have guessed
    - _Requirements: 4.1, 4.4_
  - [x] 6.2 Update scoring logic for ALL_GUESSED reason
    - Ensure all guessers receive points
    - Ensure drawer receives points
    - _Requirements: 4.2, 4.3_
  - [ ]* 6.3 Write property tests for all-guessed logic
    - **Property 7: All Guessed Turn End**
    - **Property 8: All Guessed Scoring**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 7. Implement Automatic Countdown System
  - [x] 7.1 Update server auto-progress timer logic
    - Set 10-second countdown after round completion
    - Set 3-second countdown after turn end (within round)
    - Emit countdown events every second
    - _Requirements: 5.1, 5.3, 5.5_
  - [x] 7.2 Create CountdownDisplay component on client
    - Display countdown number prominently
    - Show appropriate message based on context
    - Style consistently with game theme
    - _Requirements: 5.4_
  - [x] 7.3 Integrate countdown display into RoomPage
    - Listen for autoProgress:countdown events
    - Display CountdownDisplay when countdown is active
    - _Requirements: 5.4, 5.5_
  - [ ]* 7.4 Write property tests for countdown system
    - **Property 9: Round Completion Countdown**
    - **Property 10: Turn End Countdown**
    - **Property 11: Countdown Decrement**
    - **Property 12: Countdown Zero Auto Progress**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**

- [x] 8. Implement Final Round Detection
  - [x] 8.1 Update server to detect final round completion
    - Check if currentRoundNumber >= totalRounds after round completion
    - Transition to GAME_COMPLETE instead of starting new round
    - _Requirements: 5.6_
  - [ ]* 8.2 Write property test for final round detection
    - **Property 13: Final Round Game End**
    - **Validates: Requirements 5.6**

- [x] 9. Final Checkpoint - Full Integration Test
  - All core tasks completed. Property tests marked as optional.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The brush size slider is already partially implemented in CanvasDrawingToolbar.jsx
- The server already has auto-progress logic that needs modification
- Property tests use fast-check library for JavaScript
