# Bug Capture Tool - TODO

## Database Schema
- [x] Create bug reports table with fields for console logs, network data, screenshot URL, metadata
- [x] Create projects table for organizing bug reports by project/app

## Backend API
- [x] Create API endpoint to receive bug reports (screenshot, console logs, network data)
- [x] Create API endpoint to list all bug reports
- [x] Create API endpoint to get single bug report details
- [x] Create API endpoint to delete bug reports
- [x] Create API endpoint to manage projects

## Client SDK (Embeddable Script)
- [x] Create console log capture functionality (intercept console methods)
- [x] Create network traffic capture (intercept fetch and XMLHttpRequest)
- [x] Create screenshot capture using html2canvas
- [x] Create HAR format generator from captured network data
- [x] Create floating capture button widget
- [x] Create capture submission form with user description
- [x] Bundle SDK as standalone script for embedding

## Admin Dashboard
- [x] Create dashboard layout with stats overview
- [x] Create bug reports list page with filtering and search
- [x] Create bug report detail view with screenshot, console logs, network viewer
- [x] Create console log viewer with filtering by log level
- [x] Create projects management page
- [x] Create SDK integration instructions page

## Testing
- [x] Write vitest tests for API endpoints
- [ ] Write integration tests for bug report submission flow
