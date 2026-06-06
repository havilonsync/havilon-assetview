import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_UPLOAD_TTL_SECONDS = 300;
const DEFAULT_DOWNLOAD_TTL_SECONDS = 300;

let cachedClient: S3Client | undefined;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getBucket() {
  return requireEnv("S3_BUCKET");
}

function getRegion() {
  return requireEnv("AWS_REGION");
}

function getClient() {
  if (!cachedClient) {
    cachedClient = new S3Client({ region: getRegion() });
  }
  return cachedClient;
}

function encodeKey(key: string) {
  return key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

export function getS3ObjectUrl(key: string) {
  return `https://${getBucket()}.s3.${getRegion()}.amazonaws.com/${encodeKey(key)}`;
}

export async function createSignedUploadUrl(input: {
  key: string;
  contentType: string;
  contentLength?: number;
  expiresIn?: number;
}) {
  const bucket = getBucket();
  const expiresIn = input.expiresIn ?? DEFAULT_UPLOAD_TTL_SECONDS;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  });

  return {
    uploadUrl: await getSignedUrl(getClient(), command, { expiresIn }),
    fileUrl: getS3ObjectUrl(input.key),
    expiresIn,
  };
}

export function getS3KeyFromFileUrl(fileUrl: string) {
  if (fileUrl.startsWith("s3://")) {
    const [, , ...parts] = fileUrl.split("/");
    return parts.join("/");
  }

  const url = new URL(fileUrl);
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

export async function createSignedDownloadUrl(fileUrl: string, expiresIn = DEFAULT_DOWNLOAD_TTL_SECONDS) {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: getS3KeyFromFileUrl(fileUrl),
  });

  return {
    downloadUrl: await getSignedUrl(getClient(), command, { expiresIn }),
    expiresIn,
  };
}