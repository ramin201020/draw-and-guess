# Requirements Document

## Introduction

This feature improves the Draw and Guess game experience with enhanced toolbar icons, a slider-based brush size selector, automatic round progression when all players guess correctly, and automatic countdown between rounds instead of requiring host intervention.

## Glossary

- **Drawing_Toolbar**: The UI component that provides drawing tools, color selection, and brush size controls to the drawer
- **Players_Sidebar**: The UI component that displays the list of players, their scores, and status indicators
- **Brush_Size_Slider**: A range input control that allows continuous selection of brush sizes
- **Round**: A complete cycle where all players have had a turn as the drawer
- **Turn**: A single player's opportunity to draw while others guess
- **Auto_Progress_System**: The server-side mechanism that automatically advances the game between turns and rounds
- **Countdown_Timer**: A visual countdown displayed to all players before the next turn/round begins

## Requirements

### Requirement 1: Professional Drawing Tool Icons

**User Story:** As a drawer, I want professional-looking icons for the drawing tools, so that the interface feels polished and intuitive.

#### Acceptance Criteria

1. THE Drawing_Toolbar SHALL display SVG-based icons for the brush tool instead of emoji
2. THE Drawing_Toolbar SHALL display SVG-based icons for the eraser tool instead of emoji
3. THE Drawing_Toolbar SHALL display SVG-based icons for the clear canvas action instead of emoji
4. THE Drawing_Toolbar SHALL display SVG-based icons for the undo action instead of emoji
5. WHEN a tool icon is hovered, THE Drawing_Toolbar SHALL display a subtle highlight effect
6. WHEN a tool is selected, THE Drawing_Toolbar SHALL display a distinct active state for that icon

### Requirement 2: Professional Player List Icons

**User Story:** As a player, I want professional-looking player icons in the player list, so that the interface looks polished and consistent.

#### Acceptance Criteria

1. THE Players_Sidebar SHALL display SVG-based player avatar icons instead of emoji
2. THE Players_Sidebar SHALL display SVG-based crown icon for the host player instead of emoji
3. THE Players_Sidebar SHALL display SVG-based pencil icon for the current drawer instead of emoji
4. THE Players_Sidebar SHALL display SVG-based checkmark icon for players who guessed correctly instead of emoji
5. WHEN displaying player status indicators, THE Players_Sidebar SHALL use consistent icon styling

### Requirement 3: Slider-Based Brush Size Selector

**User Story:** As a drawer, I want to select brush sizes using a slider, so that I can quickly and precisely choose any size within the available range.

#### Acceptance Criteria

1. THE Drawing_Toolbar SHALL display a range slider for brush size selection
2. THE Brush_Size_Slider SHALL allow selection of sizes from 2px to 40px
3. WHEN the slider value changes, THE Drawing_Toolbar SHALL update the brush size in real-time
4. THE Drawing_Toolbar SHALL display the current brush size value next to the slider
5. THE Brush_Size_Slider SHALL be styled consistently with the application theme

### Requirement 4: Automatic Turn End When All Guessers Succeed

**User Story:** As a player, I want the turn to end automatically when everyone has guessed correctly, so that we don't waste time waiting for the timer.

#### Acceptance Criteria

1. WHEN all non-drawer players have guessed the word correctly, THE Auto_Progress_System SHALL end the current turn immediately
2. WHEN the turn ends due to all correct guesses, THE Auto_Progress_System SHALL award points to all players who guessed correctly
3. WHEN the turn ends due to all correct guesses, THE Auto_Progress_System SHALL award points to the drawer
4. THE Auto_Progress_System SHALL emit a turn end event with reason "ALL_GUESSED" when all players guess correctly

### Requirement 5: Automatic Round Progression with Countdown

**User Story:** As a player, I want the game to automatically progress to the next round after a countdown, so that the game flows smoothly without requiring host action.

#### Acceptance Criteria

1. WHEN a round completes (all players have drawn), THE Auto_Progress_System SHALL display a 10-second countdown
2. WHEN the countdown reaches zero, THE Auto_Progress_System SHALL automatically start the next round
3. WHEN a turn ends, THE Auto_Progress_System SHALL display a 3-second countdown before the next turn
4. THE Countdown_Timer SHALL be visible to all players in the room
5. THE Countdown_Timer SHALL update every second during the countdown
6. IF the game has completed all rounds, THEN THE Auto_Progress_System SHALL display final results instead of starting a new round
