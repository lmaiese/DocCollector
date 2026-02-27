# DocCollector+

DocCollector+ is a simple, productive document collection and archiving system for professional firms. It allows firms to request documents from clients, and clients to upload them securely.

## Architecture

- **Backend**: Node.js with Express
- **Database**: SQLite (`better-sqlite3`) for simplicity and portability.
- **Frontend**: React 19 with Tailwind CSS.
- **Storage**: Local file system (extensible to SharePoint/Google Drive).

## Features

- **Multi-tenant**: Supports multiple firms (tenants) in a single instance.
- **Role-Based Access**:
  - **Operators (Admins)**: Manage clients, create requests, view all docs.
  - **Clients**: View only their requests, upload documents.
- **Smart Uploads**: Automatically renames files to `CLIENT_YYYYMM_TYPE.ext` and organizes them in folders.
- **Audit Log**: Tracks all key actions.

## Project Structure

```
/
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Route pages (Dashboard, Login, etc.)
│   ├── services/     # Backend services (Storage)
│   ├── db.ts         # Database initialization and schema
│   ├── types.ts      # Shared TypeScript interfaces
│   ├── App.tsx       # Main React App
│   └── main.tsx      # Entry point
├── server.ts         # Express backend server
├── doccollector.db   # SQLite database (created on start)
└── uploads/          # Document storage (created on start)
```

## Deployment Checklist

To deploy this application to production:

1.  **Build the Frontend**:
    ```bash
    npm run build
    ```
    This compiles the React app into the `dist/` folder.

2.  **Environment Variables**:
    Ensure the following are set in your production environment:
    - `NODE_ENV=production`
    - `PORT=3000` (or your desired port)

3.  **Start the Server**:
    ```bash
    npm start
    ```
    This runs `node server.ts`, which serves the API and the static frontend files.

4.  **Data Persistence**:
    - Ensure the `doccollector.db` file and `uploads/` directory are in a persistent volume if using containers (Docker).
    - **Backup Strategy**: Regularly backup `doccollector.db` and the `uploads/` folder.

5.  **Security**:
    - Put the application behind a reverse proxy (Nginx, Caddy) with SSL/TLS.
    - Replace the mock Auth in `server.ts` with real OAuth (Google/Microsoft) using libraries like `passport` or `simple-oauth2`.

## Development

- `npm run dev`: Starts the backend and frontend in development mode with hot reloading (via `tsx` and Vite middleware).
