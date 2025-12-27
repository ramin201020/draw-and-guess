# Implementation Plan: Responsive Chat Layout

## Overview

This implementation transforms the current mobile-only chat layout into a responsive system that provides optimal space allocation across all devices. The approach replaces the current hidden desktop chat with a 50/50 split layout and improves the mobile experience with a 70/30 split, while adding a unified bottom toolbar for drawing tools.

## Tasks

- [ ] 1. Create responsive layout CSS foundation
  - Replace current `.room-layout-no-sidebar` with new responsive grid system
  - Implement CSS Grid for desktop 50/50 split (canvas/chat)
  - Implement CSS Grid for mobile 70/30 split (canvas/chat)
  - Add media query breakpoint at 768px
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ]* 1.1 Write property test for layout proportions
  - **Property 1: Desktop Layout Proportions**
  - **Property 2: Mobile Layout Proportions**
  - **Validates: Requirements 1.1, 1.2, 2.1, 2.2**

- [ ] 2. Update RoomPage component structure
  - Modify JSX structure to work with new responsive grid
  - Remove mobile-specific conditional rendering
  - Ensure chat is always visible across all screen sizes
  - Update className usage for new layout system
  - _Requirements: 3.1, 1.3_

- [ ]* 2.1 Write property test for chat visibility
  - **Property 3: Chat Interface Visibility**
  - **Validates: Requirements 1.3, 3.1**

- [ ] 3. Implement unified bottom toolbar
  - Create new DrawingToolbar component with all drawing tools
  - Move color picker, brush size, and tool selection to bottom toolbar
  - Ensure toolbar is fixed at bottom on both desktop and mobile
  - Make toolbar responsive (80px desktop, 60px mobile)
  - _Requirements: 1.4, 2.4_

- [ ]* 3.1 Write property test for drawing functionality
  - **Property 7: Drawing Functionality Consistency**
  - **Validates: Requirements 1.4, 2.4, 5.1**

- [ ] 4. Update DrawingCanvas component
  - Remove existing toolbar integration from canvas component
  - Adjust canvas dimensions to account for bottom toolbar
  - Ensure touch events work properly in new mobile layout
  - Maintain drawing state during layout transitions
  - _Requirements: 4.2, 5.5_

- [ ]* 4.1 Write property test for state preservation
  - **Property 5: State Preservation During Transitions**
  - **Validates: Requirements 4.2, 4.3, 5.5**

- [ ] 5. Enhance ChatBox component for responsive layout
  - Remove mobile-specific styling that conflicts with new layout
  - Ensure chat scrolling works in both desktop and mobile layouts
  - Implement auto-scroll to latest message functionality
  - Optimize chat input for both layouts
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [ ]* 5.1 Write property test for chat functionality
  - **Property 6: Chat Functionality Consistency**
  - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 5.2**

- [ ] 6. Implement smooth layout transitions
  - Add CSS transitions for layout changes at breakpoint
  - Implement debounced resize handler to prevent flickering
  - Ensure transitions complete within 300ms
  - Handle orientation changes on mobile devices
  - _Requirements: 4.1, 4.4, 4.5, 2.5_

- [ ]* 6.1 Write property test for layout responsiveness
  - **Property 4: Layout Responsiveness**
  - **Property 8: Resize Event Debouncing**
  - **Property 9: Orientation Change Adaptation**
  - **Validates: Requirements 4.1, 4.4, 4.5, 2.5**

- [ ] 7. Update PlayersSidebar for new layout
  - Adjust sidebar styling for desktop 50% chat area
  - Optimize player list for mobile 30% chat area
  - Ensure player information remains readable in both layouts
  - Maintain consistent styling across layouts
  - _Requirements: 5.3, 5.4_

- [ ]* 7.1 Write property test for visual consistency
  - **Property 10: Visual Consistency**
  - **Validates: Requirements 5.3, 5.4**

- [ ] 8. Remove obsolete mobile-specific CSS
  - Clean up old `.mobile-bottom-panel` styles
  - Remove conflicting mobile-only layout rules
  - Update canvas edge-to-edge styles for new layout
  - Ensure no CSS conflicts between old and new systems
  - _Requirements: 5.4_

- [ ] 9. Add responsive breakpoint handling
  - Implement JavaScript resize listener for layout detection
  - Add fallback detection using window.matchMedia()
  - Handle edge cases around 768px breakpoint
  - Ensure consistent behavior across different browsers
  - _Requirements: 4.1_

- [ ]* 9.1 Write unit tests for breakpoint detection
  - Test breakpoint transitions at 767px → 768px
  - Test fallback detection mechanisms
  - Test browser compatibility edge cases
  - _Requirements: 4.1_

- [ ] 10. Checkpoint - Test responsive layout functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Performance optimization
  - Implement ResizeObserver for efficient layout updates
  - Add CSS containment for better rendering performance
  - Optimize toolbar rendering for smooth interactions
  - Ensure 60fps during layout transitions
  - _Requirements: 4.4, 4.5_

- [ ]* 11.1 Write performance tests
  - Test layout transition timing
  - Test resize event handling performance
  - Test rendering performance under stress
  - _Requirements: 4.4, 4.5_

- [ ] 12. Final integration and cleanup
  - Verify all components work together in new layout
  - Test drawing functionality with new toolbar
  - Verify chat functionality in both layouts
  - Clean up any remaining console warnings or errors
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 13. Final checkpoint - Complete system test
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation maintains backward compatibility while adding new responsive features