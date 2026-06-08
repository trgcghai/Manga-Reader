# Sprint 2: Library and Metadata

## Goal

Implement manga CRUD and metadata management for local library content.

## Scope

- Create, update, delete manga entries
- Persist title, alternative titles, author/artist, description, genres, status, and cover path
- Support chapter creation with required local folder path entry
- Let the user select the chapter's language and translator from the manga's configured options
- Scan the selected folder and display the chapter images directly, with no upload step
- Track translator groups and language variants per manga and per chapter
- Validate paths before reading or writing

## Deliverables

- Library management screens or API endpoints
- Metadata storage and retrieval
- Chapter creation form for folder path, language, and translator selection
- Chapter and translation association model
- Tests for metadata parsing and validation

## Exit Criteria

- Manga and chapter metadata can be edited locally
- Multiple translators and languages can be represented per chapter
- Chapter content is created from local folders, not uploads
- No data requires internet or external services
