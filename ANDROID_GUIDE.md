# Guida alla creazione dell'APK Android

Poiché questa è un'applicazione **Full-Stack** (Frontend React + Backend Node.js/SQLite), per creare un'app Android funzionante è necessario seguire un'architettura specifica.

L'APK conterrà **solo il Frontend**. Il Backend deve essere ospitato su un server pubblico (es. il link "Shared App URL" che vedi in alto, o un deploy su Render/Heroku/AWS).

## Prerequisiti (sul tuo PC locale)

1.  **Node.js** installato.
2.  **Android Studio** installato (con Android SDK).
3.  Questo progetto scaricato in locale.

## Passaggi

1.  **Configura l'URL del Backend**:
    Crea un file `.env.local` nella root del progetto e aggiungi l'URL del tuo backend deployato:
    ```env
    VITE_API_URL=https://tua-app-deployata.com
    ```
    *Nota: Se usi l'ambiente di preview attuale, usa l'URL "Shared App URL".*

2.  **Costruisci il Frontend**:
    Esegui il comando per generare i file statici:
    ```bash
    npm run build
    ```
    Questo creerà la cartella `dist/`.

3.  **Inizializza Android**:
    ```bash
    npx cap add android
    ```

4.  **Sincronizza**:
    Copia i file di build nel progetto Android:
    ```bash
    npx cap sync
    ```

5.  **Apri Android Studio e Genera APK**:
    ```bash
    npx cap open android
    ```
    *   In Android Studio, attendi l'indicizzazione.
    *   Vai su **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
    *   Il file `.apk` verrà generato nella cartella `android/app/build/outputs/apk/debug/`.

## Note Importanti

*   **Database**: L'app Android non avrà un database locale. Si connetterà al database del server remoto.
*   **File**: I file caricati finiranno sul server remoto, non sul telefono.
*   **Permessi**: Se necessario, aggiungi i permessi (es. Camera, File) in `android/app/src/main/AndroidManifest.xml`.
