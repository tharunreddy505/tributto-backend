# How to Find/Reset PostgreSQL Credentials

## 1. Default Username
The default username is almost always:
**`postgres`**

## 2. The Password
There is **no default password**. You created this password when you installed PostgreSQL.
Common passwords people use during setup:
- `password`
- `postgres`
- `admin`
- `root`
- (empty)

## 3. If You Forgot Your Password (Reset Guide)

If you cannot remember the password, you can reset it.

### Step 1: Edit Configuration to Allow Access
1.  Go to your PostgreSQL data folder. Typically:
    `C:\Program Files\PostgreSQL\<VERSION>\data`
2.  Find the file named **`pg_hba.conf`** and open it with Notepad (Run Notepad as Administrator).
3.  Scroll to the bottom. Find lines that look like this:
    ```
    # IPv4 local connections:
    host    all             all             127.0.0.1/32            scram-sha-256
    ```
4.  Change `scram-sha-256` (or `md5`) to **`trust`**.
    ```
    host    all             all             127.0.0.1/32            trust
    ```
5.  Save the file.

### Step 2: Restart PostgreSQL Service
1.  Press `Win + R`, type `services.msc`, and press Enter.
2.  Find **postgresql-x64-1x**.
3.  Right-click and select **Restart**.

### Step 3: Change the Password
1.  Open a Terminal (PowerShell or CMD).
2.  Run:
    ```bash
    psql -U postgres
    ```
    (It should log you in without asking for a password).
3.  Run this SQL command to set a NEW password (replace `newpassword` with your desired password):
    ```sql
    ALTER USER postgres WITH PASSWORD 'newpassword';
    ```
4.  Type `\q` to exit.

### Step 4: Secure the Database Again
1.  Go back to `pg_hba.conf`.
2.  Change `trust` back to **`scram-sha-256`**.
3.  Save the file.
4.  Restart the PostgreSQL service again (Step 2).

## 4. Updates for Your Project
Once you have the new password:
1.  Open `.env` in your project.
2.  Update `DB_PASSWORD=your_new_password`.
3.  Run `npm run db:setup`.
