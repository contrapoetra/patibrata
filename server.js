import { serve } from "bun";
import { join } from "path";
import os from "os";

function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }

  return "localhost";
}

function startServer(port) {
  try {
    const server = serve({
      port,
      hostname: "0.0.0.0",

      async fetch(req) {
        const url = new URL(req.url);
        const pathname = url.pathname;
        const method = req.method;
        const clientIP =
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "local";

        const time = new Date().toLocaleTimeString();

        const filePath = join(process.cwd(), pathname);
        const file = Bun.file(filePath);

        let status = 200;

        if (await file.exists()) {
          console.log(`[${time}] ${clientIP} ${method} ${pathname} → 200`);
          return new Response(file);
        }

        // SPA fallback
        console.log(`[${time}] ${clientIP} ${method} ${pathname} → 200 (SPA)`);
        return new Response(Bun.file("index.html"));
      },
    });

    const ip = getLocalIP();

    console.log("");
    console.log("  SPA Boilerplate Dev Server");
    console.log("");
    console.log(`  Local:   http://localhost:${server.port}`);
    console.log(`  Network: http://${ip}:${server.port}`);
    console.log("");
  } catch (err) {
    if (err.code === "EADDRINUSE") {
      startServer(port + 1);
    } else {
      throw err;
    }
  }
}

startServer(3000);
