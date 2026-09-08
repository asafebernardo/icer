import fs from "node:fs";
import path from "node:path";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

let driveClient = null;

function envTrim(name) {
  return String(process.env[name] || "").trim();
}

function normalizePrivateKey(raw) {
  let key = String(raw || "").trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

/**
 * @returns {Record<string, unknown> | null}
 */
export function readDriveCredentials() {
  const b64 = envTrim("ICER_GOOGLE_DRIVE_CREDENTIALS_B64");
  if (b64) {
    try {
      return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    } catch {
      throw new Error("ICER_GOOGLE_DRIVE_CREDENTIALS_B64 inválido");
    }
  }
  const json = envTrim("ICER_GOOGLE_DRIVE_CREDENTIALS_JSON");
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      throw new Error("ICER_GOOGLE_DRIVE_CREDENTIALS_JSON inválido");
    }
  }
  const credentialsPath = envTrim("GOOGLE_APPLICATION_CREDENTIALS");
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    return JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  }
  const email = envTrim("ICER_GOOGLE_DRIVE_CLIENT_EMAIL");
  const privateKey = normalizePrivateKey(process.env.ICER_GOOGLE_DRIVE_PRIVATE_KEY || "");
  if (email && privateKey) {
    return { client_email: email, private_key: privateKey };
  }
  return null;
}

export function getDriveFolderId() {
  return envTrim("ICER_GOOGLE_DRIVE_FOLDER_ID");
}

export function isDriveStorageEnabled() {
  const mode = envTrim("ICER_STORAGE") || envTrim("ICER_FILE_STORAGE");
  return ["drive", "google", "google_drive", "gdrive"].includes(mode.toLowerCase());
}

export function isDriveConfigured() {
  try {
    return Boolean(readDriveCredentials() && getDriveFolderId());
  } catch {
    return false;
  }
}

export function assertDriveConfigured() {
  if (!isDriveStorageEnabled()) return;
  const folderId = getDriveFolderId();
  if (!folderId) {
    throw new Error(
      "ICER_STORAGE=drive exige ICER_GOOGLE_DRIVE_FOLDER_ID (pasta partilhada com a conta de serviço).",
    );
  }
  if (!readDriveCredentials()) {
    throw new Error(
      "ICER_STORAGE=drive exige credenciais Google (JSON, Base64, ficheiro GOOGLE_APPLICATION_CREDENTIALS, ou CLIENT_EMAIL + PRIVATE_KEY).",
    );
  }
}

export function getDrivePublicStatus() {
  return {
    enabled: isDriveStorageEnabled(),
    configured: isDriveConfigured(),
    folder_configured: Boolean(getDriveFolderId()),
  };
}

export function resetDriveClient() {
  driveClient = null;
}

async function getDriveClient() {
  if (driveClient) return driveClient;
  const credentials = readDriveCredentials();
  if (!credentials) {
    throw new Error("google_drive_not_configured");
  }
  const { google } = await import("googleapis");
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [DRIVE_SCOPE],
  });
  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

/**
 * @param {{ filePath: string; name: string; mimeType?: string }} p
 * @returns {Promise<{ id: string }>}
 */
export async function uploadLocalFileToDrive(p) {
  const filePath = path.resolve(p.filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`ficheiro local não encontrado: ${filePath}`);
  }
  const folderId = getDriveFolderId();
  if (!folderId) {
    throw new Error("ICER_GOOGLE_DRIVE_FOLDER_ID em falta");
  }
  const drive = await getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name: String(p.name || path.basename(filePath)).trim() || "icer-file",
      parents: [folderId],
    },
    media: {
      mimeType: p.mimeType || "application/octet-stream",
      body: fs.createReadStream(filePath),
    },
    fields: "id",
    supportsAllDrives: true,
  });
  const id = String(res.data?.id || "").trim();
  if (!id) {
    throw new Error("google_drive_upload_sem_id");
  }
  return { id };
}

/**
 * @param {string} fileId
 * @param {string} destPath
 */
export async function downloadDriveFileToPath(fileId, destPath) {
  const id = String(fileId || "").trim();
  if (!id) throw new Error("drive_file_id em falta");
  const drive = await getDriveClient();
  const destDir = path.dirname(destPath);
  fs.mkdirSync(destDir, { recursive: true });
  const tmpPath = `${destPath}.part`;
  const dest = fs.createWriteStream(tmpPath);
  try {
    const res = await drive.files.get(
      { fileId: id, alt: "media", supportsAllDrives: true },
      { responseType: "stream" },
    );
    await new Promise((resolve, reject) => {
      res.data.on("error", reject);
      dest.on("error", reject);
      dest.on("finish", resolve);
      res.data.pipe(dest);
    });
    fs.renameSync(tmpPath, destPath);
  } catch (err) {
    try {
      dest.destroy();
    } catch {
      /* ignore */
    }
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    throw err;
  }
}

/**
 * @param {string} fileId
 */
export async function deleteDriveFile(fileId) {
  const id = String(fileId || "").trim();
  if (!id) return;
  const drive = await getDriveClient();
  await drive.files.delete({ fileId: id, supportsAllDrives: true });
}
