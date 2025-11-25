# Excalidraw Whiteboard Feature - File Summary

## Files Added

1. **src/services/whiteboardService.ts**
   - Firestore schema types and interfaces
   - Helper functions: `getWhiteboardDocRef`, `loadWhiteboard`, `saveWhiteboard`
   - Defines the `whiteboards` Firestore collection structure

2. **src/pages/whiteboard/WhiteboardPage.tsx**
   - Main whiteboard page component
   - Excalidraw canvas integration
   - Autosave logic with 1-second debouncing
   - Load/save scene data from Firestore

## Files Modified

1. **src/routes/router.tsx**
   - Added import for `WhiteboardPage`
   - Added route: `/whiteboard` → `<WhiteboardPage />`
   - Added route: `/notes/:id/whiteboard` → `<WhiteboardPage />`

2. **src/layout/Sidebar.tsx**
   - Added import for `DrawIcon` (DrawRounded)
   - Added "Whiteboard" navigation item to `workspaceItems` array

3. **src/pages/notes/NotesPage.tsx**
   - Removed unused `sendMessage` import (build fix)

## Firestore Schema

**Collection:** `whiteboards`

**Document ID Format:**
- General whiteboard: `{userId}_default`
- Note-specific: `{userId}_{noteId}`

**Document Structure:**
```typescript
{
  userId: string;
  noteId?: string | null;
  title?: string;
  sceneVersion: number;
  scene: {
    elements: any[];
    appState: Record<string, any>;
    files: Record<string, any>;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Key Implementation Locations

### Firestore Schema Definition
- File: `src/services/whiteboardService.ts`
- Lines: 9-30

### Autosave Logic
- File: `src/pages/whiteboard/WhiteboardPage.tsx`
- Lines: 52-69
- Debounce: 1000ms (1 second)

### Load Scene Logic
- File: `src/pages/whiteboard/WhiteboardPage.tsx`
- Lines: 25-50

## Navigation

The whiteboard is accessible via:
1. **Left sidebar** → Click "Whiteboard" item
2. **Direct URL** → Navigate to `/whiteboard`
3. **Future: Note-specific** → `/notes/{noteId}/whiteboard`

## Dependencies

- `@excalidraw/excalidraw` - React wrapper for Excalidraw canvas
- Uses existing Firebase/Firestore setup
- Uses existing authentication from `AuthProvider`
