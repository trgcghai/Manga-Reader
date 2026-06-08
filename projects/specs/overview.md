
# Local Manga Reader Web Application

## 1. Overview
A **local-only web application** to manage and read manga stored on your own machine.  
The application runs entirely offline and reads manga directly from local file paths.  
No cloud services, no external APIs.

---

## 2. Goals
- Read manga from local folders
- Manage a personal manga library
- Support multiple translators per chapter
- Support multiple languages per chapter
- Simple, fast, and offline-first

---

## 3. Core Features

### 3.1 Manga Management
- Create new manga
- Update manga information
- Delete manga

**Manga metadata**
- Title
- Alternative titles
- Author / Artist
- Description
- Genres
- Status (Ongoing / Completed)
- Cover image (local path)

---

### 3.2 Chapter Management
- Each manga contains multiple chapters
- Create, update, delete chapters
- Chapter creation uses a required local folder path to the image directory for that chapter
- The user selects the chapter's language and translator from the manga's configured options
- On submit, the app scans the folder and displays the images directly

**Chapter metadata**
- Chapter number
- Title
- Release date
- Notes

---

### 3.3 Translator Grouping
- A single chapter can have multiple translations
- Each translation belongs to one translator group
- Translator options are managed per manga and reused when adding chapters

**Translator**
- Name
- Website or notes (optional)

**Example**


Chapter 10

* ABC Team
* XYZ Scan



---

### 3.4 Language Grouping
- Each translation has an associated language
- Languages are configurable
- A chapter may exist in multiple languages
- Language options are managed per manga and reused when adding chapters

**Example**


Chapter 10

* EN (ABC Team)
* EN (XYZ Scan)
* JP (Raw)



---

## 4. Recommended File System Structure

```
manga-library/
├─ One Piece/
│  ├─ cover.jpg
│  ├─ metadata.json
│  └─ chapters/
│     └─ chapter-001/
│        ├─ en/
│        │  └─ abc-team/
│        │     ├─ 001.jpg
│        │     └─ 002.jpg
│        └─ vi/
│           └─ xyz-team/
│              ├─ 001.jpg
│              └─ 002.jpg
```


---

## 5. Logical Data Model

### Manga

```
id
title
description
coverPath
status
```


### Chapter

```
id
mangaId
number
title
```


### Translation

```
id
chapterId
language
translatorId
folderPath
```


### Translator

```
id
name
note
```


---

## 6. Reader Features
- Page-by-page reading
- Continuous scrolling mode
- Keyboard navigation
- Remember last read page (local storage)
- Switch language and translator on the fly

---

## 7. Technical Constraints
- Runs locally only
- Reads directly from the file system
- No image upload is required; chapter content comes from local folders
- No authentication
- No internet dependency

---

## 8. Optional Enhancements
- Search manga and chapters
- Reading history
- Favorites
- Auto-detect new chapters from folders
- Dark / light theme

---

## 9. Non-Goals
- No online syncing
- No user accounts
- No DRM or encryption

---

## 10. Summary
This project is a **personal offline manga reader and manager** focused on:
- Clean organization
- Multi-language support
- Multiple translator versions
- Full control over local files
