import { serve } from "bun"
import { join } from "path"

function startServer(port) {
  try {
    const server = serve({
      port,
      async fetch(req) {
        const url = new URL(req.url)
        const pathname = url.pathname

        const filePath = join(process.cwd(), pathname)

        try {
          const file = Bun.file(filePath)
          if (await file.exists()) {
            return new Response(file)
          }
        } catch {}

        return new Response(Bun.file("index.html"))
      }
    })

    console.log(`Server running at http://localhost:${server.port}`)
  } catch (err) {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${port} in use, trying ${port + 1}...`)
      startServer(port + 1)
    } else {
      throw err
    }
  }
}

startServer(3000)

