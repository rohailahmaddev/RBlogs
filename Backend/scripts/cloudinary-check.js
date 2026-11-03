// Run:  node scripts/cloudinary-check.js
// Tells you WHERE the 403 comes from by trying three things, smallest first.
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

// Show which Cloudinary-related variable NAMES exist in .env (values are not printed)
const found = Object.keys(process.env).filter((k) => /cloud/i.test(k));
console.log("variables found in .env:", found.length ? found.join(", ") : "none");

// If CLOUDINARY_URL is set the SDK configures itself; otherwise use the 3 variables.
// Several common names are tried. If yours is different, add it to the lists below.
const pick = (...names) => names.map((n) => process.env[n]).find(Boolean);

if (!process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: pick("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_NAME", "CLOUD_NAME", "CLOUDNAME"),
    api_key: pick("CLOUDINARY_API_KEY", "CLOUD_API_KEY", "API_KEY"),
    api_secret: pick("CLOUDINARY_API_SECRET", "CLOUD_API_SECRET", "API_SECRET"),
    secure: true,
  });
}

const cfg = cloudinary.config();
if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
  console.error(
    "\nMissing:",
    ["cloud_name", "api_key", "api_secret"].filter((k) => !cfg[k]).join(", "),
    "\nOpen your .env, find the real variable name, and add it to the pick(...) lists above."
  );
  process.exit(1);
}

console.log("cloud_name:", cfg.cloud_name, "| api_key ends with:", String(cfg.api_key).slice(-4));

// 1x1 PNG
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const show = (label, error) =>
  console.error(`✗ ${label}:`, JSON.stringify({ http_code: error?.http_code, message: error?.message, name: error?.name }));

// 1. Admin API (this is what your ping used)
try {
  await cloudinary.api.ping();
  console.log("✓ 1. ping OK (cloud name, key and secret are valid)");
} catch (error) {
  show("1. ping", error);
}

// 2. Upload API, simple call (no streams, no buffers)
try {
  const r = await cloudinary.uploader.upload(`data:image/png;base64,${PNG_BASE64}`, {
    folder: "diagnostics",
    resource_type: "image",
  });
  console.log("✓ 2. uploader.upload OK:", r.secure_url);
} catch (error) {
  show("2. uploader.upload", error);
}

// 3. Upload API with a stream (what your uploadOnCloudinary does)
await new Promise((resolve) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder: "diagnostics", resource_type: "auto" },
    (error, result) => {
      if (error) show("3. upload_stream", error);
      else console.log("✓ 3. upload_stream OK:", result.secure_url);
      resolve();
    }
  );
  stream.end(Buffer.from(PNG_BASE64, "base64"));
});

// 4. The same upload done by hand, so we can read Cloudinary's real answer.
{
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { folder: "diagnostics", timestamp },
    cfg.api_secret
  );

  const form = new FormData();
  form.append("file", `data:image/png;base64,${PNG_BASE64}`);
  form.append("api_key", cfg.api_key);
  form.append("timestamp", String(timestamp));
  form.append("folder", "diagnostics");
  form.append("signature", signature);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloud_name}/image/upload`, {
      method: "POST",
      body: form,
    });
    const body = await res.text();

    console.log(`\n4. manual upload -> HTTP ${res.status}`);
    for (const [key, value] of res.headers) {
      if (/^(x-cld|server|content-type|cf-ray)/i.test(key)) console.log(`   ${key}: ${value}`);
    }
    console.log("   body:", body.slice(0, 400));
  } catch (error) {
    console.error("✗ 4. manual upload could not reach Cloudinary:", error.cause?.code ?? error.message);
  }
}