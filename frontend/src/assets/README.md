# Assets Directory

This folder contains static assets that are imported directly into React components.

## Structure

```
assets/
├── images/        # Images (PNG, JPG, WEBP, etc.)
└── icons/         # Icon files (SVG, PNG)
```

## Usage

### Importing Images

```typescript
import logo from '@/assets/images/logo.png';
import banner from '@/assets/images/banner.jpg';

function MyComponent() {
  return <img src={logo} alt="Logo" />;
}
```

### Importing Icons

```typescript
import iconSvg from '@/assets/icons/icon.svg';

function MyComponent() {
  return <img src={iconSvg} alt="Icon" />;
}
```

## Benefits of Using src/assets/

✅ **Vite processing** - Images are optimized and hashed automatically  
✅ **Type safety** - TypeScript knows about imported assets  
✅ **Build optimization** - Unused assets are tree-shaken  
✅ **Cache busting** - Filenames include content hash  

## vs. public/ Folder

Use `src/assets/` when:
- Images are imported in components
- You want Vite to optimize them
- You need TypeScript support

Use `public/` when:
- Files need exact filenames (e.g., `robots.txt`, `favicon.ico`)
- Files are referenced in HTML directly
- Files should not be processed by Vite
