# Database Migration Guide

Your application has been updated to use a PostgreSQL database for dynamic data storage. This ensures your data persists properly and allows for more robust features.

## Prerequisites

1.  **Install PostgreSQL**: If you haven't already, download and install PostgreSQL for Windows: https://www.postgresql.org/download/windows/
2.  **pgAdmin**: Use pgAdmin (installed with PostgreSQL) to manage your database.

## Step 1: Install & Configure

1.  **Install PostgreSQL**: https://www.postgresql.org/download/windows/
2.  **Open .env file**: Update `DB_PASSWORD` with your PostgreSQL password.

## Step 2: Initialize Database

1.  Run the setup script:
    ```bash
    npm run db:setup
    ```
    This will automatically create the `tributto` database and all necessary tables.

## Step 3: Run the Application

1.  Stop the currently running server (Ctrl+C in terminal).
2.  Run `npm run dev`.
    - This will now start BOTH the backend server (port 5000) and the frontend (port 5173).
3.  Open the app in your browser.
    - **Automatic Migration**: The first time you load the page, the app will detect if the database is empty. If it finds your old data in the browser cache, it will automatically upload it to the new database. Check the browser console (F12) for "Migration Complete" logs.

## Troubleshooting

-   **Connection Refused**: Ensure PostgreSQL service is running and credentials in `.env` are correct.
-   **Data Not Showing**: Check the browser console logs.
