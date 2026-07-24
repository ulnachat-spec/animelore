/**
 * B站 WBI 签名（最小实现，参考 bilibili-API-collect misc/sign/wbi）。
 */

import { createHash } from "node:crypto";
import { getBilibiliRequestHeaders } from "@/lib/data-sources/bilibili-session";

const WBI_NAV = "https://api.bilibili.com/x/web-interface/nav";
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 22, 37, 57, 38, 19,
  12, 33, 49, 54, 48, 6, 42, 25, 39, 40, 34, 20, 51, 36, 1, 16, 52, 9, 41, 29, 55, 17, 61, 26,
  14, 30, 44, 7, 24, 56, 59, 13, 5, 60, 11, 28, 62, 63, 21, 4, 0
];

const WBI_TTL_MS = 20 * 60 * 1000;

interface WbiKeys {
  imgKey: string;
  subKey: string;
  at: number;
}

let wbiCache: WbiKeys | null = null;

function md5Hex(s: string): string {
  return createHash("md5").update(s).digest("hex");
}

function extractKeyFromWbiUrl(url: string): string {
  const filename = url.slice(url.lastIndexOf("/") + 1);
  return filename.replace(/\.(png|jpg|jpeg|webp)$/i, "");
}

function getMixinKey(imgKey: string, subKey: string): string {
  const s = imgKey + subKey;
  return MIXIN_KEY_ENC_TAB.map((i) => s[i])
    .join("")
    .slice(0, 32);
}

/** 对查询参数追加 wts、w_rid */
export function signWbiParams(
  params: Record<string, string | number>,
  imgKey: string,
  subKey: string
): Record<string, string | number> {
  const mixinKey = getMixinKey(imgKey, subKey);
  const signed: Record<string, string | number> = { ...params, wts: Math.round(Date.now() / 1000) };
  const chrFilter = /[!'()*]/g;

  const query = Object.keys(signed)
    .sort()
    .map((key) => {
      const val = String(signed[key] ?? "").replace(chrFilter, "");
      return `${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
    })
    .join("&");

  return { ...signed, w_rid: md5Hex(`${query}${mixinKey}`) };
}

async function fetchWbiKeys(): Promise<{ imgKey: string; subKey: string } | null> {
  const resp = await fetch(WBI_NAV, {
    headers: await getBilibiliRequestHeaders(),
    cache: "no-store"
  });
  const raw = await resp.text();
  if (!resp.ok) return null;

  let data: {
    code?: number;
    data?: { wbi_img?: { img_url?: string; sub_url?: string } };
  };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    return null;
  }

  const imgUrl = data.data?.wbi_img?.img_url;
  const subUrl = data.data?.wbi_img?.sub_url;
  if (!imgUrl || !subUrl) return null;

  // 未登录时 nav 常返回 code=-101，但仍附带 wbi_img，可用于签名
  return {
    imgKey: extractKeyFromWbiUrl(imgUrl),
    subKey: extractKeyFromWbiUrl(subUrl)
  };
}

export async function getBilibiliWbiKeys(): Promise<{ imgKey: string; subKey: string } | null> {
  const now = Date.now();
  if (wbiCache && now - wbiCache.at < WBI_TTL_MS) {
    return { imgKey: wbiCache.imgKey, subKey: wbiCache.subKey };
  }

  const keys = await fetchWbiKeys();
  if (!keys) return null;

  wbiCache = { ...keys, at: now };
  return keys;
}

export function buildWbiSearchUrl(
  basePath: string,
  params: Record<string, string | number>,
  imgKey: string,
  subKey: string
): string {
  const signed = signWbiParams(params, imgKey, subKey);
  const qs = Object.entries(signed)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `${basePath}?${qs}`;
}
