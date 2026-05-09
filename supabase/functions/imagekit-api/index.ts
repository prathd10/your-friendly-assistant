/// <reference lib="deno.ns" />
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
};

async function hmacSha1(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  console.log(`[ImageKit Edge Function] Received ${req.method} request`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const privateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY");
    if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is missing from Supabase Secrets");

    // Secure Delete (POST)
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const fileId = body.fileId;
      if (!fileId) throw new Error("fileId is required in request body");

      const credentials = btoa(`${privateKey}:`);
      const deleteRes = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Basic ${credentials}` },
      });

      if (!deleteRes.ok && deleteRes.status !== 404) {
        const text = await deleteRes.text();
        throw new Error(`ImageKit delete failed: ${deleteRes.status} ${text}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate Auth Parameters for Upload (GET)
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 2700; // 45 minutes from now (ImageKit requires < 1 hour)
    const signature = await hmacSha1(`${token}${expire}`, privateKey);

    return new Response(JSON.stringify({ token, expire, signature }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("ImageKit Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
